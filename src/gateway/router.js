class Router {
  constructor(pool, strategy = "auto") {
    this.pool = pool;
    this.strategy = strategy;
  }

  async route(request) {
    const strategy = request.model === "validate"
      ? "validate"
      : (request.model === "auto" ? this.strategy : "specific");

    switch (strategy) {
      case "validate":
        return this.validateRoute(request);
      case "round-robin":
        return this.roundRobinRoute(request);
      case "speed-first":
        return this.speedFirstRoute(request);
      case "quality-first":
        return this.qualityFirstRoute(request);
      case "specific":
        return this.specificRoute(request);
      case "auto":
      default:
        return this.autoRoute(request);
    }
  }

  // Auto: try providers in priority order, fallback on failure
  async autoRoute(request) {
    const providers = this.pool.getHealthyProviders();
    let attempts = 0;

    for (const provider of providers) {
      attempts++;
      try {
        console.log(`[Router] Trying ${provider.name}...`);
        const result = await provider.complete(request);
        
        // Mark success
        this.pool.recordSuccess(provider.name);
        
        return {
          data: result,
          provider: provider.name,
          model: provider.currentModel,
          attempts,
          stream: request.stream || false,
        };
      } catch (err) {
        console.log(`[Router] ${provider.name} failed: ${err.message}`);
        this.pool.recordFailure(provider.name, err);
        
        // If rate limited, mark with cooldown
        if (err.status === 429) {
          this.pool.markRateLimited(provider.name, err.retryAfter);
        }
        continue;
      }
    }

    throw {
      status: 503,
      message: `All ${attempts} providers exhausted. Try again in a few minutes.`,
    };
  }

  // Round-robin: distribute evenly
  async roundRobinRoute(request) {
    const provider = this.pool.getNextRoundRobin();
    try {
      const result = await provider.complete(request);
      this.pool.recordSuccess(provider.name);
      return {
        data: result,
        provider: provider.name,
        model: provider.currentModel,
        attempts: 1,
        stream: request.stream || false,
      };
    } catch (err) {
      this.pool.recordFailure(provider.name, err);
      // Fallback to auto routing
      return this.autoRoute(request);
    }
  }

  // Speed-first: pick fastest responding provider
  async speedFirstRoute(request) {
    const providers = this.pool.getBySpeed();
    return this.autoRoute({ ...request, _providers: providers });
  }

  // Quality-first: pick highest quality model
  async qualityFirstRoute(request) {
    const providers = this.pool.getByQuality();
    return this.autoRoute({ ...request, _providers: providers });
  }

  // Specific model requested
  async specificRoute(request) {
    const provider = this.pool.findProviderForModel(request.model);
    if (!provider) {
      // Fall back to auto
      return this.autoRoute(request);
    }
    try {
      const result = await provider.complete(request);
      return {
        data: result,
        provider: provider.name,
        model: request.model,
        attempts: 1,
        stream: request.stream || false,
      };
    } catch (err) {
      return this.autoRoute(request);
    }
  }

  // Validate: send to multiple models, compare, return best
  async validateRoute(request) {
    const providers = this.pool.getHealthyProviders().slice(0, 3);
    const results = await Promise.allSettled(
      providers.map((p) => p.complete({ ...request, stream: false }))
    );

    const successful = results
      .map((r, i) => ({
        status: r.status,
        data: r.status === "fulfilled" ? r.value : null,
        provider: providers[i].name,
        model: providers[i].currentModel,
      }))
      .filter((r) => r.status === "fulfilled");

    if (successful.length === 0) {
      throw { status: 503, message: "No providers available for validation" };
    }

    // Score and pick best
    const scored = successful.map((r) => ({
      ...r,
      score: this.scoreResponse(r.data),
    }));
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    return {
      data: {
        ...best.data,
        _validation: {
          models_compared: scored.length,
          scores: scored.map((s) => ({
            provider: s.provider,
            model: s.model,
            score: s.score,
          })),
          consensus: this.checkConsensus(scored),
          confidence: best.score / 100,
        },
      },
      provider: best.provider,
      model: best.model,
      attempts: providers.length,
      stream: false,
    };
  }

  scoreResponse(response) {
    let score = 50; // Base score
    const content = response?.choices?.[0]?.message?.content || "";

    // Length bonus (longer usually means more complete)
    if (content.length > 100) score += 10;
    if (content.length > 500) score += 10;

    // Code block present
    if (content.includes("```")) score += 15;

    // Has explanation
    if (content.includes("//") || content.includes("/*")) score += 5;

    // Error handling present
    if (content.includes("try") || content.includes("catch") || content.includes("error"))
      score += 5;

    // Type annotations (TypeScript)
    if (content.includes(": string") || content.includes(": number") || content.includes("<T>"))
      score += 5;

    return Math.min(score, 100);
  }

  checkConsensus(scored) {
    if (scored.length < 2) return true;
    // Check if approaches are similar (simplified)
    const contents = scored.map(
      (s) => s.data?.choices?.[0]?.message?.content || ""
    );
    // Basic similarity: do they use similar function names/patterns?
    const keywords = contents.map((c) =>
      c.match(/function\s+\w+|const\s+\w+|class\s+\w+/g) || []
    );
    const overlap = keywords[0].filter((k) =>
      keywords.slice(1).some((kw) => kw.includes(k))
    );
    return overlap.length > 0;
  }
}

module.exports = { Router };

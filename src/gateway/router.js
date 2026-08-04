const VALIDATE_TIMEOUT_MS = 8_000;

class Router {
  constructor(pool, strategy = "auto") {
    this.pool = pool;
    this.strategy = strategy;
  }

  async route(request) {
    const modelAliases = { validate: "validate", auto: "auto", "quality-first": "quality-first" };
    const strategy = modelAliases[request.model] ?? (request.model === "auto" ? this.strategy : "specific");

    switch (strategy) {
      case "validate":      return this.validateRoute(request);
      case "round-robin":   return this.roundRobinRoute(request);
      case "speed-first":   return this.speedFirstRoute(request);
      case "quality-first": return this.qualityFirstRoute(request);
      case "specific":      return this.specificRoute(request);
      case "auto":
      default:              return this.autoRoute(request);
    }
  }

  // Sequential fallback through providers in priority order
  async autoRoute(request) {
    const providers = request._providers || this.pool.getHealthyProviders();
    let attempts = 0;

    for (const provider of providers) {
      attempts++;
      try {
        console.log(`[Router] Trying ${provider.name}...`);
        const t = Date.now();
        const result = await provider.complete(request);
        this.pool.recordSuccess(provider.name, Date.now() - t);
        return { data: result, provider: provider.name, model: provider.currentModel, attempts, stream: request.stream || false };
      } catch (err) {
        console.log(`[Router] ${provider.name} failed: ${err.message}`);
        this.pool.recordFailure(provider.name, err);
        if (err.status === 429) this.pool.markRateLimited(provider.name, err.retryAfter);
        continue;
      }
    }

    throw { status: 503, message: `All ${attempts} providers exhausted. Try again in a few minutes.` };
  }

  async roundRobinRoute(request) {
    const provider = this.pool.getNextRoundRobin();
    try {
      const t = Date.now();
      const result = await provider.complete(request);
      this.pool.recordSuccess(provider.name, Date.now() - t);
      return { data: result, provider: provider.name, model: provider.currentModel, attempts: 1, stream: request.stream || false };
    } catch (err) {
      this.pool.recordFailure(provider.name, err);
      return this.autoRoute(request);
    }
  }

  // True parallel race — return whichever provider responds first
  async speedFirstRoute(request) {
    const providers = this.pool.getBySpeed();
    if (providers.length === 0) throw { status: 503, message: "No healthy providers available" };

    return new Promise((resolve, reject) => {
      let settled = false;
      let pending = providers.length;

      for (const provider of providers) {
        const t = Date.now();
        provider.complete(request).then((result) => {
          if (settled) return;
          settled = true;
          this.pool.recordSuccess(provider.name, Date.now() - t);
          resolve({ data: result, provider: provider.name, model: provider.currentModel, attempts: 1, stream: request.stream || false });
        }).catch((err) => {
          this.pool.recordFailure(provider.name, err);
          if (err.status === 429) this.pool.markRateLimited(provider.name, err.retryAfter);
          if (--pending === 0 && !settled) {
            settled = true;
            reject({ status: 503, message: "All providers failed in speed-first race" });
          }
        });
      }
    });
  }

  async qualityFirstRoute(request) {
    const ranked = this.pool.getByQuality();
    const summary = this.pool.getQualitySummary();

    // Log the quality ranking so the operator can see what's driving the decision
    const top = summary.slice(0, 5).map((p) =>
      p.proven ? `${p.name}(${p.pass_rate}%)` : `${p.name}(no data)`
    ).join(" > ");
    console.log(`[Router] quality-first ranking: ${top}`);

    return this.autoRoute({ ...request, _providers: ranked });
  }

  async specificRoute(request) {
    const provider = this.pool.findProviderForModel(request.model);
    if (!provider) return this.autoRoute(request);
    try {
      const t = Date.now();
      const result = await provider.complete(request);
      this.pool.recordSuccess(provider.name, Date.now() - t);
      return { data: result, provider: provider.name, model: request.model, attempts: 1, stream: request.stream || false };
    } catch (err) {
      this.pool.recordFailure(provider.name, err);
      return this.autoRoute(request);
    }
  }

  // Send to up to 3 models in parallel, each with a timeout; return the best
  async validateRoute(request) {
    const providers = this.pool.getHealthyProviders().slice(0, 3);
    if (providers.length === 0) throw { status: 503, message: "No providers available for validation" };

    const withTimeout = (p) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("provider timeout")),
          VALIDATE_TIMEOUT_MS
        );
        p.then(
          (v) => { clearTimeout(timer); resolve(v); },
          (e) => { clearTimeout(timer); reject(e); }
        );
      });

    const results = await Promise.allSettled(
      providers.map((p) => {
        const t = Date.now();
        return withTimeout(p.complete({ ...request, stream: false })).then((data) => {
          this.pool.recordSuccess(p.name, Date.now() - t);
          return { data, provider: p.name, model: p.currentModel };
        });
      })
    );

    const successful = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);

    if (successful.length === 0) throw { status: 503, message: "No providers responded in time for validation" };

    const scored = successful
      .map((r) => ({ ...r, score: this.scoreResponse(r.data) }))
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    return {
      data: {
        ...best.data,
        _validation: {
          models_compared: scored.length,
          scores: scored.map((s) => ({ provider: s.provider, model: s.model, score: s.score })),
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
    let score = 50;
    const content = response?.choices?.[0]?.message?.content || "";
    if (content.length > 100) score += 10;
    if (content.length > 500) score += 10;
    if (content.includes("```")) score += 15;
    if (content.includes("//") || content.includes("/*")) score += 5;
    if (content.includes("try") || content.includes("catch") || content.includes("error")) score += 5;
    if (content.includes(": string") || content.includes(": number") || content.includes("<T>")) score += 5;
    return Math.min(score, 100);
  }

  checkConsensus(scored) {
    if (scored.length < 2) return true;
    const contents = scored.map((s) => s.data?.choices?.[0]?.message?.content || "");
    const keywords = contents.map((c) => c.match(/function\s+\w+|const\s+\w+|class\s+\w+/g) || []);
    const overlap = keywords[0].filter((k) => keywords.slice(1).some((kw) => kw.includes(k)));
    return overlap.length > 0;
  }
}

module.exports = { Router };

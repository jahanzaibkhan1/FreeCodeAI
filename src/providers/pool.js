const { OpenAIProvider } = require("./openai-compatible");
const qualityStore = require("../executor/quality-store");

const MIN_EXECUTIONS = 5; // need at least this many code runs before trusting pass_rate

class ProviderPool {
  constructor(providersConfig) {
    this.providers = new Map();
    this.health = new Map();
    this.roundRobinIndex = 0;

    for (const [name, config] of Object.entries(providersConfig)) {
      if (!config.enabled) continue;

      this.providers.set(name, new OpenAIProvider(name, config));
      this.health.set(name, {
        healthy: true,
        rateLimited: false,
        rateLimitedUntil: null,
        successCount: 0,
        failureCount: 0,
        avgResponseTime: 0,
        lastUsed: null,
      });
    }
  }

  activeCount() {
    return [...this.providers.values()].filter((p) => {
      const h = this.health.get(p.name);
      return h && h.healthy && !this.isRateLimited(p.name);
    }).length;
  }

  getHealthyProviders() {
    return [...this.providers.entries()]
      .filter(([name]) => {
        const h = this.health.get(name);
        return h.healthy && !this.isRateLimited(name);
      })
      .sort(([, a], [, b]) => a.config.priority - b.config.priority)
      .map(([, provider]) => provider);
  }

  getBySpeed() {
    return [...this.providers.entries()]
      .filter(([name]) => {
        const h = this.health.get(name);
        return h.healthy && !this.isRateLimited(name);
      })
      .sort(([nameA], [nameB]) => {
        const a = this.health.get(nameA);
        const b = this.health.get(nameB);
        // Untried providers (0) go last, not first
        const aTime = a.avgResponseTime || Infinity;
        const bTime = b.avgResponseTime || Infinity;
        return aTime - bTime;
      })
      .map(([, provider]) => provider);
  }

  getByQuality() {
    const qData = qualityStore.getAll();

    // Static fallback order used when a provider has no execution data yet
    const staticOrder = [
      "gemini", "mistral", "deepseek", "groq", "cerebras",
      "openrouter", "cohere", "sambanova", "nvidia",
      "huggingface", "github", "cloudflare",
    ];

    return [...this.providers.entries()]
      .filter(([name]) => {
        const h = this.health.get(name);
        return h.healthy && !this.isRateLimited(name);
      })
      .sort(([nameA], [nameB]) => {
        const qa = qData[nameA];
        const qb = qData[nameB];
        const aProven = qa && qa.executions >= MIN_EXECUTIONS;
        const bProven = qb && qb.executions >= MIN_EXECUTIONS;

        // Both proven by execution data → higher pass_rate wins
        if (aProven && bProven) return (qb.pass_rate || 0) - (qa.pass_rate || 0);

        // One proven, one not → proven goes first
        if (aProven) return -1;
        if (bProven) return 1;

        // Neither proven → fall back to static priority list
        const ai = staticOrder.indexOf(nameA);
        const bi = staticOrder.indexOf(nameB);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
      .map(([, provider]) => provider);
  }

  // Returns quality ranking metadata — used for router logging
  getQualitySummary() {
    const qData = qualityStore.getAll();
    return [...this.providers.keys()].map((name) => {
      const q = qData[name];
      const proven = q && q.executions >= MIN_EXECUTIONS;
      return {
        name,
        pass_rate: proven ? q.pass_rate : null,
        executions: q ? q.executions : 0,
        proven,
      };
    }).sort((a, b) => {
      if (a.proven && b.proven) return (b.pass_rate || 0) - (a.pass_rate || 0);
      if (a.proven) return -1;
      if (b.proven) return 1;
      return 0;
    });
  }

  getNextRoundRobin() {
    const healthy = this.getHealthyProviders();
    if (healthy.length === 0) throw new Error("No healthy providers available");
    const provider = healthy[this.roundRobinIndex % healthy.length];
    this.roundRobinIndex++;
    return provider;
  }

  findProviderForModel(modelName) {
    for (const [, provider] of this.providers) {
      if (provider.config.models.some((m) => m.includes(modelName) || modelName.includes(m))) {
        return provider;
      }
    }
    return null;
  }

  isRateLimited(name) {
    const h = this.health.get(name);
    if (!h || !h.rateLimited) return false;
    if (h.rateLimitedUntil && Date.now() > h.rateLimitedUntil) {
      h.rateLimited = false;
      h.rateLimitedUntil = null;
      return false;
    }
    return true;
  }

  // responseTimeMs is measured by the caller (router) around the full request
  recordSuccess(name, responseTimeMs = 0) {
    const h = this.health.get(name);
    if (!h) return;
    h.successCount++;
    h.healthy = true;
    h.failureCount = 0;  // reset so sustained future failures can blacklist again
    h.lastUsed = Date.now();
    if (responseTimeMs > 0) {
      // Exponential moving average (α=0.2) so recent times matter more
      h.avgResponseTime = h.avgResponseTime === 0
        ? responseTimeMs
        : h.avgResponseTime * 0.8 + responseTimeMs * 0.2;
    }
  }

  recordFailure(name, error) {
    const h = this.health.get(name);
    if (!h) return;
    h.failureCount++;
    if (h.failureCount > 5) h.healthy = false;
  }

  markRateLimited(name, retryAfterSeconds = 60) {
    const h = this.health.get(name);
    if (!h) return;
    h.rateLimited = true;
    h.rateLimitedUntil = Date.now() + retryAfterSeconds * 1000;
    console.log(`[Pool] ${name} rate-limited for ${retryAfterSeconds}s`);
  }

  getStatus() {
    const status = {};
    for (const [name] of this.providers) {
      const h = this.health.get(name);
      status[name] = {
        healthy: h.healthy,
        rateLimited: this.isRateLimited(name),
        requests: h.successCount + h.failureCount,
        successRate: h.successCount / Math.max(h.successCount + h.failureCount, 1),
        avgResponseTime: Math.round(h.avgResponseTime),
      };
    }
    return status;
  }

  listModels() {
    const models = [];
    for (const [name, provider] of this.providers) {
      for (const model of provider.config.models) {
        models.push({
          id: `${name}/${model}`,
          object: "model",
          owned_by: name,
          permission: [],
        });
      }
    }
    models.unshift(
      { id: "auto", object: "model", owned_by: "freecodeai" },
      { id: "validate", object: "model", owned_by: "freecodeai" },
      { id: "quality-first", object: "model", owned_by: "freecodeai" }
    );
    return models;
  }
}

module.exports = { ProviderPool };

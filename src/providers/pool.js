const { OpenAIProvider } = require("./openai-compatible");

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
      .filter(([name]) => !this.isRateLimited(name))
      .sort(([nameA], [nameB]) => {
        const a = this.health.get(nameA);
        const b = this.health.get(nameB);
        return (a.avgResponseTime || Infinity) - (b.avgResponseTime || Infinity);
      })
      .map(([, provider]) => provider);
  }

  getByQuality() {
    const qualityOrder = [
      "gemini", "mistral", "deepseek", "groq", "cerebras",
      "openrouter", "cohere", "sambanova", "nvidia",
      "huggingface", "github", "cloudflare",
    ];
    return [...this.providers.entries()]
      .filter(([name]) => !this.isRateLimited(name))
      .sort(([a], [b]) => {
        const ai = qualityOrder.indexOf(a);
        const bi = qualityOrder.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
      .map(([, provider]) => provider);
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

  recordSuccess(name) {
    const h = this.health.get(name);
    if (!h) return;
    h.successCount++;
    h.healthy = true;
    h.lastUsed = Date.now();
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
    // Add meta-models
    models.unshift(
      { id: "auto", object: "model", owned_by: "freecodeai" },
      { id: "validate", object: "model", owned_by: "freecodeai" }
    );
    return models;
  }
}

module.exports = { ProviderPool };

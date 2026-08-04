const fs = require("fs");
const path = require("path");

// Load .env before reading process.env — Node doesn't do this automatically
function loadDotEnv() {
  const envFile = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envFile)) return;
  try {
    fs.readFileSync(envFile, "utf-8").split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const eq = trimmed.indexOf("=");
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = value;
    });
  } catch { /* ignore unreadable .env */ }
}
loadDotEnv();

const DEFAULT_CONFIG = {
  port: parseInt(process.env.PORT) || 3377,
  dashboard_port: parseInt(process.env.DASHBOARD_PORT) || 3378,
  strategy: process.env.STRATEGY || "auto",
  validation_models: 3,
  fallback_timeout: 5000,
  providers: {
    gemini: {
      enabled: true,
      api_key: process.env.GEMINI_API_KEY || "",
      base_url: "https://generativelanguage.googleapis.com/v1beta/openai",
      models: ["gemini-2.0-flash"],
      priority: 1,
      rate_limit: { rpm: 15, rpd: 1500, tpm: 1000000 },
    },
    groq: {
      enabled: true,
      api_key: process.env.GROQ_API_KEY || "",
      base_url: "https://api.groq.com/openai/v1",
      models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
      priority: 2,
      rate_limit: { rpm: 30, rpd: 1000, tpm: 6000 },
    },
    cerebras: {
      enabled: true,
      api_key: process.env.CEREBRAS_API_KEY || "",
      base_url: "https://api.cerebras.ai/v1",
      models: ["llama-3.3-70b"],
      priority: 3,
      rate_limit: { rpm: 30, rpd: 1000, tpd: 1000000 },
    },
    openrouter: {
      enabled: true,
      api_key: process.env.OPENROUTER_API_KEY || "",
      base_url: "https://openrouter.ai/api/v1",
      models: ["qwen/qwen3-coder:free", "qwen/qwen3-235b-a22b:free", "meta-llama/llama-3.3-70b:free"],
      priority: 4,
      rate_limit: { rpm: 20 },
    },
    mistral: {
      enabled: true,
      api_key: process.env.MISTRAL_API_KEY || "",
      base_url: "https://api.mistral.ai/v1",
      models: ["mistral-small-latest"],
      priority: 5,
      rate_limit: { rpm: 30, tpm: 50000 },
    },
    github: {
      enabled: true,
      api_key: process.env.GITHUB_TOKEN || "",
      base_url: "https://models.inference.ai.azure.com",
      models: ["meta-llama-3.1-8b-instruct"],
      priority: 6,
      rate_limit: { rpm: 15 },
    },
    nvidia: {
      enabled: true,
      api_key: process.env.NVIDIA_API_KEY || "",
      base_url: "https://integrate.api.nvidia.com/v1",
      models: ["meta/llama-3.1-405b-instruct"],
      priority: 7,
      rate_limit: { rpm: 10 },
    },
    cloudflare: {
      enabled: true,
      api_key: process.env.CLOUDFLARE_API_KEY || "",
      account_id: process.env.CLOUDFLARE_ACCOUNT_ID || "",
      base_url: "https://api.cloudflare.com/client/v4/accounts",
      models: ["@cf/meta/llama-3.2-3b-instruct"],
      priority: 8,
      rate_limit: { neurons_per_day: 10000 },
    },
    cohere: {
      enabled: true,
      api_key: process.env.COHERE_API_KEY || "",
      base_url: "https://api.cohere.com/compatibility/v1",
      models: ["command-r-plus"],
      priority: 9,
      rate_limit: { rpd: 100 },
    },
    sambanova: {
      enabled: true,
      api_key: process.env.SAMBANOVA_API_KEY || "",
      base_url: "https://api.sambanova.ai/v1",
      models: ["Meta-Llama-3.1-405B-Instruct"],
      priority: 10,
      rate_limit: { rpm: 20, tpd: 200000 },
    },
    huggingface: {
      enabled: true,
      api_key: process.env.HF_API_KEY || "",
      base_url: "https://api-inference.huggingface.co/v1",
      models: ["meta-llama/Llama-3.3-70B-Instruct"],
      priority: 11,
      rate_limit: { rpd: 2000 },
    },
    deepseek: {
      enabled: true,
      api_key: process.env.DEEPSEEK_API_KEY || "",
      base_url: "https://api.deepseek.com/v1",
      models: ["deepseek-chat"],
      priority: 12,
      rate_limit: { rpm: 30 },
    },
    chutes: {
      enabled: true,
      api_key: process.env.CHUTES_API_KEY || "",
      base_url: "https://llm.chutes.ai/v1",
      models: ["deepseek-ai/DeepSeek-R1"],
      priority: 13,
      rate_limit: { rpm: 20 },
    },
    qwen: {
      enabled: true,
      api_key: process.env.QWEN_API_KEY || "",
      base_url: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      models: ["qwen-plus"],
      priority: 14,
      rate_limit: { tpm: 1000000 },
    },
    ovhcloud: {
      enabled: true,
      api_key: process.env.OVHCLOUD_API_KEY || "",
      base_url: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1",
      models: ["Qwen3-32B"],
      priority: 15,
      rate_limit: { rpm: 2 },
      anonymous: true,  // free tier works without an API key
    },
  },
};

function loadConfig() {
  const configPath = path.join(process.cwd(), "freecodeai.config.yml");
  
  if (fs.existsSync(configPath)) {
    try {
      // Simple YAML-like parser for basic config
      const raw = fs.readFileSync(configPath, "utf-8");
      const parsed = parseSimpleYaml(raw);
      return deepMerge(DEFAULT_CONFIG, parsed);
    } catch (err) {
      console.warn("[Config] Failed to parse config file, using defaults:", err.message);
    }
  }

  // Deep-copy providers so we don't mutate the shared DEFAULT_CONFIG object
  const config = {
    ...DEFAULT_CONFIG,
    providers: Object.fromEntries(
      Object.entries(DEFAULT_CONFIG.providers).map(([name, p]) => [name, { ...p }])
    ),
  };
  for (const provider of Object.values(config.providers)) {
    if (!provider.api_key && !provider.anonymous) provider.enabled = false;
  }

  return config;
}

function parseSimpleYaml(text) {
  // Minimal YAML parser for flat config values
  const result = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      result[key] = isNaN(value) ? value : Number(value);
    }
  }
  return result;
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

module.exports = { loadConfig, DEFAULT_CONFIG };

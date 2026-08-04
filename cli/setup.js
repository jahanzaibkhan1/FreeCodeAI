const readline = require("readline");
const fs = require("fs");
const path = require("path");

const PROVIDERS = [
  {
    name: "gemini",
    display: "Google Gemini",
    url: "https://aistudio.google.com/apikey",
    env: "GEMINI_API_KEY",
    desc: "1M tokens/min, 1.5K requests/day — most generous free tier",
  },
  {
    name: "groq",
    display: "Groq",
    url: "https://console.groq.com/keys",
    env: "GROQ_API_KEY",
    desc: "Ultra-fast inference, 1K requests/day",
  },
  {
    name: "cerebras",
    display: "Cerebras",
    url: "https://cloud.cerebras.ai/",
    env: "CEREBRAS_API_KEY",
    desc: "1M tokens/day, very fast",
  },
  {
    name: "openrouter",
    display: "OpenRouter",
    url: "https://openrouter.ai/settings/keys",
    env: "OPENROUTER_API_KEY",
    desc: "100+ free models via one key",
  },
  {
    name: "mistral",
    display: "Mistral AI",
    url: "https://console.mistral.ai/api-keys",
    env: "MISTRAL_API_KEY",
    desc: "~1B tokens/month free, EU-based",
  },
  {
    name: "github",
    display: "GitHub Models",
    url: "https://github.com/settings/tokens",
    env: "GITHUB_TOKEN",
    desc: "Free with GitHub account",
  },
  {
    name: "nvidia",
    display: "NVIDIA NIM",
    url: "https://build.nvidia.com/",
    env: "NVIDIA_API_KEY",
    desc: "91 free model endpoints",
  },
  {
    name: "cohere",
    display: "Cohere",
    url: "https://dashboard.cohere.com/api-keys",
    env: "COHERE_API_KEY",
    desc: "~100 requests/day, great for RAG",
  },
  {
    name: "sambanova",
    display: "SambaNova",
    url: "https://cloud.sambanova.ai/",
    env: "SAMBANOVA_API_KEY",
    desc: "200K tokens/day + $5 free credits",
  },
  {
    name: "huggingface",
    display: "HuggingFace",
    url: "https://huggingface.co/settings/tokens",
    env: "HF_API_KEY",
    desc: "2K requests/day, many models",
  },
  {
    name: "deepseek",
    display: "DeepSeek",
    url: "https://platform.deepseek.com/api_keys",
    env: "DEEPSEEK_API_KEY",
    desc: "10M tokens free trial",
  },
];

async function run() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

  console.log(`
  ╔══════════════════════════════════════════════╗
  ║         FreeCodeAI Setup Wizard              ║
  ║                                              ║
  ║  Let's get your free API keys configured.    ║
  ║  Each provider takes ~30 seconds to sign up. ║
  ╚══════════════════════════════════════════════╝
  `);

  const keys = {};
  let configured = 0;

  for (const provider of PROVIDERS) {
    console.log(`\n  📌 ${provider.display}`);
    console.log(`     ${provider.desc}`);
    console.log(`     Get your key: ${provider.url}`);

    const key = await ask(`     Paste API key (or press Enter to skip): `);

    if (key.trim()) {
      keys[provider.env] = key.trim();
      configured++;
      console.log(`     ✅ ${provider.display} configured!`);
    } else {
      console.log(`     ⏭️  Skipped (you can add it later)`);
    }
  }

  // Merge with existing .env so previously configured keys are not lost
  const envPath = path.join(process.cwd(), ".env");
  const existing = {};
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
      const eq = line.indexOf("=");
      if (eq > 0) existing[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    });
  }
  const merged = { ...existing, ...keys };
  const envContent = Object.entries(merged).map(([k, v]) => `${k}=${v}`).join("\n");
  fs.writeFileSync(envPath, envContent + "\n");

  console.log(`
  ╔══════════════════════════════════════════════╗
  ║              Setup Complete!                 ║
  ║                                              ║
  ║  Providers configured: ${String(configured).padEnd(22)}║
  ║  Config saved to: .env                       ║
  ║                                              ║
  ║  Next steps:                                 ║
  ║  1. Run: freecodeai start                    ║
  ║  2. Point VS Code to localhost:3377/v1       ║
  ║  3. Start coding for free!                   ║
  ╚══════════════════════════════════════════════╝
  `);

  rl.close();
}

module.exports = { run };

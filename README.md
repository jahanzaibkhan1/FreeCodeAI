<p align="center">
  <img src="logo.svg" width="120" alt="FreeCodeAI Logo"/>
</p>

<h1 align="center">FreeCodeAI</h1>

<p align="center">
  <strong>One command. 15+ free AI models. Auto-fallback. Code validation.</strong><br>
  Stop paying $200/month for AI coding. Every free LLM provider, one endpoint.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/cost-$0-22c55e?style=flat-square" alt="Cost: $0"/>
  <img src="https://img.shields.io/badge/providers-15+-2563eb?style=flat-square" alt="15+ Providers"/>
  <img src="https://img.shields.io/badge/tokens/day-5M+-f59e0b?style=flat-square" alt="5M+ tokens/day"/>
  <img src="https://img.shields.io/badge/license-MIT-7c3aed?style=flat-square" alt="MIT License"/>
  <img src="https://img.shields.io/github/stars/jahanzaibkhan1/freecodeai?style=flat-square" alt="Stars"/>
</p>

<p align="center">
  <img src="docs/demo.gif" width="720" alt="FreeCodeAI demo — gateway startup, auto-fallback, and code validation"/>
</p>

> **Demo GIF coming soon.** Run `npx freecodeai setup && npx freecodeai start` to see it live.

---

## The Problem

You're coding with AI. You hit a rate limit. You switch tabs, log into another provider, paste your prompt again. Repeat 5x a day.

**FreeCodeAI fixes this.** One endpoint, 15+ free providers, automatic failover, zero cost.

```
You → FreeCodeAI (localhost:3377) → Groq → ❌ limit → Gemini → ❌ limit → Cerebras → ✅ response
                                    You never notice the switching ↑
```

## Quick Start

```bash
npx freecodeai setup    # get API keys (interactive wizard)
npx freecodeai start    # start the gateway
```

Point any AI tool to `http://localhost:3377/v1` and start coding. That's it.

**Or with Docker:**

```bash
docker run -d --env-file .env -p 3377:3377 -p 3378:3378 freecodeai/freecodeai
```

## Works With

| Tool | Config |
|------|--------|
| **Cline** | Set API Base to `http://localhost:3377/v1` |
| **Continue** | Set apiBase in `config.json` |
| **Cursor** | Set OpenAI Base URL in settings |
| **Copilot** | Use as OpenAI-compatible endpoint |
| **Claude Code** | Set `OPENAI_API_BASE` env var |
| **Any OpenAI SDK** | Point `base_url` to `localhost:3377/v1` |

## Features

### Auto-Fallback Gateway
15+ providers behind one endpoint. Rate limit on Provider A? Silent switch to Provider B. You keep coding.

```javascript
const res = await fetch("http://localhost:3377/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "auto",
    messages: [{ role: "user", content: "Write a React hook for debounce" }]
  })
});
```

### Code Trust & Validation

No other tool does this. Send the same prompt to 3 models, compare outputs, get the best answer with a confidence score.

```bash
freecodeai validate "Write a merge sort in Python"

# ┌─────────────┬──────────┬─────────┬────────────┐
# │ Model       │ Correct  │ Time    │ Confidence │
# ├─────────────┼──────────┼─────────┼────────────┤
# │ Gemini 2.5  │ ✅       │ 1.2s    │ 95%        │
# │ Llama 3.3   │ ✅       │ 0.4s    │ 92%        │
# │ Qwen3 Coder │ ✅       │ 0.8s    │ 97% ← Best │
# └─────────────┴──────────┴─────────┴────────────┘
```

### Live Dashboard

Real-time provider health, token usage, cost savings. Run `freecodeai dashboard` → opens `localhost:3378`.

### Smart Routing

| Strategy | What it does |
|----------|-------------|
| `auto` | Picks fastest available provider |
| `round-robin` | Distributes evenly across providers |
| `quality-first` | Uses highest-quality model available |
| `speed-first` | Uses fastest responding provider |
| `validate` | Sends to 3 models, returns best answer |

## Free Providers (No Credit Card Required)

| Provider | Daily Limit | Speed | Best Model |
|----------|-------------|-------|------------|
| Google Gemini | 1M TPM | ⚡ Fast | Gemini 2.5 Flash |
| Groq | 1K RPD | ⚡⚡ Ultra | Llama 3.3 70B |
| Cerebras | 1M tokens | ⚡⚡ Ultra | Llama 3.3 70B |
| OpenRouter | 20 RPM | Medium | Qwen3 Coder |
| Mistral AI | ~1B/month | ⚡ Fast | Mistral Small 4 |
| GitHub Models | Varies | Medium | Llama 3.1 8B |
| NVIDIA NIM | 91 endpoints | ⚡ Fast | Nemotron-3 |
| Cloudflare | 10K neurons | ⚡ Fast | Llama 3.2 |
| Cohere | ~100 RPD | Medium | Command R+ |
| SambaNova | 200K tokens | ⚡ Fast | Llama 3.1 405B |
| HuggingFace | 2K RPD | Varies | Many |
| DeepSeek | 10M trial | ⚡ Fast | DeepSeek R1 |
| Chutes.ai | Varies | Medium | DeepSeek R1 |
| Alibaba/Qwen | 1M/month | ⚡ Fast | Qwen 3.6 Plus |
| OVHcloud | 12 RPM | Medium | Qwen, Mistral |

**Combined: ~5M+ free tokens per day.**

## Configuration

```yaml
# freecodeai.config.yml
port: 3377
dashboard_port: 3378
strategy: auto
validation_models: 3
fallback_timeout: 5000
```

See [docs/configuration.md](docs/configuration.md) for full provider config.

## Architecture

```
┌──────────────┐     ┌──────────────────────────────────────┐
│   VS Code    │────▶│         FreeCodeAI Gateway            │
│   Cursor     │     │  ┌─────────┐  ┌────────────────────┐ │
│   Cline      │     │  │ Router  │──│ Provider Pool       │ │
│   Claude Code│     │  │         │  │ ✅ Gemini (healthy) │ │
└──────────────┘     │  │  auto   │  │ ⚠️ Groq (limited)   │ │
                     │  │ routing │  │ ✅ Cerebras (ready) │ │
                     │  └────┬────┘  │ ✅ Mistral (ready)  │ │
                     │       │       └────────────────────┘ │
                     │       ▼                              │
                     │  ┌─────────┐  ┌────────────────────┐ │
                     │  │Validator│  │    Dashboard        │ │
                     │  │ 3-model │  │  localhost:3378     │ │
                     │  └─────────┘  └────────────────────┘ │
                     └──────────────────────────────────────┘
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Priority areas: new providers, routing strategies, validation heuristics, dashboard UI.

```bash
git clone https://github.com/jahanzaibkhan1/FreeCodeAI.git
cd freecodeai && npm install && npm run dev
```

## Roadmap

- [x] Multi-provider gateway with auto-fallback
- [x] CLI setup wizard
- [x] Code validation across models
- [x] Live health dashboard
- [x] Docker support
- [x] GitHub Actions CI/CD
- [ ] VS Code extension (native)
- [ ] MCP server for Claude Code
- [ ] Auto-discovery from cheahjs/free-llm-api-resources
- [ ] Token usage analytics
- [ ] Team mode (shared provider pool)

## The Story

I'm a QA Automation Engineer from Pakistan. AI coding tools were transforming how fast people ship software — but the good ones cost $20–$200/month, and the free tiers ran out mid-session constantly.

I got tired of switching tabs, re-pasting prompts, losing context. Every provider has free limits. Nobody had connected them. So I spent my weekends building this.

If you're a developer who can't justify $200/month for AI tools, this is for you.

## License

MIT © [Muhammad Jahanzaib](https://github.com/jahanzaibkhan1)

---

<p align="center">
  <strong>Stop paying for AI coding. Start using FreeCodeAI.</strong><br>
  <a href="#quick-start">Get started in 30 seconds →</a>
</p>

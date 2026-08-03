# Configuration Guide

## Quick Setup

```bash
npx freecodeai setup
```

The setup wizard walks you through getting API keys from each provider. Every provider is free, no credit card required.

## Manual Configuration

### Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Provider | Where to get it |
|----------|----------|----------------|
| `GEMINI_API_KEY` | Google Gemini | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GROQ_API_KEY` | Groq | [console.groq.com/keys](https://console.groq.com/keys) |
| `CEREBRAS_API_KEY` | Cerebras | [cloud.cerebras.ai](https://cloud.cerebras.ai/) |
| `OPENROUTER_API_KEY` | OpenRouter | [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys) |
| `MISTRAL_API_KEY` | Mistral AI | [console.mistral.ai/api-keys](https://console.mistral.ai/api-keys) |
| `GITHUB_TOKEN` | GitHub Models | [github.com/settings/tokens](https://github.com/settings/tokens) |
| `NVIDIA_API_KEY` | NVIDIA NIM | [build.nvidia.com](https://build.nvidia.com/) |
| `COHERE_API_KEY` | Cohere | [dashboard.cohere.com/api-keys](https://dashboard.cohere.com/api-keys) |
| `SAMBANOVA_API_KEY` | SambaNova | [cloud.sambanova.ai](https://cloud.sambanova.ai/) |
| `HF_API_KEY` | HuggingFace | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
| `DEEPSEEK_API_KEY` | DeepSeek | [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) |

You don't need all of them. Even 2-3 providers give you solid coverage with auto-fallback.

### Config File

Create `freecodeai.config.yml` in your project root:

```yaml
port: 3377
dashboard_port: 3378
strategy: auto
validation_models: 3
fallback_timeout: 5000
```

### Routing Strategies

| Strategy | Best for |
|----------|---------|
| `auto` | General coding (default) |
| `round-robin` | Maximizing daily quota |
| `quality-first` | Complex code generation |
| `speed-first` | Quick completions, autocomplete |
| `validate` | Production code, critical functions |

## VS Code Integration

### Cline

```json
{
  "cline.apiBaseUrl": "http://localhost:3377/v1",
  "cline.apiKey": "freecodeai",
  "cline.model": "auto"
}
```

### Continue

Add to `.continue/config.json`:

```json
{
  "models": [{
    "title": "FreeCodeAI",
    "provider": "openai",
    "apiBase": "http://localhost:3377/v1",
    "apiKey": "freecodeai",
    "model": "auto"
  }]
}
```

### Environment Variable (works with any tool)

```bash
export OPENAI_API_BASE=http://localhost:3377/v1
export OPENAI_API_KEY=freecodeai
```

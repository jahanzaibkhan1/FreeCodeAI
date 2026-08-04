# Changelog

All notable changes to FreeCodeAI are documented here.

## [1.2.0] - 2026-08-04

### Added
- **Code executor** — add `execute: true` to any request to run the generated code in a sandbox (JS via Node `vm`, Python via subprocess, 5s timeout each)
- **Provider quality scoring** — every code execution records pass/fail per provider; persisted to `data/quality.json`
- **`/api/quality` endpoint** — real-time pass rate data for all providers (available on both gateway port 3377 and dashboard port 3378)
- **Self-improving quality-first routing** — `"model": "quality-first"` routes to the provider with the highest real-world pass rate; falls back to static priority order until a provider has ≥5 executions of proven data
- **MCP server** (`src/mcp/server.js`) — Claude Code integration via `.mcp.json`; exposes three tools: `freecodeai_validate`, `freecodeai_route`, `freecodeai_status`
- **`_execution` field in response body** — `{ ran, passed, language, durationMs, stdout, error }` when `execute: true`
- **`X-FreeCodeAI-Execution` response header** — `pass` or `fail` for quick inspection
- **Dashboard Provider Quality table** — live color-coded pass rate bars, auto-refreshes every 5s
- **Python 3 support** — Windows App Execution Alias stub bypassed via `where.exe` resolution; falls back through known install paths
- Python installed at `%LOCALAPPDATA%\Programs\Python\Python313`

### Fixed
- `"quality-first"` model alias now correctly maps to each provider's own model name (previously caused 503 as literal string was sent to provider APIs)
- Windows `python`/`python3` commands now resolve to real Python install, not Microsoft Store stub

### Changed
- `getByQuality()` in provider pool now reads live pass rate data instead of a hardcoded static list
- `quality-first` strategy logs the top-5 provider ranking on every call
- Dashboard stat card "Est. Daily Tokens" replaced with "Code Executions" counter
- `"quality-first"` added to `/v1/models` list so AI tools can discover it

## [1.1.0] - 2026-08-04

### Added
- Chutes.ai provider (DeepSeek-R1)
- Alibaba/Qwen provider via DashScope international
- OVHcloud provider with anonymous free tier (no API key needed)
- `PORT`, `DASHBOARD_PORT`, `STRATEGY` configurable via environment variables
- Anonymous provider support — providers with free tiers work without API keys
- Qwen3 235B via OpenRouter free tier

### Fixed
- Gemini model updated to `gemini-2.0-flash` (2.5-flash deprecated for new users)
- Dashboard correctly shows anonymous providers as healthy
- Dockerfile uses `npm install` directly (removed failing `npm ci` fallback)
- CLI `dashboard` command no longer hardcodes port 3378
- Removed unimplemented `add` command from help text
- `Cache-Control: no-store` header on dashboard HTML

### Changed
- Provider count: 12 → 15 (including 3 new providers)
- OVHcloud model updated to Qwen3-32B

## [1.0.0] - 2026-08-03

### Added
- Initial release
- OpenAI-compatible gateway (`/v1/chat/completions`)
- 12 free providers: Groq, Gemini, Cerebras, OpenRouter, Mistral, GitHub Models, NVIDIA NIM, Cloudflare Workers AI, Cohere, SambaNova, HuggingFace, DeepSeek
- Routing strategies: auto, round-robin, speed-first, quality-first, validate
- Code validation across 3 models in parallel with confidence scoring
- CLI: `setup`, `start`, `dashboard`, `validate`, `status`
- Live health dashboard at `localhost:3378`
- Docker and docker-compose support
- GitHub Actions CI (Node 18, 20, 22)
- Interactive setup wizard
- Provider health tracking with exponential moving average
- Auto-fallback with rate limit detection and cooldown

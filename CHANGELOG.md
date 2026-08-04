# Changelog

All notable changes to FreeCodeAI are documented here.

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

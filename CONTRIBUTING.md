# Contributing to FreeCodeAI

Thanks for your interest in making AI coding free for everyone!

## How to contribute

1. **Fork** the repository
2. **Create a branch** for your feature: `git checkout -b feature/add-new-provider`
3. **Make your changes** and test them
4. **Submit a Pull Request** with a clear description

## Priority areas

### Adding new providers
The fastest way to contribute. Each provider is an entry in `src/gateway/config.js`:

```javascript
newprovider: {
  enabled: true,
  api_key: process.env.NEWPROVIDER_API_KEY || "",
  base_url: "https://api.newprovider.com/v1",
  models: ["model-name"],
  priority: 13,
  rate_limit: { rpm: 30, rpd: 1000 },
}
```

Also add it to `cli/setup.js` so the setup wizard includes it.

### Improving routing strategies
The router lives in `src/gateway/router.js`. Ideas:
- Latency-based routing (track response times, prefer faster)
- Cost-aware routing (when paid tiers are mixed in)
- Model-quality routing (benchmark scores)

### Code validation heuristics
The validation engine in `src/validator/` needs better scoring:
- AST-based code comparison
- Test generation and execution
- Security vulnerability scanning
- Performance pattern detection

### Dashboard
The live dashboard needs:
- Real-time WebSocket updates
- Provider uptime history charts
- Token usage analytics
- Cost savings calculator

## Code style

- Node.js 18+, no TypeScript (keeping it simple for contributors)
- No external dependencies for core gateway (stdlib only)
- Use `console.log` with `[Module]` prefix for logging
- Keep files under 200 lines

## Testing

```bash
npm test
```

## Questions?

Open an issue. We're friendly.

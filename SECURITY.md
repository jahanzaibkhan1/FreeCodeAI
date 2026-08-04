# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅        |

## Reporting a Vulnerability

If you find a security vulnerability, **do not open a public issue**.

Email: ai@buraqminds.com

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

You'll get a response within 48 hours. If confirmed, a fix will be released within 7 days.

## Security Notes

- **API keys** are stored in your local `.env` file only — never sent anywhere except the provider's official API endpoint
- **No telemetry** — FreeCodeAI makes no external calls except to AI provider APIs
- **Zero npm dependencies** — the entire codebase is auditable with no supply chain risk
- **Local only** — the gateway binds to `localhost` by default; do not expose port 3377 to the public internet without authentication

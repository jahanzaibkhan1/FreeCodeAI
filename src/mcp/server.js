#!/usr/bin/env node
// FreeCodeAI MCP Server — exposes validate, route, status as Claude tools
// Add to .claude/settings.json:
// { "mcpServers": { "freecodeai": { "command": "node", "args": ["/path/to/src/mcp/server.js"] } } }

const { Router } = require("../gateway/router");
const { ProviderPool } = require("../providers/pool");
const { loadConfig } = require("../gateway/config");

const config = loadConfig();
const pool = new ProviderPool(config.providers);

const TOOLS = [
  {
    name: "freecodeai_validate",
    description:
      "Send a prompt to 3 AI models in parallel and return the best response with confidence scores. " +
      "Use this for important code where you want cross-model verification before trusting the output.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The coding prompt to validate across multiple models" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "freecodeai_route",
    description:
      "Send a prompt to the best available free AI provider with automatic fallback across 13 providers. " +
      "~5M free tokens/day combined. Never hits rate limits.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The prompt to send" },
        strategy: {
          type: "string",
          enum: ["auto", "speed-first", "quality-first", "round-robin"],
          description: "Routing strategy. Default: auto (priority-ordered fallback)",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "freecodeai_status",
    description: "Get real-time health status of all configured AI providers — which are healthy, rate-limited, or disabled.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

async function callTool(name, args) {
  if (name === "freecodeai_validate") {
    const router = new Router(pool, "validate");
    const result = await router.route({
      model: "validate",
      messages: [{ role: "user", content: args.prompt }],
      stream: false,
    });

    const v = result.data._validation;
    const content = result.data.choices?.[0]?.message?.content || "";

    const table = v.scores
      .map((s) => `  ${s.provider.padEnd(14)} ${s.model.slice(0, 28).padEnd(28)} ${s.score}%${s.provider === result.provider ? " <- Best" : ""}`)
      .join("\n");

    return [
      `Validated across ${v.models_compared} models. Consensus: ${v.consensus ? "yes" : "no"}`,
      ``,
      `Provider         Model                          Score`,
      `${"─".repeat(58)}`,
      table,
      ``,
      `Best response (${result.provider}, ${Math.round(v.confidence * 100)}% confidence):`,
      ``,
      content,
    ].join("\n");
  }

  if (name === "freecodeai_route") {
    const strategy = args.strategy || "auto";
    const router = new Router(pool, strategy);
    const result = await router.route({
      model: "auto",
      messages: [{ role: "user", content: args.prompt }],
      stream: false,
    });

    const content = result.data.choices?.[0]?.message?.content || "";
    return [
      `Provider: ${result.provider} | Model: ${result.model} | Attempts: ${result.attempts}`,
      ``,
      content,
    ].join("\n");
  }

  if (name === "freecodeai_status") {
    const status = pool.getStatus();
    const entries = Object.entries(status);
    const active = entries.filter(([, s]) => s.healthy && !s.rateLimited);
    const limited = entries.filter(([, s]) => s.rateLimited);
    const down = entries.filter(([, s]) => !s.healthy && !s.rateLimited);

    const fmt = ([name, s]) => {
      const state = s.rateLimited ? "rate-limited" : s.healthy ? "healthy" : "down";
      const rt = s.avgResponseTime ? `${s.avgResponseTime}ms` : "untried";
      const sr = s.requests ? `${Math.round(s.successRate * 100)}% ok` : "no requests";
      return `  ${name.padEnd(14)} ${state.padEnd(12)} ${rt.padEnd(10)} ${sr}`;
    };

    return [
      `Active: ${active.length}/${entries.length} providers`,
      ``,
      `Provider       State        Avg RT     Success`,
      `${"─".repeat(52)}`,
      ...active.map(fmt),
      ...(limited.length ? [``, `Rate limited:`, ...limited.map(fmt)] : []),
      ...(down.length ? [``, `Down:`, ...down.map(fmt)] : []),
    ].join("\n");
  }

  throw new Error(`Unknown tool: ${name}`);
}

// JSON-RPC 2.0 over stdio
let buffer = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) handle(JSON.parse(trimmed));
  }
});

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

function handle(msg) {
  const { id, method, params } = msg;

  if (method === "initialize") {
    return send({
      jsonrpc: "2.0", id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "freecodeai", version: "1.0.0" },
      },
    });
  }

  if (method === "notifications/initialized") return;

  if (method === "tools/list") {
    return send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  }

  if (method === "tools/call") {
    callTool(params.name, params.arguments || {})
      .then((text) =>
        send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text }] } })
      )
      .catch((err) =>
        send({ jsonrpc: "2.0", id, error: { code: -32000, message: err.message } })
      );
    return;
  }

  if (id !== undefined) {
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${method}` } });
  }
}

process.stderr.write("[FreeCodeAI MCP] Ready — 3 tools: freecodeai_validate, freecodeai_route, freecodeai_status\n");

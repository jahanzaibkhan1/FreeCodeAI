#!/usr/bin/env node

const http = require("http");
const { Router } = require("./router");
const { ProviderPool } = require("../providers/pool");
const { loadConfig } = require("./config");
const { execute } = require("../executor/sandbox");
const qualityStore = require("../executor/quality-store");

const config = loadConfig();
const pool = new ProviderPool(config.providers);
const router = new Router(pool, config.strategy);

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    return res.end();
  }

  // Health check
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "ok", providers: pool.getStatus() }));
  }

  // Provider quality scores
  if (req.url === "/api/quality") {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    return res.end(JSON.stringify(qualityStore.getAll()));
  }

  // List models
  if (req.url === "/v1/models" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ object: "list", data: pool.listModels() }));
  }

  // Chat completions — the main endpoint
  if (req.url === "/v1/chat/completions" && req.method === "POST") {
    try {
      const body = await readBody(req);
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: { message: "Invalid JSON body", type: "invalid_request_error" } }));
      }

      const result = await router.route(parsed);

      // Opt-in code execution: add execute:true to your request body
      let execution = null;
      if (parsed.execute === true && !result.stream) {
        const content = result.data?.choices?.[0]?.message?.content || "";
        execution = await execute(content);
        qualityStore.record(result.provider, { executed: execution.ran, passed: execution.passed });
        console.log(`[Executor] ${result.provider} | ${execution.language || "?"} | ${execution.passed ? "PASS" : "FAIL"} | ${execution.durationMs}ms`);
      }

      res.writeHead(200, {
        "Content-Type": result.stream ? "text/event-stream" : "application/json",
        "X-FreeCodeAI-Provider": result.provider,
        "X-FreeCodeAI-Model": result.model,
        "X-FreeCodeAI-Fallbacks": result.attempts,
        ...(execution ? { "X-FreeCodeAI-Execution": execution.passed ? "pass" : "fail" } : {}),
      });

      if (result.stream) {
        let clientGone = false;
        req.on("close", () => { clientGone = true; });
        for await (const chunk of result.data) {
          if (clientGone) break;
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        if (!clientGone) {
          res.write("data: [DONE]\n\n");
          res.end();
        }
      } else {
        const body = execution
          ? {
              ...result.data,
              _execution: {
                ran: execution.ran,
                passed: execution.passed,
                language: execution.language,
                durationMs: execution.durationMs,
                stdout: execution.stdout || null,
                error: execution.error || null,
              },
            }
          : result.data;
        res.end(JSON.stringify(body));
      }
    } catch (err) {
      console.error("[FreeCodeAI] Error:", err.message);
      res.writeHead(err.status || 500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        error: { message: err.message, type: "gateway_error" }
      }));
    }
    return;
  }

  // 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

const PORT = config.port || 3377;
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n  Port ${PORT} is already in use. Is FreeCodeAI already running?\n`);
    process.exit(1);
  }
  throw err;
});
server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║           FreeCodeAI Gateway v1.0            ║
  ║                                              ║
  ║  Endpoint: http://localhost:${PORT}/v1         ║
  ║  Strategy: ${config.strategy.padEnd(33)}║
  ║  Providers: ${String(pool.activeCount()).padEnd(32)}║
  ║                                              ║
  ║  Point your AI tool here. Start coding.      ║
  ╚══════════════════════════════════════════════╝
  `);
});

module.exports = { server };

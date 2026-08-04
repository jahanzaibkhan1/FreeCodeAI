const https = require("https");
const http = require("http");

// Per-base-URL keep-alive agents (connection pooling)
const agentCache = new Map();
function getAgent(baseUrl) {
  if (!agentCache.has(baseUrl)) {
    const AgentClass = baseUrl.startsWith("https") ? https.Agent : http.Agent;
    agentCache.set(baseUrl, new AgentClass({ keepAlive: true, maxSockets: 6 }));
  }
  return agentCache.get(baseUrl);
}

class OpenAIProvider {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.currentModel = config.models[0];
    this.requestTimeout = config.timeout_ms || 15_000;
  }

  async complete(request) {
    const model =
      request.model === "auto" || request.model === "validate"
        ? this.currentModel
        : request.model;

    const url = `${this.config.base_url}/chat/completions`;
    const headers = { "Content-Type": "application/json" };

    if (this.name === "openrouter") {
      headers["Authorization"] = `Bearer ${this.config.api_key}`;
      headers["HTTP-Referer"] = "https://github.com/freecodeai";
      headers["X-Title"] = "FreeCodeAI";
    } else if (this.name === "cloudflare") {
      const cfUrl = `${this.config.base_url}/${this.config.account_id}/ai/v1/chat/completions`;
      headers["Authorization"] = `Bearer ${this.config.api_key}`;
      return this._fetch(cfUrl, headers, { ...request, model });
    } else {
      headers["Authorization"] = `Bearer ${this.config.api_key}`;
    }

    return this._fetch(url, headers, { ...request, model });
  }

  async _fetch(url, headers, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeout);

    const agent = getAgent(this.config.base_url);

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        signal: controller.signal,
        // Node 18 fetch doesn't support `dispatcher`; agent is passed for
        // compatibility with environments that accept it
        agent,
        body: JSON.stringify({
          model: body.model,
          messages: body.messages,
          temperature: body.temperature ?? 0.7,
          max_tokens: body.max_tokens ?? 4096,
          stream: body.stream ?? false,
        }),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      const error = new Error(
        `${this.name} returned ${response.status}: ${errorBody.slice(0, 200)}`
      );
      error.status = response.status;
      error.retryAfter = parseInt(response.headers.get("retry-after") || "60");
      throw error;
    }

    if (body.stream) {
      return this._handleStream(response);
    }

    const data = await response.json();
    return data;
  }

  async *_handleStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") return;
          try {
            yield JSON.parse(data);
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } finally {
      reader.cancel().catch(() => {});
    }
  }
}

module.exports = { OpenAIProvider };

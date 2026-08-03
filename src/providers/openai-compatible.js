class OpenAIProvider {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.currentModel = config.models[0];
  }

  async complete(request) {
    const model = request.model === "auto" || request.model === "validate"
      ? this.currentModel
      : request.model;

    const url = `${this.config.base_url}/chat/completions`;

    const headers = {
      "Content-Type": "application/json",
    };

    // Different auth header formats per provider
    if (this.name === "openrouter") {
      headers["Authorization"] = `Bearer ${this.config.api_key}`;
      headers["HTTP-Referer"] = "https://github.com/freecodeai";
      headers["X-Title"] = "FreeCodeAI";
    } else if (this.name === "cloudflare") {
      // Cloudflare uses a different URL pattern
      const cfUrl = `${this.config.base_url}/${this.config.account_id}/ai/v1/chat/completions`;
      headers["Authorization"] = `Bearer ${this.config.api_key}`;
      return this._fetch(cfUrl, headers, { ...request, model });
    } else {
      headers["Authorization"] = `Bearer ${this.config.api_key}`;
    }

    return this._fetch(url, headers, { ...request, model });
  }

  async _fetch(url, headers, body) {
    const startTime = Date.now();

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: body.model,
        messages: body.messages,
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 4096,
        stream: body.stream ?? false,
      }),
    });

    const elapsed = Date.now() - startTime;

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
    console.log(`[${this.name}] Response in ${elapsed}ms`);
    return data;
  }

  async *_handleStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

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
  }
}

module.exports = { OpenAIProvider };

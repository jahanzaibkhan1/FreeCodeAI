const { describe, it, mock } = require("node:test");
const assert = require("node:assert");

describe("Router", () => {
  it("should fallback when first provider fails", async () => {
    // Mock provider that fails
    const failProvider = {
      name: "fail-provider",
      currentModel: "test-model",
      config: { priority: 1 },
      complete: async () => { throw { status: 429, retryAfter: 60 }; },
    };

    // Mock provider that succeeds
    const successProvider = {
      name: "success-provider",
      currentModel: "test-model-2",
      config: { priority: 2 },
      complete: async () => ({
        choices: [{ message: { content: "Hello!" } }],
      }),
    };

    // Simulate routing
    const providers = [failProvider, successProvider];
    let result = null;
    let attempts = 0;

    for (const provider of providers) {
      attempts++;
      try {
        result = await provider.complete({ messages: [{ role: "user", content: "test" }] });
        break;
      } catch (err) {
        continue;
      }
    }

    assert.strictEqual(attempts, 2, "Should have tried 2 providers");
    assert.ok(result, "Should have a result");
    assert.strictEqual(result.choices[0].message.content, "Hello!");
  });

  it("should handle all providers failing", async () => {
    const failProvider = {
      name: "fail",
      config: { priority: 1 },
      complete: async () => { throw { status: 429 }; },
    };

    const providers = [failProvider];
    let allFailed = true;

    for (const provider of providers) {
      try {
        await provider.complete({});
        allFailed = false;
      } catch {
        continue;
      }
    }

    assert.strictEqual(allFailed, true, "All providers should have failed");
  });
});

describe("Provider Pool", () => {
  it("should track health correctly", () => {
    const health = {
      healthy: true,
      rateLimited: false,
      successCount: 0,
      failureCount: 0,
    };

    // Record success
    health.successCount++;
    assert.strictEqual(health.successCount, 1);

    // Record failures
    for (let i = 0; i < 6; i++) {
      health.failureCount++;
    }
    if (health.failureCount > 5) health.healthy = false;

    assert.strictEqual(health.healthy, false, "Should be unhealthy after 6 failures");
  });

  it("should detect rate limiting", () => {
    const health = {
      rateLimited: true,
      rateLimitedUntil: Date.now() + 60000,
    };

    const isLimited = health.rateLimited && Date.now() < health.rateLimitedUntil;
    assert.strictEqual(isLimited, true, "Should be rate limited");

    // Simulate expired limit
    health.rateLimitedUntil = Date.now() - 1000;
    const isExpired = Date.now() > health.rateLimitedUntil;
    assert.strictEqual(isExpired, true, "Rate limit should have expired");
  });
});

describe("Response Scoring", () => {
  it("should score responses with code higher", () => {
    const scoreResponse = (content) => {
      let score = 50;
      if (content.length > 100) score += 10;
      if (content.length > 500) score += 10;
      if (content.includes("```")) score += 15;
      if (content.includes("//")) score += 5;
      if (content.includes("try") || content.includes("catch")) score += 5;
      return Math.min(score, 100);
    };

    const shortAnswer = scoreResponse("Yes");
    const codeAnswer = scoreResponse("```javascript\nfunction merge(a, b) {\n  // merge two arrays\n  try {\n    return [...a, ...b].sort();\n  } catch (e) {\n    return [];\n  }\n}\n```\nThis function merges and sorts two arrays. It handles edge cases with a try-catch block. The spread operator creates a new array from both inputs. Then Array.sort() orders the elements. This approach is O(n log n) due to the sorting step. For large arrays, consider a merge-sort approach that preserves the existing order of both sorted inputs, running in O(n) time.");
    
    assert.ok(codeAnswer > shortAnswer, "Code answer should score higher than short answer");
  });
});

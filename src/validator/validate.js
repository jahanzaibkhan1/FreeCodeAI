const { ProviderPool } = require("../providers/pool");
const { Router } = require("../gateway/router");
const { loadConfig } = require("../gateway/config");

const G = "\x1b[32m", B = "\x1b[1m", D = "\x1b[2m", N = "\x1b[0m";

async function validate(prompt) {
  const config = loadConfig();
  const pool = new ProviderPool(config.providers);
  const router = new Router(pool, "validate");

  return router.route({
    model: "validate",
    messages: [{ role: "user", content: prompt }],
    stream: false,
  });
}

function printResult(result) {
  const v = result.data._validation;
  const scores = v.scores;

  const w1 = 14, w2 = 26, w3 = 13;
  const hr = (l, m, r) =>
    `  ${l}${"─".repeat(w1 + 2)}${m}${"─".repeat(w2 + 2)}${m}${"─".repeat(w3 + 2)}${r}`;

  console.log(hr("┌", "┬", "┐"));
  console.log(`  │ ${"Provider".padEnd(w1)} │ ${"Model".padEnd(w2)} │ ${"Confidence".padEnd(w3)} │`);
  console.log(hr("├", "┼", "┤"));

  for (const s of scores) {
    const best = s.provider === result.provider;
    const conf = `${s.score}%${best ? " ← Best" : ""}`.padEnd(w3);
    const prov = s.provider.padEnd(w1);
    const model = (s.model || "").slice(0, w2).padEnd(w2);
    if (best) {
      console.log(`  │ ${G}${B}${prov}${N} │ ${D}${model}${N} │ ${G}${B}${conf}${N} │`);
    } else {
      console.log(`  │ ${prov} │ ${D}${model}${N} │ ${conf} │`);
    }
  }

  console.log(hr("└", "┴", "┘"));

  const content = result.data.choices?.[0]?.message?.content || "(no content)";
  console.log(`\n  ${G}${B}Best answer${N} via ${result.provider} (${Math.round(v.confidence * 100)}% confidence):\n`);
  console.log(content.split("\n").map((l) => `  ${l}`).join("\n"));
  console.log();
}

// Run as standalone script: node src/validator/validate.js "prompt"
if (require.main === module) {
  const prompt = process.argv.slice(2).join(" ");
  if (!prompt) {
    console.error('\n  Usage: node src/validator/validate.js "your prompt"\n');
    process.exit(1);
  }
  console.log(`\n  Querying models in parallel...\n`);
  validate(prompt)
    .then(printResult)
    .catch((err) => { console.error("  Error:", err.message || err); process.exit(1); });
}

module.exports = { validate, printResult };

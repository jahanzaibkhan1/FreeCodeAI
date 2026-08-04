const { validate, printResult } = require("../src/validator/validate");
const { loadConfig } = require("../src/gateway/config");
const { ProviderPool } = require("../src/providers/pool");

async function run(prompt) {
  if (!prompt || !prompt.trim()) {
    console.log('\n  Usage: freecodeai validate "your prompt"\n');
    console.log('  Example: freecodeai validate "write a binary search in Python"\n');
    return;
  }

  const config = loadConfig();
  const pool = new ProviderPool(config.providers);
  const active = pool.activeCount();

  if (active === 0) {
    console.error('\n  No providers configured. Run "freecodeai setup" first.\n');
    process.exit(1);
  }

  console.log(`\n  Querying ${Math.min(active, 3)} models in parallel...\n`);

  const result = await validate(prompt);
  printResult(result);
}

module.exports = { run };

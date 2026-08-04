const { loadConfig } = require("../src/gateway/config");

const G = "\x1b[32m", Y = "\x1b[33m", D = "\x1b[2m", B = "\x1b[1m", N = "\x1b[0m";

async function run() {
  const config = loadConfig();
  const providers = Object.entries(config.providers);

  const configured = providers.filter(([, p]) => p.api_key);
  const missing = providers.filter(([, p]) => !p.api_key);

  console.log(`\n  ${B}FreeCodeAI — Provider Status${N}\n`);
  console.log(`  Gateway:   http://localhost:${config.port}/v1`);
  console.log(`  Dashboard: http://localhost:${config.dashboard_port}`);
  console.log(`  Strategy:  ${config.strategy}\n`);

  if (configured.length > 0) {
    console.log(`  ${G}${B}Configured (${configured.length})${N}`);
    for (const [name, cfg] of configured) {
      const model = (cfg.models || [])[0] || "";
      console.log(`  ✅  ${B}${name.padEnd(12)}${N}  ${D}${model}${N}`);
    }
  }

  if (missing.length > 0) {
    console.log(`\n  ${D}Not configured (${missing.length})${N}`);
    for (const [name] of missing) {
      console.log(`  ${D}○   ${name}${N}`);
    }
    console.log(`\n  ${D}Run "freecodeai setup" to add more providers.${N}`);
  }

  if (configured.length === 0) {
    console.log(`  ${Y}No providers configured. Run "freecodeai setup" to get started.${N}`);
  } else {
    console.log(`\n  Run ${B}freecodeai start${N} to launch the gateway.\n`);
  }
}

module.exports = { run };

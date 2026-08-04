#!/usr/bin/env node

const args = process.argv.slice(2);
const command = args[0];

const HELP = `
  FreeCodeAI — Free AI coding with auto-fallback

  Usage:
    freecodeai <command>

  Commands:
    setup       Interactive setup wizard (get API keys, configure providers)
    start       Start the gateway server
    dashboard   Open the live health dashboard
    validate    Validate a prompt across multiple models in parallel
    status      Show provider health status
    help        Show this help

  Examples:
    freecodeai setup                               # First-time setup
    freecodeai start                               # Start the gateway
    freecodeai validate "write a binary search"    # Cross-validate output
    freecodeai status                              # Check provider health
`;

async function main() {
  switch (command) {
    case "setup":
      await require("./setup").run();
      break;
    case "start":
      require("../src/gateway/server");
      break;
    case "dashboard":
      require("../src/dashboard/server");
      break;
    case "validate": {
      const prompt = args.slice(1).join(" ");
      await require("./validate-cli").run(prompt);
      break;
    }
    case "status":
      await require("./status").run();
      break;
    case "help":
    case "--help":
    case "-h":
    default:
      console.log(HELP);
  }
}

main().catch(console.error);

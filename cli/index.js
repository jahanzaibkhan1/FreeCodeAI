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
    validate    Validate code across multiple models
    status      Show provider health status
    add         Add a new provider
    help        Show this help

  Examples:
    freecodeai setup          # First-time setup
    freecodeai start          # Start coding with free AI
    freecodeai validate       # Cross-validate AI code
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
      console.log("Opening dashboard at http://localhost:3378...");
      require("../src/dashboard/server");
      break;
    case "validate":
      const prompt = args.slice(1).join(" ");
      await require("./validate-cli").run(prompt);
      break;
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

#!/usr/bin/env node
// Simulates `freecodeai start` for the demo GIF — not production code

const g = '\x1b[32m', y = '\x1b[33m', c = '\x1b[36m',
      b = '\x1b[1m',  d = '\x1b[2m',  r = '\x1b[0m';

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function main() {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   ${c}${b}FreeCodeAI Gateway v1.0${r}                   ║
  ║                                              ║
  ║  Endpoint:  ${g}http://localhost:3377/v1${r}        ║
  ║  Dashboard: ${g}http://localhost:3378${r}           ║
  ║  Strategy:  ${y}auto${r}                             ║
  ╚══════════════════════════════════════════════╝
`);

  await sleep(350);
  console.log(`  Checking providers...\n`);

  const providers = [
    ['Gemini 2.5 Flash ', 'Google    ', 'healthy',      g, '✅'],
    ['Llama 3.3 70B    ', 'Groq      ', 'healthy',      g, '✅'],
    ['Llama 3.3 70B    ', 'Cerebras  ', 'healthy',      g, '✅'],
    ['Mistral Small 4  ', 'Mistral AI', 'healthy',      g, '✅'],
    ['Qwen3 Coder      ', 'OpenRouter', 'healthy',      g, '✅'],
    ['DeepSeek R1      ', 'DeepSeek  ', 'rate limited', y, '⚠️ '],
  ];

  for (const [model, provider, status, color, icon] of providers) {
    await sleep(190);
    console.log(`  ${icon}  ${b}${model}${r}  ${d}(${provider})${r}  ${color}${status}${r}`);
  }

  await sleep(400);
  console.log(`\n  ${g}${b}Ready.${r} 5 providers active — waiting for requests.\n`);
}

main();

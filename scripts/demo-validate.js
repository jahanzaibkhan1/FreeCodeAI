#!/usr/bin/env node
// Simulates `freecodeai validate` for the demo GIF — not production code

const g = '\x1b[32m', c = '\x1b[36m',
      b = '\x1b[1m',  d = '\x1b[2m', r = '\x1b[0m';

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function main() {
  console.log(`\n  ${b}freecodeai validate${r} ${c}"write a binary search in Python"${r}\n`);
  await sleep(350);
  console.log(`  Querying 3 models in parallel...\n`);

  // Each model finishes at a different time, printed as they arrive
  const models = [
    { name: 'Llama 3.3 70B ', provider: 'Groq      ', ms: 410,  score: 92 },
    { name: 'Qwen3 Coder   ', provider: 'OpenRouter', ms: 790,  score: 97 },
    { name: 'Gemini 2.5    ', provider: 'Google    ', ms: 1220, score: 95 },
  ];

  const start = Date.now();
  await Promise.all(models.map(async ({ name, provider, ms, score }) => {
    await sleep(ms);
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    process.stdout.write(`  ${g}✓${r}  ${b}${name}${r} ${d}(${provider})${r} — ${elapsed}s\n`);
  }));

  await sleep(350);

  console.log(`
  ┌─────────────────┬────────────┬─────────┬─────────────┐
  │ Model           │ Provider   │ Time    │ Confidence  │
  ├─────────────────┼────────────┼─────────┼─────────────┤
  │ Llama 3.3 70B   │ Groq       │  0.41s  │ 92%         │
  │ Gemini 2.5      │ Google     │  1.22s  │ 95%         │
  │ ${g}${b}Qwen3 Coder    ${r} │ OpenRouter │  0.79s  │ ${g}${b}97%  ← Best${r} │
  └─────────────────┴────────────┴─────────┴─────────────┘

  ${g}${b}Best answer:${r} Qwen3 Coder  ${d}(confidence 97%, consensus: yes)${r}
`);
}

main();

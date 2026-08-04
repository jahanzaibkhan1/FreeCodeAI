#!/usr/bin/env node
// Simulates auto-fallback routing for the demo GIF — not production code

const g = '\x1b[32m', re = '\x1b[31m', y = '\x1b[33m',
      c = '\x1b[36m', b  = '\x1b[1m',  d = '\x1b[2m', r = '\x1b[0m';

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function main() {
  console.log(`\n  ${d}# Real request hitting the gateway${r}`);
  await sleep(250);
  console.log(`  ${c}POST${r} http://localhost:3377/v1/chat/completions\n`);
  await sleep(450);

  process.stdout.write(`  ${y}[Router]${r} Trying Groq...`);
  await sleep(950);
  console.log(`  ${re}✗ 429 Rate limit — switching${r}`);

  await sleep(150);
  process.stdout.write(`  ${y}[Router]${r} Trying Gemini...`);
  await sleep(1150);
  console.log(`  ${g}✓ 200 OK  (1.3s)${r}`);

  await sleep(350);
  console.log(`
  ${g}${b}Response delivered${r}  via ${c}Gemini 2.5 Flash${r}  ${d}(1 fallback, transparent to caller)${r}

  ${d}X-FreeCodeAI-Provider: gemini
  X-FreeCodeAI-Model:    gemini-2.5-flash
  X-FreeCodeAI-Fallbacks: 2${r}

  ${b}content:${r}
    ${d}\`\`\`js${r}
    function useDebounce(value, delay) {
      const [debounced, setDebounced] = useState(value);
      useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
      }, [value, delay]);
      return debounced;
    }
    ${d}\`\`\`${r}
`);
}

main();

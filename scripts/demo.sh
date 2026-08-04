#!/usr/bin/env bash
# Demo simulation for VHS recording — bash only, no Node.js required

G='\033[0;32m' Y='\033[1;33m' R='\033[0;31m'
C='\033[0;36m' B='\033[1m'    D='\033[2m'  N='\033[0m'

case "$1" in
  start)
    printf "\n"
    printf "  ╔══════════════════════════════════════════════╗\n"
    printf "  ║   ${C}${B}FreeCodeAI Gateway v1.0${N}                   ║\n"
    printf "  ║                                              ║\n"
    printf "  ║  Endpoint:  ${G}http://localhost:3377/v1${N}        ║\n"
    printf "  ║  Dashboard: ${G}http://localhost:3378${N}           ║\n"
    printf "  ║  Strategy:  ${Y}auto${N}                             ║\n"
    printf "  ╚══════════════════════════════════════════════╝\n\n"
    sleep 0.4
    printf "  Checking providers...\n\n"
    sleep 0.2; printf "  ✅  ${B}Gemini 2.5 Flash ${N}  ${D}(Google    )${N}  ${G}healthy${N}\n"
    sleep 0.2; printf "  ✅  ${B}Llama 3.3 70B    ${N}  ${D}(Groq      )${N}  ${G}healthy${N}\n"
    sleep 0.2; printf "  ✅  ${B}Llama 3.3 70B    ${N}  ${D}(Cerebras  )${N}  ${G}healthy${N}\n"
    sleep 0.2; printf "  ✅  ${B}Mistral Small 4  ${N}  ${D}(Mistral AI)${N}  ${G}healthy${N}\n"
    sleep 0.2; printf "  ✅  ${B}Qwen3 Coder      ${N}  ${D}(OpenRouter)${N}  ${G}healthy${N}\n"
    sleep 0.2; printf "  ⚠️   ${B}DeepSeek R1      ${N}  ${D}(DeepSeek  )${N}  ${Y}rate limited${N}\n"
    sleep 0.4
    printf "\n  ${G}${B}Ready.${N} 5 providers active — waiting for requests.\n\n"
    ;;

  fallback)
    printf "\n  ${D}# Real request hitting the gateway${N}\n"
    sleep 0.3
    printf "  ${C}POST${N} http://localhost:3377/v1/chat/completions\n\n"
    sleep 0.5
    printf "  ${Y}[Router]${N} Trying Groq..."
    sleep 1.0
    printf "  ${R}✗ 429 Rate limit — switching${N}\n"
    sleep 0.2
    printf "  ${Y}[Router]${N} Trying Gemini..."
    sleep 1.2
    printf "  ${G}✓ 200 OK  (1.3s)${N}\n"
    sleep 0.4
    printf "\n  ${G}${B}Response delivered${N}  via ${C}Gemini 2.5 Flash${N}  ${D}(1 fallback, transparent to caller)${N}\n\n"
    printf "  ${D}X-FreeCodeAI-Provider: gemini\n"
    printf "  X-FreeCodeAI-Model:    gemini-2.5-flash\n"
    printf "  X-FreeCodeAI-Fallbacks: 2${N}\n\n"
    printf "  ${B}content:${N}\n"
    printf "    function useDebounce(value, delay) {\n"
    printf "      const [debounced, setDebounced] = useState(value);\n"
    printf "      useEffect(() => {\n"
    printf "        const t = setTimeout(() => setDebounced(value), delay);\n"
    printf "        return () => clearTimeout(t);\n"
    printf "      }, [value, delay]);\n"
    printf "      return debounced;\n"
    printf "    }\n\n"
    ;;

  validate)
    printf "\n  ${B}freecodeai validate${N} ${C}\"write a binary search in Python\"${N}\n\n"
    sleep 0.4
    printf "  Querying 3 models in parallel...\n\n"
    sleep 0.4; printf "  ${G}✓${N}  ${B}Llama 3.3 70B ${N} ${D}(Groq      )${N} — 0.42s\n"
    sleep 0.4; printf "  ${G}✓${N}  ${B}Qwen3 Coder   ${N} ${D}(OpenRouter)${N} — 0.80s\n"
    sleep 0.4; printf "  ${G}✓${N}  ${B}Gemini 2.5    ${N} ${D}(Google    )${N} — 1.22s\n"
    sleep 0.3
    printf "\n"
    printf "  ┌─────────────────┬────────────┬─────────┬─────────────┐\n"
    printf "  │ Model           │ Provider   │ Time    │ Confidence  │\n"
    printf "  ├─────────────────┼────────────┼─────────┼─────────────┤\n"
    printf "  │ Llama 3.3 70B   │ Groq       │  0.41s  │ 92%%         │\n"
    printf "  │ Gemini 2.5      │ Google     │  1.22s  │ 95%%         │\n"
    printf "  │ ${G}${B}Qwen3 Coder    ${N} │ OpenRouter │  0.79s  │ ${G}${B}97%%  ← Best${N} │\n"
    printf "  └─────────────────┴────────────┴─────────┴─────────────┘\n\n"
    printf "  ${G}${B}Best answer:${N} Qwen3 Coder  ${D}(confidence 97%%, consensus: yes)${N}\n\n"
    ;;
esac

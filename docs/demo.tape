Output docs/demo.gif

# Run with: vhs docs/demo.tape
# Install VHS: https://github.com/charmbracelet/vhs
# On Windows: run in WSL or use GitHub Actions (see .github/workflows/demo.yml)

Set FontSize 14
Set Width 960
Set Height 580
Set Theme "Dracula"
Set Padding 24
Set TypingSpeed 42ms

# ── Scene 1: Gateway startup ───────────────────────────────────
Type "node scripts/demo-start.js"
Enter
Sleep 4.5s

# ── Scene 2: Auto-fallback in action ──────────────────────────
Type "node scripts/demo-fallback.js"
Enter
Sleep 5s

# ── Scene 3: Code validation across 3 models ──────────────────
Type "node scripts/demo-validate.js"
Enter
Sleep 5.5s

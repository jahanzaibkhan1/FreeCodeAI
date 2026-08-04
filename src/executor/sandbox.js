const vm = require("vm");
const { spawn, execSync } = require("child_process");
const os = require("os");
const path = require("path");

// On Windows the App Execution Alias stub intercepts bare "python"/"python3"
// before the real install. Resolve once at startup, skipping WindowsApps stubs.
const PYTHON_CMD = (() => {
  if (os.platform() !== "win32") return ["python3", "python"];
  try {
    const lines = execSync("where python", { encoding: "utf8", timeout: 3000 })
      .split("\n").map((l) => l.trim()).filter(Boolean);
    const real = lines.find((l) => !l.toLowerCase().includes("windowsapps"));
    if (real) return [real];
  } catch { /* where not found or python not on PATH */ }
  // Fallback: check common install dirs
  const lad = process.env.LOCALAPPDATA || "";
  for (const ver of ["313", "312", "311", "310", "39"]) {
    const p = path.join(lad, "Programs", "Python", `Python${ver}`, "python.exe");
    try { execSync(`"${p}" --version`, { timeout: 2000 }); return [p]; } catch { /* skip */ }
  }
  return ["python"];
})();

const TIMEOUT_MS = 5000;

function extractCode(content) {
  // Explicit language tags first
  const patterns = [
    [/```(?:javascript|js|node|typescript|ts)\r?\n([\s\S]+?)```/, "javascript"],
    [/```(?:python|py)\r?\n([\s\S]+?)```/, "python"],
  ];

  for (const [re, lang] of patterns) {
    const m = content.match(re);
    if (m) return { code: m[1].trim(), language: lang };
  }

  // Generic fence — detect language by content
  const generic = content.match(/```\w*\r?\n?([\s\S]+?)```/);
  if (generic) {
    const code = generic[1].trim();
    const isPython =
      /^(def |class |import |from |print\(|if __name__)/.test(code) ||
      code.includes(":\n    ");
    return { code, language: isPython ? "python" : "javascript" };
  }

  return null;
}

async function runJavaScript(code) {
  const output = [];
  const errors = [];
  const start = Date.now();

  try {
    const sandbox = Object.assign(Object.create(null), {
      console: {
        log: (...a) => output.push(a.map(String).join(" ")),
        error: (...a) => errors.push(a.map(String).join(" ")),
        warn: (...a) => output.push(a.map(String).join(" ")),
        info: (...a) => output.push(a.map(String).join(" ")),
      },
      // safe stdlib subset only — no require, no process, no global
      Math, JSON, parseInt, parseFloat, isNaN, isFinite, String, Number,
      Boolean, Array, Object, Date, RegExp, Error, TypeError, RangeError,
      Map, Set, WeakMap, WeakSet, Symbol, Promise,
      setTimeout: () => {}, clearTimeout: () => {},
      setInterval: () => {}, clearInterval: () => {},
    });

    const script = new vm.Script(code);
    // vm timeout handles synchronous infinite loops
    script.runInNewContext(sandbox, { timeout: TIMEOUT_MS });

    return {
      ran: true, passed: true,
      stdout: output.join("\n"), stderr: errors.join("\n"),
      error: null, durationMs: Date.now() - start, language: "javascript",
    };
  } catch (err) {
    return {
      ran: true, passed: false,
      stdout: output.join("\n"), stderr: "",
      error: err.message, durationMs: Date.now() - start, language: "javascript",
    };
  }
}

function runPython(code) {
  return new Promise((resolve) => {
    const start = Date.now();

    function trySpawn(cmd) {
      return new Promise((res) => {
        let stdout = "", stderr = "";
        let proc;
        try {
          proc = spawn(cmd, ["-c", code], { timeout: TIMEOUT_MS });
        } catch {
          return res(null);
        }
        proc.stdout.on("data", (d) => { stdout += d; });
        proc.stderr.on("data", (d) => { stderr += d; });
        proc.on("close", (exitCode) => res({ code: exitCode, stdout: stdout.trim(), stderr: stderr.trim() }));
        proc.on("error", () => res(null));
      });
    }

    (async () => {
      let r = null;
      for (const cmd of PYTHON_CMD) {
        r = await trySpawn(cmd);
        if (r !== null) break;
      }
      if (!r) {
        return resolve({
          ran: false, passed: false, stdout: "", stderr: "",
          error: "Python runtime not available", durationMs: Date.now() - start, language: "python",
        });
      }
      resolve({
        ran: true, passed: r.code === 0,
        stdout: r.stdout, stderr: r.stderr,
        error: r.code !== 0 ? (r.stderr || `Exit code ${r.code}`) : null,
        durationMs: Date.now() - start, language: "python",
      });
    })();
  });
}

async function execute(content) {
  const extracted = extractCode(content);
  if (!extracted) {
    return {
      ran: false, passed: false, stdout: "", stderr: "",
      error: "No executable code block found in response",
      durationMs: 0, language: null,
    };
  }
  return extracted.language === "python"
    ? runPython(extracted.code)
    : runJavaScript(extracted.code);
}

module.exports = { execute, extractCode };

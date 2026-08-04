const fs = require("fs");
const path = require("path");

const STORE_PATH = path.join(__dirname, "../../data/quality.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function save(data) {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[QualityStore] Save failed:", err.message);
  }
}

function record(providerName, { executed, passed }) {
  const store = load();
  if (!store[providerName]) {
    store[providerName] = { requests: 0, executions: 0, passes: 0 };
  }
  store[providerName].requests++;
  if (executed) {
    store[providerName].executions++;
    if (passed) store[providerName].passes++;
  }
  save(store);
}

function getAll() {
  const store = load();
  const out = {};
  for (const [name, d] of Object.entries(store)) {
    out[name] = {
      ...d,
      pass_rate: d.executions > 0 ? Math.round((d.passes / d.executions) * 100) : null,
    };
  }
  return out;
}

module.exports = { record, getAll };

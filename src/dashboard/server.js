const http = require("http");
const { loadConfig } = require("../gateway/config");
const qualityStore = require("../executor/quality-store");

const config = loadConfig();
const PORT = config.dashboard_port || 3378;

const server = http.createServer((req, res) => {
  if (req.url === "/api/status") {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    return res.end(JSON.stringify(getProviderStatus()));
  }

  if (req.url === "/api/quality") {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    return res.end(JSON.stringify(qualityStore.getAll()));
  }

  res.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-store" });
  res.end(DASHBOARD_HTML);
});

function getProviderStatus() {
  const providers = config.providers;
  return Object.entries(providers).map(([name, cfg]) => ({
    name,
    enabled: cfg.enabled && !!(cfg.api_key || cfg.anonymous),
    models: cfg.models || [],
    rateLimit: cfg.rate_limit || {},
    priority: cfg.priority,
    status: cfg.enabled && (cfg.api_key || cfg.anonymous) ? "healthy" : "disabled",
  }));
}

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FreeCodeAI Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; min-height: 100vh; }
    .header { padding: 24px 32px; border-bottom: 1px solid #1a1a1a; display: flex; align-items: center; justify-content: space-between; }
    .header h1 { font-size: 20px; font-weight: 600; }
    .header h1 span { color: #3b82f6; }
    .live { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #22c55e; }
    .live::before { content: ''; width: 8px; height: 8px; background: #22c55e; border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; padding: 24px 32px; }
    .stat { background: #111; border: 1px solid #1a1a1a; border-radius: 12px; padding: 20px; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { font-size: 32px; font-weight: 600; margin-top: 4px; }
    .stat-value.green { color: #22c55e; }
    .stat-value.blue { color: #3b82f6; }
    .stat-value.orange { color: #f59e0b; }
    .stat-value.purple { color: #8b5cf6; }
    .providers { padding: 0 32px 32px; }
    .providers h2 { font-size: 16px; font-weight: 500; margin-bottom: 16px; }
    .provider-grid { display: grid; gap: 12px; }
    .provider { background: #111; border: 1px solid #1a1a1a; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; transition: border-color 0.2s; }
    .provider:hover { border-color: #333; }
    .provider-left { display: flex; align-items: center; gap: 12px; }
    .provider-dot { width: 10px; height: 10px; border-radius: 50%; }
    .provider-dot.healthy { background: #22c55e; }
    .provider-dot.disabled { background: #666; }
    .provider-dot.limited { background: #f59e0b; }
    .provider-name { font-weight: 500; font-size: 14px; }
    .provider-model { font-size: 12px; color: #666; margin-top: 2px; }
    .provider-right { text-align: right; }
    .provider-status { font-size: 12px; padding: 4px 10px; border-radius: 6px; }
    .provider-status.healthy { background: rgba(34,197,94,0.1); color: #22c55e; }
    .provider-status.disabled { background: rgba(102,102,102,0.1); color: #666; }
    .endpoint { padding: 16px 32px; }
    .endpoint-box { background: #111; border: 1px solid #1a1a1a; border-radius: 12px; padding: 16px 20px; font-family: monospace; font-size: 14px; color: #3b82f6; }
    .quality { padding: 0 32px 32px; }
    .quality h2 { font-size: 16px; font-weight: 500; margin-bottom: 16px; }
    .quality-empty { color: #444; font-size: 13px; padding: 16px 0; }
    .quality-table { width: 100%; border-collapse: collapse; }
    .quality-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; padding: 0 12px 10px; }
    .quality-table td { padding: 10px 12px; border-top: 1px solid #1a1a1a; font-size: 13px; }
    .quality-table tr:hover td { background: #111; }
    .bar-track { background: #1a1a1a; border-radius: 4px; height: 6px; width: 100px; overflow: hidden; display: inline-block; vertical-align: middle; margin-left: 8px; }
    .bar-fill { height: 100%; border-radius: 4px; }
    .bar-fill.high { background: #22c55e; }
    .bar-fill.mid  { background: #f59e0b; }
    .bar-fill.low  { background: #ef4444; }
    .pass-badge { font-size: 11px; font-weight: 600; }
    .pass-badge.high { color: #22c55e; }
    .pass-badge.mid  { color: #f59e0b; }
    .pass-badge.low  { color: #ef4444; }
    .pass-badge.none { color: #444; }
  </style>
</head>
<body>
  <div class="header">
    <h1><span>&lt;/&gt;</span> FreeCodeAI Dashboard</h1>
    <div class="live">Live</div>
  </div>

  <div class="endpoint">
    <div class="endpoint-box">Endpoint: http://localhost:3377/v1/chat/completions</div>
  </div>

  <div class="stats" id="stats"></div>
  <div class="providers">
    <h2>Providers</h2>
    <div class="provider-grid" id="providers"></div>
  </div>

  <div class="quality">
    <h2>Provider Quality <span style="font-size:12px;color:#444;font-weight:400;">(from code execution)</span></h2>
    <div id="quality-content"><p class="quality-empty">No execution data yet. Add <code style="color:#3b82f6">execute:true</code> to a request to start tracking.</p></div>
  </div>

  <script>
    async function refresh() {
      try {
        const [statusRes, qualityRes] = await Promise.all([
          fetch('/api/status'),
          fetch('/api/quality'),
        ]);
        const providers = await statusRes.json();
        const quality = await qualityRes.json();
        const active = providers.filter(p => p.status === 'healthy');
        const totalExecs = Object.values(quality).reduce((s, q) => s + (q.executions || 0), 0);

        document.getElementById('stats').innerHTML =
          '<div class="stat"><div class="stat-label">Active Providers</div><div class="stat-value green">' + active.length + '</div></div>' +
          '<div class="stat"><div class="stat-label">Total Providers</div><div class="stat-value blue">' + providers.length + '</div></div>' +
          '<div class="stat"><div class="stat-label">Code Executions</div><div class="stat-value orange">' + totalExecs + '</div></div>' +
          '<div class="stat"><div class="stat-label">Monthly Cost</div><div class="stat-value purple">$0</div></div>';

        document.getElementById('providers').innerHTML = providers.map(p =>
          '<div class="provider">' +
            '<div class="provider-left">' +
              '<div class="provider-dot ' + p.status + '"></div>' +
              '<div><div class="provider-name">' + p.name + '</div>' +
              '<div class="provider-model">' + (p.models[0] || 'N/A') + '</div></div>' +
            '</div>' +
            '<div class="provider-right">' +
              '<span class="provider-status ' + p.status + '">' + p.status + '</span>' +
            '</div>' +
          '</div>'
        ).join('');

        // Quality table
        const entries = Object.entries(quality).filter(([, q]) => q.requests > 0);
        if (entries.length === 0) {
          document.getElementById('quality-content').innerHTML =
            '<p class="quality-empty">No execution data yet. Add <code style="color:#3b82f6">execute:true</code> to a request to start tracking.</p>';
        } else {
          const rows = entries
            .sort(([, a], [, b]) => (b.pass_rate || 0) - (a.pass_rate || 0))
            .map(([name, q]) => {
              const pr = q.pass_rate;
              const tier = pr === null ? 'none' : pr >= 80 ? 'high' : pr >= 50 ? 'mid' : 'low';
              const label = pr === null ? 'no data' : pr + '%';
              const barW = pr === null ? 0 : pr;
              return '<tr>' +
                '<td>' + name + '</td>' +
                '<td>' + q.requests + '</td>' +
                '<td>' + q.executions + '</td>' +
                '<td>' +
                  '<span class="pass-badge ' + tier + '">' + label + '</span>' +
                  (pr !== null ? '<span class="bar-track"><span class="bar-fill ' + tier + '" style="width:' + barW + '%"></span></span>' : '') +
                '</td>' +
              '</tr>';
            }).join('');
          document.getElementById('quality-content').innerHTML =
            '<table class="quality-table">' +
              '<thead><tr><th>Provider</th><th>Requests</th><th>Executed</th><th>Pass Rate</th></tr></thead>' +
              '<tbody>' + rows + '</tbody>' +
            '</table>';
        }
      } catch (e) { console.error('Dashboard refresh failed:', e); }
    }
    refresh();
    setInterval(refresh, 5000);
  </script>
</body>
</html>`;

server.listen(PORT, () => {
  console.log(`[Dashboard] Running at http://localhost:${PORT}`);
});

module.exports = { server };
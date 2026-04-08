const baseUrlRaw = process.env.MONITOR_BASE_URL;
const monitorCheckSync = (process.env.MONITOR_CHECK_SYNC || "true").toLowerCase() !== "false";
const maxSyncHours = Number(process.env.MONITOR_MAX_SYNC_HOURS || "36");
const bridgeApiKey = process.env.BRIDGE_API_KEY_MONITOR || "";

if (!baseUrlRaw) {
  throw new Error("MONITOR_BASE_URL is required");
}

const baseUrl = baseUrlRaw.replace(/\/$/, "");
const healthUrl = `${baseUrl}/api/health`;
const syncInfoUrl = `${baseUrl}/sync-info`;

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(30000),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_err) {
    // keep json = null
  }
  return { response, json, text };
}

async function run() {
  console.log(`[Monitor] Checking health endpoint: ${healthUrl}`);
  const health = await fetchJson(healthUrl);
  if (!health.response.ok) {
    throw new Error(`Healthcheck failed with status ${health.response.status}: ${health.text.slice(0, 200)}`);
  }
  if (!health.json || health.json.status !== "ok") {
    throw new Error(`Health payload unexpected: ${health.text.slice(0, 200)}`);
  }
  console.log("[Monitor] Health endpoint OK");

  if (!monitorCheckSync) {
    console.log("[Monitor] Sync freshness check disabled");
    return;
  }

  if (!bridgeApiKey) {
    throw new Error("BRIDGE_API_KEY_MONITOR is required when MONITOR_CHECK_SYNC=true");
  }

  console.log(`[Monitor] Checking sync freshness: ${syncInfoUrl}`);
  const sync = await fetchJson(syncInfoUrl, {
    headers: {
      "X-Bridge-Api-Key": bridgeApiKey,
    },
  });
  if (!sync.response.ok) {
    throw new Error(`Sync-info failed with status ${sync.response.status}: ${sync.text.slice(0, 200)}`);
  }

  const payload = sync.json || {};
  const candidates = [
    parseDate(payload.ultima_fecha_ajustes),
    parseDate(payload.ultima_fecha_ventas),
    parseDate(payload.ultima_sync_costos),
  ].filter(Boolean);

  if (!candidates.length) {
    throw new Error(`No sync timestamps available in payload: ${JSON.stringify(payload).slice(0, 300)}`);
  }

  const latest = candidates.sort((a, b) => b.getTime() - a.getTime())[0];
  const lagHours = (Date.now() - latest.getTime()) / (1000 * 60 * 60);

  console.log(`[Monitor] Latest sync timestamp: ${latest.toISOString()} (lag ${lagHours.toFixed(2)}h)`);
  if (lagHours > maxSyncHours) {
    throw new Error(`Sync freshness exceeded threshold: ${lagHours.toFixed(2)}h > ${maxSyncHours}h`);
  }

  console.log("[Monitor] Sync freshness OK");
}

run().catch((error) => {
  console.error(`[Monitor] FAILED: ${error.message}`);
  process.exit(1);
});

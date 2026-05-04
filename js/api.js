"use strict";

const JSONBIN_BASE = "https://api.jsonbin.io/v3";
const CACHE_KEY_CONFIG = "wc_cache_config";
const CACHE_KEY_SEASON = "wc_cache_season";
const CACHE_TTL = 5 * 60 * 1000;

let cachedSeasonData = null;
let cachedConfigData = null;
let activeRequests = 0;

function showLoadingBar() {
  activeRequests++;
  if (activeRequests === 1) {
    let bar = document.getElementById("loading-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "loading-bar";
      bar.className = "loading-bar";
      document.body.appendChild(bar);
    }
    bar.style.display = "block";
  }
}

function hideLoadingBar() {
  activeRequests = Math.max(0, activeRequests - 1);
  if (activeRequests === 0) {
    const bar = document.getElementById("loading-bar");
    if (bar) bar.style.display = "none";
  }
}

function setConfigBinId(id) {
  localStorage.setItem("wc_config_bin", id);
}

function getConfigBinId() {
  return localStorage.getItem("wc_config_bin");
}

function readLocalCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    return { data, stale: Date.now() - ts > CACHE_TTL };
  } catch {
    return null;
  }
}

function writeLocalCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    /* storage full — not critical */
  }
}

async function fetchBin(binId) {
  showLoadingBar();
  try {
    const res = await fetch(`${JSONBIN_BASE}/b/${binId}/latest`);
    if (!res.ok) throw new Error(`Failed to fetch bin ${binId}: ${res.status}`);
    const json = await res.json();
    return json.record;
  } finally {
    hideLoadingBar();
  }
}

async function updateBin(binId, data, apiKey) {
  showLoadingBar();
  try {
    const res = await fetch(`${JSONBIN_BASE}/b/${binId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": apiKey,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update bin ${binId}: ${res.status}`);
    return res.json();
  } finally {
    hideLoadingBar();
  }
}

async function createBin(data, apiKey, name) {
  showLoadingBar();
  try {
    const headers = {
      "Content-Type": "application/json",
      "X-Master-Key": apiKey,
      "X-Bin-Private": "false",
    };
    if (name) headers["X-Bin-Name"] = name;

    const res = await fetch(`${JSONBIN_BASE}/b`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create bin: ${res.status}`);
    const json = await res.json();
    return json.metadata.id;
  } finally {
    hideLoadingBar();
  }
}

async function loadConfig(forceRefresh = false) {
  const configBinId = getConfigBinId();
  if (!configBinId) throw new Error("Config bin ID not set. Check Admin setup.");

  if (cachedConfigData && !forceRefresh) return cachedConfigData;

  const local = readLocalCache(CACHE_KEY_CONFIG);
  if (local && !forceRefresh) {
    cachedConfigData = local.data;
    if (local.stale) {
      fetchBin(configBinId).then((fresh) => {
        cachedConfigData = fresh;
        writeLocalCache(CACHE_KEY_CONFIG, fresh);
      }).catch(() => {});
    }
    return cachedConfigData;
  }

  cachedConfigData = await fetchBin(configBinId);
  writeLocalCache(CACHE_KEY_CONFIG, cachedConfigData);
  return cachedConfigData;
}

async function loadSeason(forceRefresh = false) {
  if (cachedSeasonData && !forceRefresh) return cachedSeasonData;

  const local = readLocalCache(CACHE_KEY_SEASON);
  if (local && !forceRefresh) {
    cachedSeasonData = local.data;
    if (local.stale) {
      refreshSeasonInBackground();
    }
    return cachedSeasonData;
  }

  const config = await loadConfig();
  const activeSeason = config.seasons.find((s) => s.id === config.active_season);
  if (!activeSeason) throw new Error("No active season found.");
  cachedSeasonData = await fetchBin(activeSeason.bin_id);
  writeLocalCache(CACHE_KEY_SEASON, cachedSeasonData);
  return cachedSeasonData;
}

function refreshSeasonInBackground() {
  loadConfig(true).then((config) => {
    const activeSeason = config.seasons.find((s) => s.id === config.active_season);
    if (!activeSeason) return;
    return fetchBin(activeSeason.bin_id).then((fresh) => {
      cachedSeasonData = fresh;
      writeLocalCache(CACHE_KEY_SEASON, fresh);
    });
  }).catch(() => {});
}

function invalidateCache() {
  cachedSeasonData = null;
  cachedConfigData = null;
  localStorage.removeItem(CACHE_KEY_CONFIG);
  localStorage.removeItem(CACHE_KEY_SEASON);
}

async function saveSeasonData(data, apiKey) {
  const config = await loadConfig();
  const activeSeason = config.seasons.find((s) => s.id === config.active_season);
  if (!activeSeason) throw new Error("No active season found.");
  await updateBin(activeSeason.bin_id, data, apiKey);
  cachedSeasonData = data;
  writeLocalCache(CACHE_KEY_SEASON, data);
}

async function saveConfigData(data, apiKey) {
  const configBinId = getConfigBinId();
  await updateBin(configBinId, data, apiKey);
  cachedConfigData = data;
  writeLocalCache(CACHE_KEY_CONFIG, data);
}

export {
  loadConfig,
  loadSeason,
  saveSeasonData,
  saveConfigData,
  createBin,
  invalidateCache,
  setConfigBinId,
  getConfigBinId,
};

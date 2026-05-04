"use strict";

import { GIST_ID } from "./config.js";

const GITHUB_API = "https://api.github.com";
const CACHE_KEY_GIST = "wc_cache_gist";
const CACHE_TTL = 5 * 60 * 1000;
const CONFIG_FILE = "config.json";

let cachedGist = null;
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

async function fetchGist(token) {
  showLoadingBar();
  try {
    const headers = { Accept: "application/vnd.github.v3+json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${GITHUB_API}/gists/${GIST_ID}`, { headers });
    if (!res.ok) throw new Error(`Failed to fetch gist: ${res.status}`);
    return res.json();
  } finally {
    hideLoadingBar();
  }
}

async function updateGistFiles(files, token) {
  showLoadingBar();
  try {
    const res = await fetch(`${GITHUB_API}/gists/${GIST_ID}`, {
      method: "PATCH",
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files }),
    });
    if (!res.ok) throw new Error(`Failed to update gist: ${res.status}`);
    return res.json();
  } finally {
    hideLoadingBar();
  }
}

function parseGistFile(gist, filename) {
  const file = gist.files[filename];
  if (!file) return null;
  return JSON.parse(file.content);
}

function seasonFileName(seasonId) {
  return `season_${seasonId}.json`;
}

async function loadGist(forceRefresh = false) {
  if (cachedGist && !forceRefresh) return cachedGist;

  const local = readLocalCache(CACHE_KEY_GIST);
  if (local && !forceRefresh) {
    cachedGist = local.data;
    if (local.stale) {
      fetchGist().then((fresh) => {
        cachedGist = fresh;
        writeLocalCache(CACHE_KEY_GIST, fresh);
      }).catch(() => {});
    }
    return cachedGist;
  }

  cachedGist = await fetchGist();
  writeLocalCache(CACHE_KEY_GIST, cachedGist);
  return cachedGist;
}

async function loadConfig(forceRefresh = false) {
  if (cachedConfigData && !forceRefresh) return cachedConfigData;
  const gist = await loadGist(forceRefresh);
  cachedConfigData = parseGistFile(gist, CONFIG_FILE);
  if (!cachedConfigData) throw new Error("Config file not found in gist.");
  return cachedConfigData;
}

async function loadSeason(forceRefresh = false) {
  if (cachedSeasonData && !forceRefresh) return cachedSeasonData;

  const config = await loadConfig(forceRefresh);
  const activeSeason = config.seasons.find((s) => s.id === config.active_season);
  if (!activeSeason) throw new Error("No active season found.");

  const gist = await loadGist();
  cachedSeasonData = parseGistFile(gist, seasonFileName(activeSeason.id));
  if (!cachedSeasonData) throw new Error("Season data not found in gist.");
  return cachedSeasonData;
}

function invalidateCache() {
  cachedGist = null;
  cachedSeasonData = null;
  cachedConfigData = null;
  localStorage.removeItem(CACHE_KEY_GIST);
}

async function saveSeasonData(data, token) {
  const config = await loadConfig();
  const activeSeason = config.seasons.find((s) => s.id === config.active_season);
  if (!activeSeason) throw new Error("No active season found.");

  const files = { [seasonFileName(activeSeason.id)]: { content: JSON.stringify(data, null, 2) } };
  cachedGist = await updateGistFiles(files, token);
  writeLocalCache(CACHE_KEY_GIST, cachedGist);
  cachedSeasonData = data;
}

async function saveConfigData(data, token) {
  const files = { [CONFIG_FILE]: { content: JSON.stringify(data, null, 2) } };
  cachedGist = await updateGistFiles(files, token);
  writeLocalCache(CACHE_KEY_GIST, cachedGist);
  cachedConfigData = data;
}

async function createSeasonFile(seasonId, data, token) {
  const files = { [seasonFileName(seasonId)]: { content: JSON.stringify(data, null, 2) } };
  cachedGist = await updateGistFiles(files, token);
  writeLocalCache(CACHE_KEY_GIST, cachedGist);
}

export {
  loadConfig,
  loadSeason,
  saveSeasonData,
  saveConfigData,
  createSeasonFile,
  invalidateCache,
};

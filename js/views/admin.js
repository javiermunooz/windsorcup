"use strict";

import {
  loadConfig,
  loadSeason,
  saveSeasonData,
  saveConfigData,
  createSeasonFile,
  invalidateCache,
} from "../api.js";
import {
  authenticate,
  getApiKey,
  getAccessLevel,
  ACCESS_LEVEL,
} from "../auth.js";
import {
  showToast,
  escapeHtml,
  playerName,
  formatScore,
  generateRoundRobin,
  lockSvg,
  countryFlag,
} from "../utils.js";
import { forceRefresh } from "../router.js";

let activeTab = "seasons";

async function render() {
  if (getAccessLevel() < ACCESS_LEVEL.ADMIN) {
    return `
      <h1 class="mb-2">Admin</h1>
      <div class="gate">
        <div class="gate__icon">${lockSvg()}</div>
        <p class="text-secondary">Enter the admin passphrase.</p>
        <div class="gate__form">
          <input type="password" class="form-input" id="admin-passphrase" placeholder="Admin passphrase">
          <button class="btn btn--primary" id="admin-unlock">Unlock</button>
        </div>
      </div>`;
  }

  const config = await loadConfig();
  const hasActiveSeason = !!config.active_season;
  let seasonData = null;
  if (hasActiveSeason) {
    try {
      seasonData = await loadSeason();
    } catch {
      /* no season data yet */
    }
  }

  return `
    <h1 class="mb-2">Admin</h1>
    <div class="card">
      <div class="tabs">
        <button class="tab ${activeTab === "seasons" ? "tab--active" : ""}" data-tab="seasons">Seasons</button>
        <button class="tab ${activeTab === "players" ? "tab--active" : ""}" data-tab="players" ${!hasActiveSeason ? "disabled" : ""}>Players</button>
        <button class="tab ${activeTab === "results" ? "tab--active" : ""}" data-tab="results" ${!hasActiveSeason ? "disabled" : ""}>Results</button>
      </div>
      <div id="admin-tab-content">
        ${renderTabContent(activeTab, config, seasonData)}
      </div>
    </div>`;
}

function renderTabContent(tab, config, seasonData) {
  if (tab === "seasons") return renderSeasonsTab(config);
  if (tab === "players") return renderPlayersTab(config, seasonData);
  if (tab === "results") return renderResultsTab(seasonData);
  return "";
}

function renderSeasonsTab(config) {
  const seasonList = config.seasons
    .map(
      (s) => `
      <div class="flex justify-between items-center" style="padding:0.5rem 0;border-bottom:1px solid var(--color-border)">
        <div>
          <strong>${escapeHtml(s.name)}</strong>
          <span class="badge ${s.status === "in_progress" ? "badge--win" : "badge--wo"}" style="margin-left:0.5rem">${s.status}</span>
        </div>
        ${s.status === "in_progress" ? `<button class="btn btn--danger btn--small" data-action="close-season" data-id="${s.id}">Close</button>` : ""}
      </div>`
    )
    .join("");

  return `
    <h3 class="mb-1">Existing Seasons</h3>
    ${seasonList || '<p class="text-secondary">No seasons yet.</p>'}
    <hr style="border-color:var(--color-border);margin:1.25rem 0">
    <h3 class="mb-1">Create Season</h3>
    <form id="create-season-form" class="flex flex-col gap-1">
      <div class="form-group">
        <label class="form-label" for="season-name">Season Name</label>
        <input class="form-input" id="season-name" placeholder="e.g. Season 2" required>
      </div>
      <div class="form-group">
        <label class="form-label" for="season-players">Players (one per line: Name, Country Code)</label>
        <textarea class="form-input" id="season-players" rows="6" placeholder="Javier, ES&#10;John, GB&#10;Pierre, FR&#10;..." required style="resize:vertical"></textarea>
      </div>
      <div class="flex gap-1">
        <div class="form-group" style="flex:1">
          <label class="form-label" for="season-rounds">Rounds</label>
          <select class="form-input" id="season-rounds">
            <option value="1">1 (play each opponent once)</option>
            <option value="2">2 (play each opponent twice)</option>
          </select>
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label" for="season-sets">Match Format</label>
          <select class="form-input" id="season-sets">
            <option value="1">Best of 1</option>
            <option value="3" selected>Best of 3</option>
            <option value="5">Best of 5</option>
          </select>
        </div>
      </div>
      <button type="submit" class="btn btn--primary mt-1">Create Season</button>
    </form>`;
}

function renderPlayersTab(config, seasonData) {
  if (!seasonData) return `<p class="text-secondary">No active season.</p>`;

  const hasMatches = seasonData.matches.length > 0;
  const playerList = seasonData.players
    .map(
      (p) => `
      <div class="flex justify-between items-center" style="padding:0.375rem 0;border-bottom:1px solid var(--color-border)">
        <span>${countryFlag(p.country)} ${escapeHtml(p.name)}</span>
        <div class="flex gap-1 items-center">
          <input class="form-input" data-action="set-country" data-id="${p.id}" value="${escapeHtml(p.country || "")}" placeholder="CC" maxlength="2" style="width:4rem;text-transform:uppercase;padding:0.25rem 0.5rem;font-size:0.8rem">
          ${!hasMatches ? `<button class="btn btn--danger btn--small" data-action="remove-player" data-id="${p.id}">Remove</button>` : ""}
        </div>
      </div>`
    )
    .join("");

  return `
    <h3 class="mb-1">Players</h3>
    ${hasMatches ? '<p class="text-secondary mb-1" style="font-size:0.8rem">Players cannot be modified after matches have been played.</p>' : ""}
    ${playerList}
    <button class="btn btn--primary mt-2" id="save-countries">Save Countries</button>
    ${
      !hasMatches
        ? `
      <form id="add-player-form" class="flex gap-1 mt-2">
        <input class="form-input" id="new-player-name" placeholder="Player name" required style="flex:1">
        <input class="form-input" id="new-player-country" placeholder="CC" maxlength="2" style="width:4rem;text-transform:uppercase">
        <button type="submit" class="btn btn--primary">Add</button>
      </form>`
        : ""
    }`;
}

function renderResultsTab(seasonData) {
  if (!seasonData) return `<p class="text-secondary">No active season.</p>`;
  if (seasonData.matches.length === 0) {
    return `<p class="text-secondary">No results yet.</p>`;
  }

  const rows = seasonData.matches
    .map((m) => {
      const p1 = playerName(seasonData.players, m.player1);
      const p2 = playerName(seasonData.players, m.player2);
      const winnerName = playerName(seasonData.players, m.winner);
      return `
        <div class="flex justify-between items-center" style="padding:0.5rem 0;border-bottom:1px solid var(--color-border)">
          <div>
            <strong>${escapeHtml(p1)}</strong> vs <strong>${escapeHtml(p2)}</strong>
            <span class="score" style="margin-left:0.75rem">${formatScore(m)}</span>
          </div>
          <div class="flex gap-1">
            <button class="btn btn--secondary btn--small" data-action="edit-result" data-id="${m.id}">Edit</button>
            <button class="btn btn--danger btn--small" data-action="delete-result" data-id="${m.id}">Delete</button>
          </div>
        </div>`;
    })
    .join("");

  return `
    <h3 class="mb-1">Submitted Results</h3>
    ${rows}`;
}

function bindEvents() {
  const passphraseInput = document.getElementById("admin-passphrase");
  const unlockBtn = document.getElementById("admin-unlock");

  if (passphraseInput && unlockBtn) {
    async function doUnlock() {
      try {
        await authenticate(passphraseInput.value);
        if (getAccessLevel() < ACCESS_LEVEL.ADMIN) {
          showToast("This passphrase does not have admin access.", "error");
          return;
        }
        forceRefresh();
      } catch {
        showToast("Invalid passphrase.", "error");
      }
    }
    unlockBtn.addEventListener("click", doUnlock);
    passphraseInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doUnlock();
    });
    return;
  }

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.disabled) return;
      activeTab = tab.dataset.tab;
      forceRefresh();
    });
  });

  const createForm = document.getElementById("create-season-form");
  if (createForm) {
    createForm.addEventListener("submit", handleCreateSeason);
  }

  const addPlayerForm = document.getElementById("add-player-form");
  if (addPlayerForm) {
    addPlayerForm.addEventListener("submit", handleAddPlayer);
  }

  const saveCountriesBtn = document.getElementById("save-countries");
  if (saveCountriesBtn) {
    saveCountriesBtn.addEventListener("click", handleSaveCountries);
  }

  document.querySelectorAll("[data-action]").forEach((el) => {
    const action = el.dataset.action;
    const id = el.dataset.id;
    if (action === "close-season") el.addEventListener("click", () => handleCloseSeason(id));
    if (action === "remove-player") el.addEventListener("click", () => handleRemovePlayer(id));
    if (action === "delete-result") el.addEventListener("click", () => handleDeleteResult(id));
    if (action === "edit-result") el.addEventListener("click", () => handleEditResult(id));
  });
}

async function handleCreateSeason(e) {
  e.preventDefault();
  const name = document.getElementById("season-name").value.trim();
  const playersRaw = document.getElementById("season-players").value.trim();

  if (!name) return;
  const lines = playersRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    showToast("At least 2 players are required.", "error");
    return;
  }

  const players = lines.map((line, i) => {
    const parts = line.split(",").map((s) => s.trim());
    const pName = parts[0];
    const country = (parts[1] || "").toUpperCase().slice(0, 2);
    return { id: `p${i + 1}`, name: pName, country };
  });

  const rounds = parseInt(document.getElementById("season-rounds").value) || 1;
  const sets = parseInt(document.getElementById("season-sets").value) || 3;
  const schedule = generateRoundRobin(players.map((p) => p.id), rounds);
  const seasonId = `${new Date().getFullYear()}-S${Date.now().toString(36)}`;

  const seasonData = {
    season: {
      id: seasonId,
      name,
      start_date: new Date().toISOString().slice(0, 10),
      status: "in_progress",
      rounds,
      sets,
    },
    players,
    schedule,
    matches: [],
  };

  try {
    const apiKey = getApiKey();
    await createSeasonFile(seasonId, seasonData, apiKey);

    const config = await loadConfig(true);
    config.seasons.push({ id: seasonId, name, status: "in_progress" });
    config.active_season = seasonId;
    await saveConfigData(config, apiKey);

    showToast(`Season "${name}" created!`);
    forceRefresh();
  } catch (err) {
    showToast("Failed to create season: " + err.message, "error");
  }
}

async function handleCloseSeason(seasonId) {
  if (!confirm("Close this season? Results will be frozen.")) return;

  try {
    const apiKey = getApiKey();
    const data = await loadSeason(true);
    data.season.status = "completed";
    await saveSeasonData(data, apiKey);

    const config = await loadConfig(true);
    const season = config.seasons.find((s) => s.id === seasonId);
    if (season) season.status = "completed";
    config.active_season = null;
    await saveConfigData(config, apiKey);

    showToast("Season closed.");
    forceRefresh();
  } catch (err) {
    showToast("Failed to close season: " + err.message, "error");
  }
}

async function handleAddPlayer(e) {
  e.preventDefault();
  const name = document.getElementById("new-player-name").value.trim();
  const country = (document.getElementById("new-player-country")?.value || "").trim().toUpperCase().slice(0, 2);
  if (!name) return;

  try {
    const apiKey = getApiKey();
    const data = await loadSeason(true);

    if (data.matches.length > 0) {
      showToast("Cannot add players after matches have been played.", "error");
      return;
    }

    const maxId = data.players.reduce(
      (max, p) => Math.max(max, parseInt(p.id.slice(1)) || 0),
      0
    );
    data.players.push({ id: `p${maxId + 1}`, name, country });
    data.schedule = generateRoundRobin(data.players.map((p) => p.id), data.season?.rounds || 1);

    await saveSeasonData(data, apiKey);
    showToast(`Added ${name}.`);
    forceRefresh();
  } catch (err) {
    showToast("Failed to add player: " + err.message, "error");
  }
}

async function handleRemovePlayer(playerId) {
  try {
    const apiKey = getApiKey();
    const data = await loadSeason(true);

    if (data.matches.length > 0) {
      showToast("Cannot remove players after matches have been played.", "error");
      return;
    }

    const player = data.players.find((p) => p.id === playerId);
    if (!confirm(`Remove ${player?.name ?? playerId}?`)) return;

    data.players = data.players.filter((p) => p.id !== playerId);
    data.schedule = generateRoundRobin(data.players.map((p) => p.id), data.season?.rounds || 1);

    await saveSeasonData(data, apiKey);
    showToast("Player removed.");
    forceRefresh();
  } catch (err) {
    showToast("Failed to remove player: " + err.message, "error");
  }
}

async function handleDeleteResult(matchId) {
  if (!confirm("Delete this result? The match will revert to unplayed.")) return;

  try {
    const apiKey = getApiKey();
    const data = await loadSeason(true);
    data.matches = data.matches.filter((m) => m.id !== matchId);

    await saveSeasonData(data, apiKey);
    showToast("Result deleted.");
    forceRefresh();
  } catch (err) {
    showToast("Failed to delete result: " + err.message, "error");
  }
}

async function handleEditResult(matchId) {
  showToast("Edit: delete the result and re-submit it via the Schedule page.", "success");
}

async function handleSaveCountries() {
  const inputs = document.querySelectorAll("[data-action='set-country']");
  try {
    const apiKey = getApiKey();
    const data = await loadSeason(true);
    inputs.forEach((input) => {
      const player = data.players.find((p) => p.id === input.dataset.id);
      if (player) player.country = input.value.trim().toUpperCase().slice(0, 2);
    });
    await saveSeasonData(data, apiKey);
    showToast("Countries saved.");
    forceRefresh();
  } catch (err) {
    showToast("Failed to save countries: " + err.message, "error");
  }
}

render.afterRender = bindEvents;

export default render;

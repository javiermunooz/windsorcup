"use strict";

import { loadConfig, loadSeason } from "../api.js";
import { GIST_ID } from "../config.js";
import { computeStats, setPct, gamePct } from "../ranking.js";
import { formatScore, playerName, countryFlag } from "../utils.js";

function seasonFileName(seasonId) {
  return `season_${seasonId}.json`;
}

let cachedGistData = null;

async function getGistData() {
  if (cachedGistData) return cachedGistData;
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) throw new Error("Failed to fetch gist");
  cachedGistData = await res.json();
  return cachedGistData;
}

function parseSeasonFromGist(gist, seasonId) {
  const file = gist.files[seasonFileName(seasonId)];
  if (!file) return null;
  return JSON.parse(file.content);
}

function pct(val) {
  return val === 0 ? "0%" : (val * 100).toFixed(1) + "%";
}

function streakText(matches, playerId) {
  let streak = 0;
  let type = null;

  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    if (m.player1 !== playerId && m.player2 !== playerId) continue;
    const won = m.winner === playerId;
    if (type === null) type = won;
    if (won === type) streak++;
    else break;
  }

  if (streak === 0) return { text: "—", cls: "text-secondary" };
  if (type) return { text: `${streak}W`, cls: "text-success" };
  return { text: `${streak}L`, cls: "text-danger" };
}

async function render(params) {
  const playerId = params[0];
  if (!playerId) return `<p class="text-secondary text-center mt-3">No player selected.</p>`;

  const config = await loadConfig();
  const allSeasonStats = [];
  let playerNameStr = null;
  let playerCountryCode = "";

  const gist = await getGistData();

  for (const season of config.seasons) {
    let seasonData;
    try {
      if (season.id === config.active_season) {
        seasonData = await loadSeason();
      } else {
        seasonData = parseSeasonFromGist(gist, season.id);
      }
    } catch {
      continue;
    }
    if (!seasonData) continue;

    const player = seasonData.players.find((p) => p.id === playerId);
    if (!player) continue;

    if (!playerNameStr) {
      playerNameStr = player.name;
      playerCountryCode = player.country || "";
    }

    const stats = computeStats(seasonData.players, seasonData.matches);
    const s = stats[playerId];
    if (s) {
      allSeasonStats.push({
        seasonName: season.name || season.id,
        seasonId: season.id,
        status: season.status,
        ...s,
        setPct: setPct(s),
        gamePct: gamePct(s),
        matches: seasonData.matches.filter(
          (m) => m.player1 === playerId || m.player2 === playerId
        ),
        players: seasonData.players,
      });
    }
  }

  if (!playerNameStr) {
    return `<p class="text-secondary text-center mt-3">Player not found.</p>`;
  }

  const totals = allSeasonStats.reduce(
    (acc, s) => {
      acc.played += s.played;
      acc.wins += s.wins;
      acc.losses += s.losses;
      acc.setsWon += s.setsWon;
      acc.setsLost += s.setsLost;
      acc.gamesWon += s.gamesWon;
      acc.gamesLost += s.gamesLost;
      return acc;
    },
    { played: 0, wins: 0, losses: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0 }
  );

  const totalSetPct = totals.setsWon + totals.setsLost > 0 ? totals.setsWon / (totals.setsWon + totals.setsLost) : 0;
  const totalGamePct = totals.gamesWon + totals.gamesLost > 0 ? totals.gamesWon / (totals.gamesWon + totals.gamesLost) : 0;
  const winRate = totals.played > 0 ? totals.wins / totals.played : 0;

  const currentSeason = allSeasonStats.find((s) => s.status === "in_progress");
  const streak = currentSeason ? streakText(currentSeason.matches, playerId) : { text: "—", cls: "text-secondary" };

  const seasonRows = allSeasonStats
    .map(
      (s) => `
      <tr>
        <td><strong>${s.seasonName}</strong></td>
        <td class="num">${s.played}</td>
        <td class="num text-success">${s.wins}</td>
        <td class="num text-danger">${s.losses}</td>
        <td class="num">${pct(s.setPct)}</td>
        <td class="num">${pct(s.gamePct)}</td>
      </tr>`
    )
    .join("");

  const recentMatches = currentSeason
    ? currentSeason.matches
        .slice(-5)
        .reverse()
        .map((m) => {
          const opponentId = m.player1 === playerId ? m.player2 : m.player1;
          const opponentName = playerName(currentSeason.players, opponentId);
          const won = m.winner === playerId;
          return `
            <div class="profile-match">
              <span class="badge ${won ? "badge--win" : "badge--loss"}">${won ? "W" : "L"}</span>
              <a href="#player/${opponentId}" class="player-link">vs ${opponentName}</a>
              <span class="score">${formatScore(m)}</span>
            </div>`;
        })
        .join("")
    : "";

  return `
    <a href="#standings" class="profile-back">&larr; Back to Standings</a>

    <div class="profile-header">
      <div class="profile-avatar">${playerNameStr.charAt(0).toUpperCase()}</div>
      <div class="profile-header__info">
        <h1 class="profile-name">${countryFlag(playerCountryCode)} ${playerNameStr}</h1>
        <span class="profile-seasons">${allSeasonStats.length} season${allSeasonStats.length !== 1 ? "s" : ""}</span>
      </div>
    </div>

    <div class="profile-stats">
      <div class="profile-stat">
        <span class="profile-stat__value">${totals.played}</span>
        <span class="profile-stat__label">Played</span>
      </div>
      <div class="profile-stat">
        <span class="profile-stat__value text-success">${totals.wins}</span>
        <span class="profile-stat__label">Wins</span>
      </div>
      <div class="profile-stat">
        <span class="profile-stat__value text-danger">${totals.losses}</span>
        <span class="profile-stat__label">Losses</span>
      </div>
      <div class="profile-stat">
        <span class="profile-stat__value text-primary">${pct(winRate)}</span>
        <span class="profile-stat__label">Win Rate</span>
      </div>
      <div class="profile-stat">
        <span class="profile-stat__value">${pct(totalSetPct)}</span>
        <span class="profile-stat__label">Set %</span>
      </div>
      <div class="profile-stat">
        <span class="profile-stat__value">${pct(totalGamePct)}</span>
        <span class="profile-stat__label">Game %</span>
      </div>
      <div class="profile-stat">
        <span class="profile-stat__value ${streak.cls}">${streak.text}</span>
        <span class="profile-stat__label">Streak</span>
      </div>
    </div>

    ${
      recentMatches
        ? `
      <div class="card mt-2">
        <h3 class="mb-1">Recent Matches</h3>
        <div class="profile-matches">${recentMatches}</div>
      </div>`
        : ""
    }

    <div class="card mt-2">
      <h3 class="mb-1">Season Breakdown</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Season</th>
              <th class="num">P</th>
              <th class="num">W</th>
              <th class="num">L</th>
              <th class="num">Set%</th>
              <th class="num">Game%</th>
            </tr>
          </thead>
          <tbody>
            ${seasonRows}
            <tr style="border-top:2px solid var(--color-primary)">
              <td><strong class="text-primary">All Time</strong></td>
              <td class="num"><strong>${totals.played}</strong></td>
              <td class="num text-success"><strong>${totals.wins}</strong></td>
              <td class="num text-danger"><strong>${totals.losses}</strong></td>
              <td class="num"><strong>${pct(totalSetPct)}</strong></td>
              <td class="num"><strong>${pct(totalGamePct)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

export default render;

"use strict";

import { loadSeason } from "../api.js";
import { rankPlayers } from "../ranking.js";
import { countryFlag, noSeasonHtml } from "../utils.js";

function rankClass(rank) {
  if (rank === 1) return "rank--1";
  if (rank <= 3) return "rank--top3";
  return "rank--rest";
}

function pctDisplay(val) {
  return val === 0 ? "—" : (val * 100).toFixed(1) + "%";
}

const DEADLINE = new Date("2026-07-01T00:00:00");
const BANNER_THRESHOLD_DAYS = 15;

function deadlineBanner(allMatchesPlayed) {
  if (allMatchesPlayed) return "";
  const now = new Date();
  const diff = DEADLINE - now;
  if (diff <= 0) return `<div class="deadline-banner deadline-banner--expired">Deadline has passed! All matches should be completed.</div>`;
  const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (daysLeft > BANNER_THRESHOLD_DAYS) return "";
  return `<div class="deadline-banner">${daysLeft} day${daysLeft !== 1 ? "s" : ""} left to complete all matches</div>`;
}

async function render() {
  let data;
  try { data = await loadSeason(); } catch { return noSeasonHtml(); }
  const ranked = rankPlayers(data.players, data.matches);
  const totalMatches = data.schedule.reduce((sum, r) => sum + r.pairings.length, 0);
  const playedMatches = data.matches.length;

  const rows = ranked
    .map(
      (s) => `
      <tr${s.rank === 1 ? ' class="leader-row"' : ""}>
        <td class="num"><span class="rank ${rankClass(s.rank)}">${s.rank}</span></td>
        <td><a href="#player/${s.id}" class="player-link"><strong>${countryFlag(s.country)} ${s.name}</strong></a></td>
        <td class="num">${s.played}</td>
        <td class="num text-success">${s.wins}</td>
        <td class="num text-danger">${s.losses}</td>
        <td class="num">${pctDisplay(s.setPct)}</td>
        <td class="num">${pctDisplay(s.gamePct)}</td>
      </tr>`
    )
    .join("");

  const allPlayed = playedMatches >= totalMatches;

  return `
    ${deadlineBanner(allPlayed)}
    <div class="flex justify-between items-center mb-2">
      <h1>Standings</h1>
      <span class="text-secondary" style="font-size:0.85rem">${playedMatches} of ${totalMatches} matches played</span>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="num">#</th>
              <th>Player</th>
              <th class="num">P</th>
              <th class="num">W</th>
              <th class="num">L</th>
              <th class="num"><span class="th-full">Set%</span><span class="th-short">S%</span></th>
              <th class="num"><span class="th-full">Game%</span><span class="th-short">G%</span></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
    <p class="text-secondary mt-1" style="font-size:0.75rem">
      Ranking: wins → head-to-head → set% → game%
    </p>`;
}

export default render;

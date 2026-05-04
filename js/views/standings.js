"use strict";

import { loadSeason } from "../api.js";
import { rankPlayers } from "../ranking.js";
import { countryFlag } from "../utils.js";

function rankClass(rank) {
  if (rank === 1) return "rank--1";
  if (rank <= 3) return "rank--top3";
  return "rank--rest";
}

function pctDisplay(val) {
  return val === 0 ? "—" : (val * 100).toFixed(1) + "%";
}

async function render() {
  const data = await loadSeason();
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

  return `
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
              <th class="num">Set%</th>
              <th class="num">Game%</th>
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

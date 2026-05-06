"use strict";

import { loadSeason } from "../api.js";
import { countryFlag, noSeasonHtml } from "../utils.js";

function findMatches(matches, p1, p2) {
  return matches.filter(
    (m) =>
      (m.player1 === p1 && m.player2 === p2) ||
      (m.player1 === p2 && m.player2 === p1)
  );
}

function cellContent(matchList, rowPlayerId) {
  if (matchList.length === 0) return `<span class="text-secondary">—</span>`;
  return matchList
    .map((m) => {
      const won = m.winner === rowPlayerId;
      return `<span class="${won ? "text-success" : "text-danger"}" style="font-weight:700">${won ? "W" : "L"}</span>`;
    })
    .join(" ");
}

async function render() {
  let data;
  try { data = await loadSeason(); } catch { return noSeasonHtml(); }
  const { players, matches } = data;

  const headerCells = players
    .map((p) => `<th><a href="#player/${p.id}" class="player-link">${countryFlag(p.country)} ${p.name.split(" ")[0]}</a></th>`)
    .join("");

  const rows = players
    .map((rowP) => {
      const cells = players
        .map((colP) => {
          if (rowP.id === colP.id) {
            return `<td class="matrix__self"></td>`;
          }
          const matchList = findMatches(matches, rowP.id, colP.id);
          return `<td>${cellContent(matchList, rowP.id)}</td>`;
        })
        .join("");

      return `<tr><th><a href="#player/${rowP.id}" class="player-link">${countryFlag(rowP.country)} ${rowP.name.split(" ")[0]}</a></th>${cells}</tr>`;
    })
    .join("");

  return `
    <h1 class="mb-2">Head to Head</h1>
    <div class="card">
      <div class="matrix-wrap">
        <table class="matrix">
          <thead><tr><th></th>${headerCells}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

export default render;

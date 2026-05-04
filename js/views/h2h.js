"use strict";

import { loadSeason } from "../api.js";
import { countryFlag } from "../utils.js";

function findMatch(matches, p1, p2) {
  return matches.find(
    (m) =>
      (m.player1 === p1 && m.player2 === p2) ||
      (m.player1 === p2 && m.player2 === p1)
  );
}

function cellContent(match, rowPlayerId) {
  if (!match) return `<span class="text-secondary">—</span>`;
  const won = match.winner === rowPlayerId;
  return `<span class="${won ? "text-success" : "text-danger"}" style="font-weight:700">${won ? "W" : "L"}</span>`;
}

async function render() {
  const data = await loadSeason();
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
          const match = findMatch(matches, rowP.id, colP.id);
          return `<td>${cellContent(match, rowP.id)}</td>`;
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

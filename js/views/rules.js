"use strict";

import { loadSeason } from "../api.js";

async function render() {
  let sets = 3;
  let rounds = 1;
  try {
    const data = await loadSeason();
    sets = data.season?.sets || 3;
    rounds = data.season?.rounds || 1;
  } catch {
    /* no active season — show defaults */
  }

  const roundsText = rounds === 1 ? "once" : "twice";
  const setsText = `Best of ${sets} set${sets !== 1 ? "s" : ""}`;
  const tiebreakHtml = sets > 1
    ? `<li>Deciding set is a <strong class="text-primary">10-point super tiebreak</strong> (first to 10, win by 2)</li>`
    : "";

  return `
    <h1 class="mb-2">Rules</h1>
    <div class="card rules">
      <div class="rules__section">
        <h3 class="rules__title">Format</h3>
        <ul class="rules__list">
          <li>Round-robin: everyone plays everyone ${roundsText}</li>
          <li>${setsText}</li>
          ${tiebreakHtml}
          <li>All matches must be completed by <strong>1 July 2026</strong></li>
        </ul>
      </div>

      <div class="rules__section">
        <h3 class="rules__title">Ranking</h3>
        <ol class="rules__list">
          <li>Most match wins</li>
          <li>Head-to-head record (if two players are tied)</li>
          <li>Highest set percentage</li>
          <li>Highest game percentage</li>
        </ol>
      </div>

      <div class="rules__section">
        <h3 class="rules__title">The Stakes</h3>
        <p>Once the league is over, we all go out for <strong>dinner and drinks</strong>.</p>
        <p class="rules__stake">Last place buys first place dinner.</p>
      </div>
    </div>`;
}

export default render;

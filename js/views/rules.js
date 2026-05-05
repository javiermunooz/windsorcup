"use strict";

async function render() {
  return `
    <h1 class="mb-2">Rules</h1>
    <div class="card rules">
      <div class="rules__section">
        <h3 class="rules__title">Format</h3>
        <ul class="rules__list">
          <li>Round-robin: everyone plays everyone once</li>
          <li>Best of 3 sets</li>
          <li>Third set is a <strong class="text-primary">10-point super tiebreak</strong> (first to 10, win by 2)</li>
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

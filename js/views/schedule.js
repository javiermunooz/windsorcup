"use strict";

import { loadSeason, saveSeasonData } from "../api.js";
import { authenticate, getApiKey, getAccessLevel, ACCESS_LEVEL } from "../auth.js";
import { formatScore, playerName, playerNameWithFlag, chevronSvg, showToast, lockSvg } from "../utils.js";
import { forceRefresh } from "../router.js";

function findMatchResult(matches, matchId) {
  return matches.find((m) => m.id === matchId);
}

function getCurrentRound(schedule, matches) {
  for (const round of schedule) {
    const allPlayed = round.pairings.every((p) =>
      matches.some((m) => m.id === p.match_id)
    );
    if (!allPlayed) return round.round;
  }
  return schedule.length;
}

let activeMatchId = null;
let activeP1 = null;
let activeP2 = null;
let activeP1Name = null;
let activeP2Name = null;

function buildScoreModal() {
  return `
    <div class="modal-overlay hidden" id="score-modal">
      <div class="modal score-modal">

        <div id="modal-gate" class="score-modal__body" style="text-align:center;padding:2rem 1.5rem">
          <div style="color:var(--color-text-secondary);margin-bottom:1rem">${lockSvg()}</div>
          <p class="text-secondary mb-1" style="font-size:0.85rem">Enter the match passphrase to submit results.</p>
          <div class="flex gap-1" style="max-width:280px;margin:0 auto">
            <input type="password" class="form-input" id="modal-passphrase" placeholder="Passphrase" style="flex:1">
            <button class="btn btn--primary" id="modal-unlock">Unlock</button>
          </div>
        </div>

        <form id="modal-form" class="hidden">
          <div class="score-modal__header">
            <span class="score-modal__player" id="modal-p1-name"></span>
            <span class="score-modal__vs">vs</span>
            <span class="score-modal__player" id="modal-p2-name"></span>
          </div>

          <div class="score-modal__body">
            <div id="modal-score-section">
              <div class="score-modal__set-label">Set 1</div>
              <div class="score-modal__set">
                <div class="score-modal__cell">
                  <input type="number" class="score-input" data-set="0" data-player="1" min="0" max="7" inputmode="numeric">
                </div>
                <span class="score-modal__dash">–</span>
                <div class="score-modal__cell">
                  <input type="number" class="score-input" data-set="0" data-player="2" min="0" max="7" inputmode="numeric">
                </div>
              </div>

              <div class="score-modal__set-label">Set 2</div>
              <div class="score-modal__set">
                <div class="score-modal__cell">
                  <input type="number" class="score-input" data-set="1" data-player="1" min="0" max="7" inputmode="numeric">
                </div>
                <span class="score-modal__dash">–</span>
                <div class="score-modal__cell">
                  <input type="number" class="score-input" data-set="1" data-player="2" min="0" max="7" inputmode="numeric">
                </div>
              </div>

              <div class="hidden" id="modal-set3">
                <div class="score-modal__set-label">Match Tiebreak</div>
                <div class="score-modal__set">
                  <div class="score-modal__cell">
                    <input type="number" class="score-input" data-set="2" data-player="1" min="0" max="99" inputmode="numeric">
                  </div>
                  <span class="score-modal__dash">–</span>
                  <div class="score-modal__cell">
                    <input type="number" class="score-input" data-set="2" data-player="2" min="0" max="99" inputmode="numeric">
                  </div>
                </div>
              </div>
            </div>

            <div id="modal-walkover-section" class="hidden" style="text-align:center;padding:1rem 0">
              <p class="text-secondary mb-1" style="font-size:0.85rem">Select the winner</p>
              <select class="form-select" id="modal-wo-winner" style="width:100%"></select>
            </div>
          </div>

          <div class="score-modal__footer">
            <label class="score-modal__walkover">
              <input type="checkbox" id="modal-walkover"> Walkover
            </label>
            <div class="flex gap-1">
              <button type="button" class="btn btn--secondary btn--small" id="modal-cancel">Cancel</button>
              <button type="submit" class="btn btn--primary btn--small" id="modal-submit">Submit</button>
            </div>
          </div>
        </form>
      </div>
    </div>`;
}

function validateSet(g1, g2) {
  if (g1 === g2) return "A set cannot end in a tie.";
  const high = Math.max(g1, g2);
  const low = Math.min(g1, g2);
  if (high < 6) return "A set must be won with at least 6 games.";
  if (high === 7 && low !== 5 && low !== 6) return "A 7-game set must be 7-5 or 7-6.";
  if (high > 7) return "A set cannot exceed 7 games.";
  if (high === 6 && low > 4) return "A 6-game set requires the loser to have at most 4 games.";
  return null;
}

function validateTiebreak(g1, g2) {
  if (g1 === g2) return "Tiebreak cannot end in a tie.";
  const high = Math.max(g1, g2);
  const low = Math.min(g1, g2);
  if (high < 10) return "Match tiebreak must be won with at least 10 points.";
  if (high - low < 2) return "Must win tiebreak by at least 2 points.";
  return null;
}

function validateScore(score) {
  for (let i = 0; i < Math.min(score.length, 2); i++) {
    const err = validateSet(score[i][0], score[i][1]);
    if (err) return `Set ${i + 1}: ${err}`;
  }

  if (score.length === 3) {
    const err = validateTiebreak(score[2][0], score[2][1]);
    if (err) return err;

    let s1 = 0, s2 = 0;
    for (let i = 0; i < 2; i++) {
      if (score[i][0] > score[i][1]) s1++;
      else s2++;
    }
    if (s1 === 2 || s2 === 2) return "Tiebreak should only be played if sets are 1-1.";
  }

  const winner = determineWinner(score);
  if (winner === 0) return "The match must have a winner.";

  return null;
}

function determineWinner(score) {
  let s1 = 0;
  let s2 = 0;
  for (const [g1, g2] of score) {
    if (g1 > g2) s1++;
    else s2++;
  }
  return s1 > s2 ? 1 : s2 > s1 ? 2 : 0;
}

async function render() {
  const data = await loadSeason();
  const currentRound = getCurrentRound(data.schedule, data.matches);
  const totalMatches = data.schedule.reduce((sum, r) => sum + r.pairings.length, 0);
  const playedMatches = data.matches.length;

  const rounds = data.schedule
    .map((round) => {
      const isOpen = round.round === currentRound;
      const matchRows = round.pairings
        .map((pairing) => {
          const result = findMatchResult(data.matches, pairing.match_id);
          const p1Display = playerNameWithFlag(data.players, pairing.player1);
          const p2Display = playerNameWithFlag(data.players, pairing.player2);

          if (result) {
            const p1Won = result.winner === pairing.player1;
            return `
              <div class="schedule-match">
                <a href="#player/${pairing.player1}" class="schedule-match__player player-link ${p1Won ? "schedule-match__winner" : ""}">${p1Display}</a>
                <div class="schedule-match__center"><span class="score">${formatScore(result)}</span></div>
                <a href="#player/${pairing.player2}" class="schedule-match__player player-link ${!p1Won ? "schedule-match__winner" : ""}">${p2Display}</a>
              </div>`;
          }

          return `
            <div class="schedule-match">
              <a href="#player/${pairing.player1}" class="schedule-match__player player-link">${p1Display}</a>
              <div class="schedule-match__center">
                <button class="btn btn--primary btn--small" data-add-result="${pairing.match_id}" data-p1="${pairing.player1}" data-p2="${pairing.player2}">Add Result</button>
              </div>
              <a href="#player/${pairing.player2}" class="schedule-match__player player-link">${p2Display}</a>
            </div>`;
        })
        .join("");

      return `
        <div class="accordion mb-1">
          <button class="accordion__header" aria-expanded="${isOpen}" onclick="this.setAttribute('aria-expanded', this.getAttribute('aria-expanded') === 'true' ? 'false' : 'true')">
            <span class="accordion__title">Round ${round.round}</span>
            ${chevronSvg()}
          </button>
          <div class="accordion__body">
            <div class="accordion__inner">
              <div class="schedule-matches">${matchRows}</div>
            </div>
          </div>
        </div>`;
    })
    .join("");

  return `
    <div class="flex justify-between items-center mb-2">
      <h1>Schedule</h1>
      <span class="text-secondary" style="font-size:0.85rem">${playedMatches} of ${totalMatches} matches played</span>
    </div>
    ${rounds}
    ${buildScoreModal()}`;
}

function openModal(matchId, p1Id, p2Id, players) {
  activeMatchId = matchId;
  activeP1 = p1Id;
  activeP2 = p2Id;
  activeP1Name = playerName(players, p1Id);
  activeP2Name = playerName(players, p2Id);

  const modal = document.getElementById("score-modal");
  const gate = document.getElementById("modal-gate");
  const form = document.getElementById("modal-form");

  document.getElementById("modal-p1-name").textContent = activeP1Name;
  document.getElementById("modal-p2-name").textContent = activeP2Name;

  const woWinner = document.getElementById("modal-wo-winner");
  woWinner.innerHTML = `
    <option value="${p1Id}">${activeP1Name}</option>
    <option value="${p2Id}">${activeP2Name}</option>`;

  if (getAccessLevel() >= ACCESS_LEVEL.PLAYER) {
    gate.classList.add("hidden");
    form.classList.remove("hidden");
  } else {
    gate.classList.remove("hidden");
    form.classList.add("hidden");
  }

  resetModalForm();
  modal.classList.remove("hidden");
}

function closeModal() {
  document.getElementById("score-modal").classList.add("hidden");
  activeMatchId = null;
}

function resetModalForm() {
  document.querySelectorAll("#modal-form .score-input").forEach((i) => {
    i.value = "";
    i.classList.remove("set-winner");
  });
  document.getElementById("modal-walkover").checked = false;
  document.getElementById("modal-walkover-section").classList.add("hidden");
  document.getElementById("modal-score-section").classList.remove("hidden");
  document.getElementById("modal-set3").classList.add("hidden");
  document.getElementById("modal-submit").disabled = false;
  document.getElementById("modal-submit").textContent = "Submit";
}

function getInputVal(set, player) {
  return parseInt(
    document.querySelector(`#modal-form .score-input[data-set="${set}"][data-player="${player}"]`)?.value
  ) || 0;
}

function updateSet3Visibility() {
  const s1w = getInputVal(0, 1) > getInputVal(0, 2) ? 1 : getInputVal(0, 2) > getInputVal(0, 1) ? 2 : 0;
  const s2w = getInputVal(1, 1) > getInputVal(1, 2) ? 1 : getInputVal(1, 2) > getInputVal(1, 1) ? 2 : 0;
  const needs3 = s1w !== 0 && s2w !== 0 && s1w !== s2w;
  document.getElementById("modal-set3").classList.toggle("hidden", !needs3);
}

function updateWinnerHighlights() {
  document.querySelectorAll("#modal-form .score-input").forEach((input) => {
    const set = input.dataset.set;
    const player = input.dataset.player;
    const otherPlayer = player === "1" ? "2" : "1";
    const myVal = parseInt(input.value) || 0;
    const otherVal = getInputVal(set, otherPlayer);
    input.classList.toggle("set-winner", myVal > 0 && myVal > otherVal);
  });
}

function parseModalScore() {
  const sets = [];
  const has3 = !document.getElementById("modal-set3").classList.contains("hidden");
  const count = has3 ? 3 : 2;

  for (let i = 0; i < count; i++) {
    sets.push([getInputVal(i, 1), getInputVal(i, 2)]);
  }
  return sets;
}

function bindEvents() {
  const data = window.__wcSeasonData;

  document.querySelectorAll("[data-add-result]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openModal(btn.dataset.addResult, btn.dataset.p1, btn.dataset.p2, data?.players || []);
    });
  });

  const modal = document.getElementById("score-modal");
  if (!modal) return;

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.getElementById("modal-cancel")?.addEventListener("click", closeModal);

  const passphraseInput = document.getElementById("modal-passphrase");
  const unlockBtn = document.getElementById("modal-unlock");

  async function doUnlock() {
    try {
      await authenticate(passphraseInput.value);
      document.getElementById("modal-gate").classList.add("hidden");
      document.getElementById("modal-form").classList.remove("hidden");
    } catch {
      showToast("Invalid passphrase.", "error");
    }
  }

  unlockBtn?.addEventListener("click", doUnlock);
  passphraseInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doUnlock();
  });

  document.getElementById("modal-walkover")?.addEventListener("change", (e) => {
    document.getElementById("modal-walkover-section").classList.toggle("hidden", !e.target.checked);
    document.getElementById("modal-score-section").classList.toggle("hidden", e.target.checked);
  });

  document.querySelectorAll("#modal-form .score-input").forEach((input) => {
    input.addEventListener("input", () => {
      updateSet3Visibility();
      updateWinnerHighlights();
    });
  });

  document.getElementById("modal-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const isWO = document.getElementById("modal-walkover").checked;
    let matchResult;

    if (isWO) {
      matchResult = {
        id: activeMatchId,
        date: new Date().toISOString().slice(0, 10),
        player1: activeP1,
        player2: activeP2,
        score: null,
        winner: document.getElementById("modal-wo-winner").value,
        walkover: true,
      };
    } else {
      const score = parseModalScore();
      const error = validateScore(score);
      if (error) {
        showToast(error, "error");
        return;
      }
      const winnerIdx = determineWinner(score);
      matchResult = {
        id: activeMatchId,
        date: new Date().toISOString().slice(0, 10),
        player1: activeP1,
        player2: activeP2,
        score,
        winner: winnerIdx === 1 ? activeP1 : activeP2,
        walkover: false,
      };
    }

    const submitBtn = document.getElementById("modal-submit");
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="loading loading--inline loading--small"><span class="loading__dot"></span><span class="loading__dot"></span><span class="loading__dot"></span></span>`;

    try {
      const seasonData = await loadSeason(true);
      seasonData.matches.push(matchResult);
      await saveSeasonData(seasonData, getApiKey());
      closeModal();
      showToast("Result submitted!");
      forceRefresh();
    } catch (err) {
      showToast("Failed: " + err.message, "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  });
}

render.afterRender = bindEvents;

export default render;

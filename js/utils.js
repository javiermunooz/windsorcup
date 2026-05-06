"use strict";

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast--exit");
    toast.addEventListener("animationend", () => toast.remove());
  }, 3000);
}

function showLoading() {
  return `<div class="loading"><span class="loading__dot"></span><span class="loading__dot"></span><span class="loading__dot"></span></div>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatScore(match) {
  if (match.walkover) return `<span class="badge badge--wo">W/O</span>`;
  if (!match.score) return `<span class="text-secondary">TBD</span>`;

  return match.score
    .map(([g1, g2]) => {
      const w1 = g1 > g2;
      return `<span class="score__set"><span class="${w1 ? "score__winner" : ""}">${g1}</span>–<span class="${!w1 ? "score__winner" : ""}">${g2}</span></span>`;
    })
    .join("");
}

function playerName(players, id) {
  return players.find((p) => p.id === id)?.name ?? "Unknown";
}

function playerCountry(players, id) {
  return players.find((p) => p.id === id)?.country ?? "";
}

function countryFlag(code) {
  if (!code || code.length !== 2) return "";
  const points = [...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...points);
}

function playerNameWithFlag(players, id) {
  const name = playerName(players, id);
  const flag = countryFlag(playerCountry(players, id));
  return flag ? `${flag} ${name}` : name;
}

function generateRoundRobin(playerIds, rounds = 1) {
  const ids = [...playerIds];
  if (ids.length % 2 !== 0) ids.push(null);

  const n = ids.length;
  const schedule = [];
  let matchCounter = 0;

  for (let pass = 0; pass < rounds; pass++) {
    const rotatable = [...ids];
    for (let round = 0; round < n - 1; round++) {
      const pairings = [];
      for (let i = 0; i < n / 2; i++) {
        const a = rotatable[i];
        const b = rotatable[n - 1 - i];
        if (a !== null && b !== null) {
          matchCounter++;
          pairings.push({
            match_id: `m${matchCounter}`,
            player1: pass === 0 ? a : b,
            player2: pass === 0 ? b : a,
          });
        }
      }
      schedule.push({ round: pass * (n - 1) + round + 1, pairings });

      const last = rotatable.pop();
      rotatable.splice(1, 0, last);
    }
  }

  return schedule;
}

function chevronSvg() {
  return `<svg class="accordion__chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6l4 4 4-4"/></svg>`;
}

function noSeasonHtml() {
  return `
    <div class="gate">
      <div class="gate__icon">${lockSvg()}</div>
      <h2>No Active Season</h2>
      <p class="text-secondary">Go to <a href="#admin" class="player-link text-primary">Admin</a> to create a season.</p>
    </div>`;
}

function lockSvg() {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`;
}

export {
  showToast,
  showLoading,
  escapeHtml,
  formatScore,
  playerName,
  playerCountry,
  countryFlag,
  playerNameWithFlag,
  generateRoundRobin,
  noSeasonHtml,
  chevronSvg,
  lockSvg,
};

"use strict";

function computeStats(players, matches) {
  const stats = {};

  for (const p of players) {
    stats[p.id] = {
      id: p.id,
      name: p.name,
      country: p.country || "",
      played: 0,
      wins: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      h2h: {},
    };
  }

  for (const m of matches) {
    if (!m.winner) continue;
    const s1 = stats[m.player1];
    const s2 = stats[m.player2];
    if (!s1 || !s2) continue;

    s1.played++;
    s2.played++;

    if (m.winner === m.player1) {
      s1.wins++;
      s2.losses++;
      s1.h2h[m.player2] = (s1.h2h[m.player2] || 0) + 1;
      s2.h2h[m.player1] = (s2.h2h[m.player1] || 0) - 1;
    } else {
      s2.wins++;
      s1.losses++;
      s2.h2h[m.player1] = (s2.h2h[m.player1] || 0) + 1;
      s1.h2h[m.player2] = (s1.h2h[m.player2] || 0) - 1;
    }

    if (!m.walkover && m.score) {
      for (let i = 0; i < m.score.length; i++) {
        const [g1, g2] = m.score[i];
        const isTiebreak = Math.max(g1, g2) > 7;

        if (!isTiebreak) {
          s1.gamesWon += g1;
          s1.gamesLost += g2;
          s2.gamesWon += g2;
          s2.gamesLost += g1;
        }

        if (g1 > g2) {
          s1.setsWon++;
          s2.setsLost++;
        } else {
          s2.setsWon++;
          s1.setsLost++;
        }
      }
    }
  }

  return stats;
}

function setPct(s) {
  const total = s.setsWon + s.setsLost;
  return total === 0 ? 0 : s.setsWon / total;
}

function gamePct(s) {
  const total = s.gamesWon + s.gamesLost;
  return total === 0 ? 0 : s.gamesWon / total;
}

function rankPlayers(players, matches) {
  const stats = computeStats(players, matches);
  const list = Object.values(stats);

  list.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;

    if (a.wins === b.wins) {
      const h2hVal = a.h2h[b.id];
      if (h2hVal !== undefined && h2hVal !== 0) {
        return h2hVal > 0 ? -1 : 1;
      }
    }

    const setDiff = setPct(b) - setPct(a);
    if (Math.abs(setDiff) > 1e-9) return setDiff;

    return gamePct(b) - gamePct(a);
  });

  return list.map((s, i) => ({ ...s, rank: i + 1, setPct: setPct(s), gamePct: gamePct(s) }));
}

export { computeStats, rankPlayers, setPct, gamePct };

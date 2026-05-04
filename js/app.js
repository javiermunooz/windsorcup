"use strict";

import { registerView, initRouter } from "./router.js";
import standingsView from "./views/standings.js";
import scheduleView from "./views/schedule.js";
import h2hView from "./views/h2h.js";
import playerView from "./views/player.js";
import adminView from "./views/admin.js";
import { loadSeason } from "./api.js";

registerView("standings", standingsView);
registerView("schedule", scheduleView);
registerView("h2h", h2hView);
registerView("player", playerView);
registerView("admin", adminView);

async function cacheSeasonData() {
  try {
    const data = await loadSeason();
    window.__wcSeasonData = data;
  } catch {
    window.__wcSeasonData = null;
  }
}

async function init() {
  await cacheSeasonData();
  initRouter();
}

init();

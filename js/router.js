"use strict";

const NAV_ROUTES = ["standings", "schedule", "h2h", "admin"];
const DEFAULT_ROUTE = "standings";

let currentView = null;
let currentParams = null;
let viewRenderers = {};

function registerView(name, renderer) {
  viewRenderers[name] = renderer;
}

function parseHash() {
  const raw = window.location.hash.slice(1) || DEFAULT_ROUTE;
  const [route, ...rest] = raw.split("/");
  return { route, params: rest };
}

function getRoute() {
  const { route } = parseHash();
  if (viewRenderers[route]) return route;
  return DEFAULT_ROUTE;
}

function getParams() {
  return parseHash().params;
}

function updateNav(route) {
  document.querySelectorAll(".nav__link").forEach((link) => {
    const isActive = link.dataset.view === route;
    link.classList.toggle("nav__link--active", isActive);
    link.setAttribute("aria-selected", isActive);
  });
}

async function navigate() {
  const route = getRoute();
  const params = getParams();
  const paramsKey = params.join("/");

  if (route === currentView && paramsKey === currentParams) return;
  currentView = route;
  currentParams = paramsKey;

  updateNav(route);

  const app = document.getElementById("app");
  const renderer = viewRenderers[route];

  if (!renderer) {
    app.innerHTML = `<p class="text-secondary text-center mt-3">View not found.</p>`;
    return;
  }

  app.innerHTML = `<div class="loading"><span class="loading__dot"></span><span class="loading__dot"></span><span class="loading__dot"></span></div>`;
  app.classList.remove("view-enter");

  try {
    const html = await renderer(params);
    app.innerHTML = `<div class="view-enter">${html}</div>`;
    renderer.afterRender?.(params);
  } catch (err) {
    app.innerHTML = `<p class="text-danger text-center mt-3">Failed to load view: ${err.message}</p>`;
  }
}

function forceRefresh() {
  currentView = null;
  currentParams = null;
  navigate();
}

function initRouter() {
  window.addEventListener("hashchange", navigate);
  if (!window.location.hash) {
    window.location.hash = `#${DEFAULT_ROUTE}`;
  }
  navigate();
}

export { registerView, initRouter, forceRefresh, getRoute, getParams };

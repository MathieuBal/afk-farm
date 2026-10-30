/* AFK Farm — service worker : cache des ressources pour le jeu hors-ligne. */
const CACHE = "afk-farm-v17";
const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icon.svg",
  "css/style.css?v=5.1",
  "css/fonts.css",
  "fonts/spacegrotesk-700-latin.woff2",
  "fonts/spacegrotesk-700-latin-ext.woff2",
  "fonts/manrope-400-latin.woff2",
  "fonts/manrope-400-latin-ext.woff2",
  "fonts/manrope-600-latin.woff2",
  "fonts/manrope-600-latin-ext.woff2",
  "fonts/manrope-700-latin.woff2",
  "fonts/manrope-700-latin-ext.woff2",
  "fonts/manrope-800-latin.woff2",
  "fonts/manrope-800-latin-ext.woff2",
  "fonts/jetbrainsmono-600-latin.woff2",
  "fonts/jetbrainsmono-600-latin-ext.woff2",
  "lab/engine.js?v=4",
  "lab/grid.js?v=4",
  "js/arena.js?v=5",
  "js/shipyard.js?v=5",
  "js/state.js",
  "js/config.js?v=5",
  "js/audio.js",
  "js/achievements.js",
  "js/skilltree.js?v=5",
  "js/field.js?v=5",
  "js/game.js?v=5",
  "js/tree-ui.js?v=5",
  "js/ui.js?v=5",
  "js/main.js?v=5",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith("afk-farm-") && k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit ||
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match("index.html"))
    )
  );
});

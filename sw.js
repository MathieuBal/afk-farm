/* AFK Farm — service worker : cache des ressources pour le jeu hors-ligne. */
const CACHE = "afk-farm-v13";
const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icon.svg",
  "css/style.css",
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
  "js/state.js",
  "js/config.js",
  "js/audio.js",
  "js/achievements.js",
  "js/skilltree.js",
  "js/field.js",
  "js/game.js",
  "js/tree-ui.js",
  "js/ui.js",
  "js/main.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
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

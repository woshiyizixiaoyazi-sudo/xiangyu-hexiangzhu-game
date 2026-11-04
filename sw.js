'use strict';
const SCOPE_URL = new URL(self.registration.scope);
const SCOPE_PATH = SCOPE_URL.pathname;
// Different GitHub Pages projects share an origin but must not share caches.
const CACHE_PREFIX = 'xiangyu-saved-pages-' + encodeURIComponent(SCOPE_PATH) + '-';
const CACHE = CACHE_PREFIX + 'v32-craft13-c20261104';
// Preload the usable site and game once: the first visit must not need a reload
// before it can work offline. Product photographs are saved when viewed.
const START_FILES = [
  'index.html', 'offline.html', 'offline-register.js', 'manifest.webmanifest',
  'play.css', 'v30.css', 'craft-intent.js', 'play-data.js', 'play-motion.css', 'play-motion.js', 'play.js',
  'game-embed.css', 'game-embed.js', 'photo-viewer.css', 'photo-viewer.js',
  'game/index.html', 'game/game.css', 'game/app.js', 'game/game-core.js',
  'game/card-export.js', 'game/patterns.js', 'game/storage.js',
  'atelier.html', 'customize.html', 'catalog.html', 'styles.css', 'products.js',
  'source-products.js', 'public-products.js', 'app.js', 'atmosphere.css', 'motion.js',
  'mobile-experience.css', 'mobile-experience.js', 'studio.js', 'play-bridge.js',
  'storefront.css', 'pwa.js', 'illustration.png', 'bracelets.png',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable.png',
  'photos/upload-S1.webp', 'photos/P0.jpg', 'photos/P1.jpg', 'photos/P2.jpg',
  'photos/P5.jpg', 'photos/wechat.jpg'
];
const ALLOWED = new Set(START_FILES.map(path => '/' + path));
function canonicalPath(path) {
  if (!path.startsWith(SCOPE_PATH)) return null;
  const localPath = path.slice(SCOPE_PATH.length);
  if (!localPath) return '/index.html';
  if (localPath === 'game/') return '/game/index.html';
  return '/' + localPath;
}
function cacheable(path) {
  return typeof path === 'string' && (ALLOWED.has(path) || /^\/(photos|icons)\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|svg)$/.test(path));
}
async function validResponse(response, path) {
  if (!response.ok || response.redirected || response.type === 'opaque') return false;
  const type = response.headers.get('content-type') || '';
  if (/\.html$/.test(path)) return /text\/html/.test(type) && (await response.clone().text()).includes('name="xiangyu-app"');
  if (/\.js$/.test(path)) return /javascript/.test(type);
  if (/\.css$/.test(path)) return /text\/css/.test(type);
  if (/\.(?:png|jpe?g|webp|svg)$/.test(path)) return /image\//.test(type);
  return !/text\/html/.test(type);
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const checks = await Promise.allSettled(START_FILES.map(async file => {
      const url = new URL(file, self.registration.scope);
      const response = await fetch(new Request(url.href, { cache: 'reload' }));
      if (!await validResponse(response, url.pathname)) throw new Error('Offline resource unavailable: ' + url.pathname);
      await cache.put(new Request(url.href), response);
    }));
    if (checks.some(check => check.status === 'rejected')) {
      await caches.delete(CACHE);
      throw new Error('Offline preparation incomplete');
    }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const path = canonicalPath(url.pathname);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !cacheable(path)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = new Request(new URL(path.slice(1), SCOPE_URL).href);
    try {
      const response = await fetch(request);
      if (await validResponse(response, path)) await cache.put(key, response.clone());
      if (response.status >= 500) return (await cache.match(key)) || response;
      return response;
    } catch {
      const saved = await cache.match(key);
      if (saved) return saved;
      if (request.mode === 'navigate') return (await cache.match(new URL('offline.html', self.registration.scope).href)) || new Response('网络暂时不可用，请联网后重试。', { status: 503, headers: { 'content-type': 'text/plain;charset=utf-8' } });
      return new Response('', { status: 503 });
    }
  })());
});

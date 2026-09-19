/* Madhav Labels service worker — makes the installed PWA work offline. */
/* eslint-disable no-restricted-globals */

const VERSION = "v1";
const STATIC_CACHE = `madhav-static-${VERSION}`;
const PAGE_CACHE = `madhav-pages-${VERSION}`;
const SHELL_URL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      try {
        // Warm the app shell so the first offline launch already works.
        await cache.addAll([SHELL_URL, "/manifest.webmanifest"]);
      } catch (err) {
        // Best-effort; the navigation handler caches the shell on first visit.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, PAGE_CACHE]);
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never intercept non-GET traffic (Server Actions, POSTs) — printing and
  // device flows must always hit the network/live page directly.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // App navigations: network-first so deploys load fresh, cached app shell
  // as the offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          if (fresh && fresh.ok) {
            const cache = await caches.open(PAGE_CACHE);
            await cache.put(request, fresh.clone());
          }
          return fresh;
        } catch (err) {
          const cache = await caches.open(PAGE_CACHE);
          const cached = (await cache.match(request)) || (await cache.match(SHELL_URL));
          if (cached) return cached;
          return new Response(
            "<h1>Offline</h1><p>Reopen the app once you are back online.</p>",
            { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }
      })(),
    );
    return;
  }

  // Immutable build assets and icons: cache-first.
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/192.png" ||
    url.pathname === "/512.png" ||
    url.pathname === "/apple-icon.png";
  if (isStatic) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const hit = await cache.match(request);
        if (hit) return hit;
        try {
          const fresh = await fetch(request);
          if (fresh && fresh.ok) await cache.put(request, fresh.clone());
          return fresh;
        } catch (err) {
          return new Response("", { status: 504, statusText: "Offline" });
        }
      })(),
    );
    return;
  }

  // Everything else (RSC payloads, etc.): network with cache fallback.
  event.respondWith(
    (async () => {
      try {
        return await fetch(request);
      } catch (err) {
        const cache = await caches.open(PAGE_CACHE);
        const hit = await cache.match(request);
        if (hit) return hit;
        return new Response("", { status: 504, statusText: "Offline" });
      }
    })(),
  );
});

/* Recordance service worker: works offline, keeps secrets out of the cache, and shows reminder notifications. */
const VERSION = "rc-v4", SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/theme-init.js"];
self.addEventListener("install", e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  // Only our own files are ever cached. Sign-in, database and function calls always go straight to the network.
  if (r.method !== "GET" || u.origin !== self.location.origin || u.pathname.startsWith("/functions") || u.pathname.startsWith("/auth") || u.pathname.startsWith("/rest")) return;
  if (r.mode === "navigate") {
    // Only the app page itself is stored as the offline copy. Other pages (privacy, terms, verify) must never replace it.
    const app = u.pathname === "/" || u.pathname === "/index.html";
    e.respondWith(fetch(r).then(res => { if (app && res.ok && res.type === "basic") { const c = res.clone(); caches.open(VERSION).then(x => x.put("/", c)); } return res; }).catch(() => app ? caches.match("/") : caches.match(u.pathname).then(h => h || caches.match("/")))); return;
  }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok && (u.pathname.startsWith("/assets/") || u.pathname.startsWith("/icons/"))) { const c = res.clone(); caches.open(VERSION).then(x => x.put(r, c)); } return res; })));
});
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(String(d.title || "Recordance").slice(0, 80), { body: String(d.body || "").slice(0, 200), icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: "recordance-reminder", renotify: true, data: { url: "/" } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => { const c = cs.find(x => x.url.startsWith(self.location.origin)); return c ? c.focus() : self.clients.openWindow("/"); }));
});

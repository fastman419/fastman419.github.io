/* Recordance service worker: works offline, keeps secrets out of the cache, and shows reminder notifications. */
/* The build fills in VERSION (one per release) and PRECACHE (every file of the app), so the whole app, including parts
   not opened yet (passport QR code, PDF statement reader), works offline after the first visit. */
const VERSION = "rc-dc4d8d1d1d", PRECACHE = ["/assets/Shell-Qvw16TpW.js","/assets/bricolage-grotesque-latin-500-normal-DEDBoLFO.woff2","/assets/bricolage-grotesque-latin-700-normal-gtcctNPv.woff2","/assets/bricolage-grotesque-latin-800-normal-J50vIsBe.woff2","/assets/charts-Dum7mAeo.js","/assets/figtree-latin-400-normal-g7Dtegnw.woff2","/assets/figtree-latin-500-normal-BWnGEVsr.woff2","/assets/figtree-latin-600-normal-Cv_xCTDl.woff2","/assets/figtree-latin-700-normal-th6qEP7c.woff2","/assets/index-AFL14zM2.js","/assets/index-C2_ZTHGq.css","/assets/index-CEcINbWg.js","/assets/index-CS0JTgyR.js","/assets/index-Cg96dM5v.js","/assets/index-Cm4lgRaG.js","/assets/index-_ZacUhXk.js","/assets/motion-DV2vGUFY.js","/assets/pdf.min-BF10Kdvk.js","/assets/pdf.worker.min-kRzmSJ8u.js","/assets/qrcode-CtkDkHKv.js","/assets/react-CVy_rpWq.js","/assets/supabase-CB7MGzWB.js","/assets/web-BCYWiJX6.js","/assets/web-BVKaIc0F.js","/assets/web-BVZCetEZ.js","/assets/web-MFRw8Qkj.js","/icons/apple-touch-icon.png","/icons/favicon-32.png","/icons/icon-512.png","/index.html"];
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/theme-init.js", "/boot.css", "/boot.js"];
// One missing file must not stop the rest from being stored, so each is added on its own.
self.addEventListener("install", e => e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled([...SHELL, ...PRECACHE].map(u => c.add(new Request(u, { cache:"reload" }))))).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  // Only our own files are ever cached. Sign-in, database and function calls always go straight to the network.
  if (r.method !== "GET" || u.origin !== self.location.origin || u.pathname.startsWith("/functions") || u.pathname.startsWith("/auth") || u.pathname.startsWith("/rest")) return;
  if (r.mode === "navigate") {
    // Only the app page itself is stored as the offline copy. Other pages (privacy, terms, verify) must never replace it.
    const app = u.pathname === "/" || u.pathname === "/index.html";
    e.respondWith(fetch(r).then(res => { if (app && res.ok && res.type === "basic") { const c = res.clone(); caches.open(VERSION).then(x => x.put("/", c)); } return res; }).catch(() => app ? caches.match("/", { ignoreVary:true }) : caches.match(u.pathname, { ignoreVary:true }).then(h => h || caches.match("/", { ignoreVary:true })))); return;
  }
  // App files have a new name every release, so matching on the address alone is safe ("ignoreVary": a server that
  // varies by Origin would otherwise make the stored copy look different from the page's own request).
  e.respondWith(caches.match(r, { ignoreVary:true }).then(hit => hit || fetch(r).then(res => { if (res.ok && (u.pathname.startsWith("/assets/") || u.pathname.startsWith("/icons/"))) { const c = res.clone(); caches.open(VERSION).then(x => x.put(r, c)); } return res; })));
});
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(String(d.title || "Recordance").slice(0, 80), { body: String(d.body || "").slice(0, 200), icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: "recordance-reminder", renotify: true, data: { url: "/" } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => { const c = cs.find(x => x.url.startsWith(self.location.origin)); return c ? c.focus() : self.clients.openWindow("/"); }));
});

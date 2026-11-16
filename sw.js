/* Recordance service worker: works offline, keeps secrets out of the cache, and shows reminder notifications. */
/* The build fills in VERSION (one per release) and PRECACHE (every file of the app), so the whole app, including parts
   not opened yet (passport QR code, PDF statement reader), works offline after the first visit. */
const VERSION = "rc-d1c354f826", PRECACHE = ["/assets/Shell-u3KuLpck.js","/assets/charts-BtIhdfmR.js","/assets/ibm-plex-mono-latin-400-normal-DMJ8VG8y.woff2","/assets/ibm-plex-mono-latin-500-normal-DSY6xOcd.woff2","/assets/ibm-plex-mono-latin-600-normal-BgSNZQsw.woff2","/assets/index-B7DAydyt.js","/assets/index-BE0FLCwN.css","/assets/index-BESvmwZP.js","/assets/index-CEcINbWg.js","/assets/index-Dene4zv2.js","/assets/index-Dr8BlepU.js","/assets/index-Gu6Yc2FZ.js","/assets/index-aDHdi-lg.js","/assets/motion-DV2vGUFY.js","/assets/pdf.min-BF10Kdvk.js","/assets/pdf.worker.min-B7IRjtQd.js","/assets/public-sans-latin-400-normal-8Rpg0ruU.woff2","/assets/public-sans-latin-500-normal-NlrCPXnF.woff2","/assets/public-sans-latin-600-normal-Fru-LXNs.woff2","/assets/public-sans-latin-700-normal-BqJmxWdE.woff2","/assets/qrcode-CtkDkHKv.js","/assets/react-CVy_rpWq.js","/assets/source-serif-4-latin-500-normal-CUHe9xxf.woff2","/assets/source-serif-4-latin-600-normal-DouSKlru.woff2","/assets/supabase-CB7MGzWB.js","/assets/web-BCYWiJX6.js","/assets/web-BVZCetEZ.js","/assets/web-C6IcJ9Fh.js","/assets/web-DpIouAwI.js","/assets/web-MFRw8Qkj.js","/icons/apple-touch-icon.png","/icons/favicon-32.png","/icons/icon-512.png","/index.html"];
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

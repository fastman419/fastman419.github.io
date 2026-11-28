/* Recordance service worker: works offline, keeps secrets out of the cache, and shows reminder notifications. */
/* The build fills in VERSION (one per release) and PRECACHE (every file of the app), so the whole app, including parts
   not opened yet (passport QR code, PDF statement reader), works offline after the first visit. */
const VERSION = "rc-1e41eee783", PRECACHE = ["/assets/Shell-DToTwxWJ.js","/assets/atkinson-hyperlegible-mono-latin-400-normal-CmMGer93.woff2","/assets/atkinson-hyperlegible-mono-latin-500-normal-CfDLaOZW.woff2","/assets/atkinson-hyperlegible-mono-latin-600-normal-BiYyYOKJ.woff2","/assets/atkinson-hyperlegible-next-latin-400-normal-FfmJh7DR.woff2","/assets/atkinson-hyperlegible-next-latin-500-normal-gHP6TDRs.woff2","/assets/atkinson-hyperlegible-next-latin-600-normal-BBuhw47K.woff2","/assets/atkinson-hyperlegible-next-latin-700-normal-Dpiyiu63.woff2","/assets/atkinson-hyperlegible-next-latin-ext-400-normal-BalHKn7d.woff2","/assets/atkinson-hyperlegible-next-latin-ext-500-normal-CUASR3PD.woff2","/assets/atkinson-hyperlegible-next-latin-ext-600-normal-kZZEtAc7.woff2","/assets/atkinson-hyperlegible-next-latin-ext-700-normal-CBw-mJf_.woff2","/assets/charts-D4DSvxxx.js","/assets/es-CY1imtGh.js","/assets/fr-C1hbGfMV.js","/assets/index-BMWOp8AK.js","/assets/index-BTJp1-E_.js","/assets/index-C5UVO0Hh.js","/assets/index-CEcINbWg.js","/assets/index-CkINbPU5.js","/assets/index-DgdHM-lC.js","/assets/index-DtOqGkMr.js","/assets/index-YFLQwPN5.css","/assets/literata-latin-600-normal-A9sHopYh.woff2","/assets/literata-latin-700-normal-DYBWKELl.woff2","/assets/literata-latin-800-normal-CAgJjmlx.woff2","/assets/literata-latin-ext-600-normal-iLkdh2tW.woff2","/assets/literata-latin-ext-700-normal-Cd5BSFN5.woff2","/assets/literata-latin-ext-800-normal-YXqKKZyQ.woff2","/assets/literata-vietnamese-600-normal-CKzxoyei.woff2","/assets/literata-vietnamese-700-normal-Cmj-gDIS.woff2","/assets/literata-vietnamese-800-normal-qsFxgcG0.woff2","/assets/motion-CsQStJAW.js","/assets/pdf.min-BF10Kdvk.js","/assets/pdf.worker.min-BfpDC0IM.js","/assets/pt-BbUugErT.js","/assets/qrcode-DwRCQr8q.js","/assets/react-DAnFPKhx.js","/assets/supabase-CB7MGzWB.js","/assets/sw-BHPwoXM-.js","/assets/web-BCYWiJX6.js","/assets/web-BVZCetEZ.js","/assets/web-DaFF3fG-.js","/assets/web-DpIouAwI.js","/assets/web-MFRw8Qkj.js","/assets/zu-CTc1xywd.js","/icons/apple-touch-icon.png","/icons/favicon-32.png","/icons/icon-512.png","/index.html"];
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/theme-init.js?v=1e41eee783", "/boot.css?v=1e41eee783", "/boot.js?v=1e41eee783"];
// One missing file must not stop the rest from being stored, so each is added on its own. The big PDF reader goes last,
// so on a weak connection the files every screen needs are stored first.
const BIG = u => /pdf/i.test(u);
// The page itself is fetched with the release in its address, so the web host's cache cannot hand over last release's page.
const add = (c, u) => u === "/" ? fetch(new Request("/?v=" + VERSION.slice(3), { cache:"reload" })).then(res => { if (!res.ok) throw new Error(); return c.put("/", res); }) : c.add(new Request(u, { cache:"reload" }));
const store = (c, list) => Promise.allSettled(list.map(u => add(c, u)));
self.addEventListener("install", e => e.waitUntil(caches.open(VERSION).then(c => { const all = [...SHELL, ...PRECACHE]; return store(c, all.filter(u => !BIG(u))).then(() => store(c, all.filter(BIG))); }).then(() => self.skipWaiting())));
// The release before this one is kept too: a page opened from the old copy can still fetch its own screens after the
// new release takes over. Older ones are deleted.
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => { const old = ks.filter(k => k !== VERSION); return Promise.all(old.slice(0, -1).map(k => caches.delete(k))); }).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  // Only our own files are ever cached. Sign-in, database and function calls always go straight to the network.
  if (r.method !== "GET" || u.origin !== self.location.origin || u.pathname.startsWith("/functions") || u.pathname.startsWith("/auth") || u.pathname.startsWith("/rest")) return;
  if (r.mode === "navigate") {
    // Only the app page itself is stored as the offline copy. Other pages (privacy, terms, verify) must never replace it.
    // The network first, so a good connection always gets the newest page; but on a weak connection the stored copy opens
    // after 3 s (6 s for other pages) instead of a blank wait, and the network answer still refreshes the copy for next time.
    const app = u.pathname === "/" || u.pathname === "/index.html";
    const net = () => fetch(r).then(res => { if (app && res.ok && res.type === "basic" && !res.redirected) { const c = res.clone(); caches.open(VERSION).then(x => x.put("/", c)); } return res; });
    const stored = () => (app ? caches.match("/", { ignoreVary:true }) : caches.match(u.pathname, { ignoreVary:true }).then(h => h || caches.match("/", { ignoreVary:true })));
    e.respondWith(new Promise(done => {
      let over = false; const give = x => { if (!over) { over = true; done(x); } };
      const t = setTimeout(() => stored().then(h => h && give(h)), app ? 3000 : 6000);
      const n = net();
      e.waitUntil(n.catch(() => {}));
      n.then(res => { clearTimeout(t); give(res); }, () => { clearTimeout(t); give(stored().then(h => h || Response.error())); });
    })); return;
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

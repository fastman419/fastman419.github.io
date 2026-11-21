/* Runs first, before the page is drawn.
   1. Frame guard: GitHub Pages cannot send X-Frame-Options or CSP frame-ancestors, so another site could load the
      app inside an invisible frame and trick a farmer into tapping buttons (clickjacking). If the app is inside a
      frame, it shows nothing and tries to open itself as the whole page instead.
   2. Sets the chosen light or dark look, so there is no white flash. */
(function () {
  var framed; try { framed = window.top !== window.self; } catch (e) { framed = true; }
  if (framed) {
    document.documentElement.style.display = "none";
    try { window.top.location = window.self.location.href; } catch (e) {}
    throw new Error("framed");
  }
})();
try { var t = localStorage.getItem("rc_theme"); if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t); } catch (e) {}
/* 3. Glass bars on the iPhone web app only (not the store apps): same rule and numbers as src/lib/glass.js. */
try {
  if (/iPhone|iPod/.test(navigator.userAgent) && location.protocol !== "capacitor:") {
    var gv = localStorage.getItem("rc_glass"), g = gv === null ? 50 : Math.round(Number(gv));
    g = isFinite(g) ? Math.min(100, Math.max(0, g)) : 50;
    var gp = 40 + Math.round(g * 0.55), gr = document.documentElement;
    gr.classList.add("iosweb"); gr.style.setProperty("--glass-p", gp + "%"); gr.style.setProperty("--glass-pe", Math.min(97, gp + 25) + "%");
  }
} catch (e) {}

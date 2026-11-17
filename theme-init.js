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

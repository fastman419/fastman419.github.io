/* Sets the chosen light or dark look before the page is drawn, so there is no white flash. */
try { var t = localStorage.getItem("rc_theme"); if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t); } catch (e) {}

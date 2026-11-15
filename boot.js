/* While the app's code is still arriving: after a few seconds, say why in plain words instead of leaving a blank wait.
   The app replaces all of this once it starts. */
(function () {
  var note = document.getElementById("sk-note"); if (!note) return;
  var t = note.querySelector("b"), p = note.querySelector("span"), btn = note.querySelector("button");
  function show() {
    if (!document.getElementById("sk-note")) return;   // the app has started
    if (navigator.onLine === false) { t.textContent = "No internet right now"; p.textContent = "Recordance opens without internet once it has been opened online one time. Connect to finish opening it, and it will work offline after that."; }
    else { t.textContent = "Slow internet"; p.textContent = "Recordance is still loading. Your records are safe on this phone. This can take a little longer on a weak connection."; }
    note.hidden = false;
  }
  setTimeout(show, 6000);
  window.addEventListener("offline", function () { setTimeout(show, 1500); });
  if (btn) btn.addEventListener("click", function () { location.reload(); });
})();

/* Cricket page init — fullscreen, HTML stat mirroring.
   Pad visibility is managed by cricket.js setState() (shows only during innings). */
(function () {
  "use strict";

  var panel = document.getElementById("game");
  var fsBtn = document.getElementById("ck-fs");

  /* Fullscreen — use shell.js helper (handles native API + is-fill iOS fallback + icon toggle).
     CNKGame is merged in cricket.js boot(), so shell.js's fullscreen() is still present. */
  if (panel && fsBtn) {
    if (window.CNKGame && typeof window.CNKGame.fullscreen === "function") {
      window.CNKGame.fullscreen(panel, fsBtn);
    } else {
      /* Fallback: minimal inline implementation */
      var expandIco = fsBtn.querySelector(".ico-expand");
      var shrinkIco = fsBtn.querySelector(".ico-shrink");
      var filled = false;

      function paint() {
        var on = !!document.fullscreenElement || filled;
        fsBtn.setAttribute("aria-label", on ? "Exit full screen" : "Full screen");
        fsBtn.title = on ? "Exit full screen" : "Full screen";
        if (expandIco) expandIco.hidden = on;
        if (shrinkIco) shrinkIco.hidden = !on;
      }

      fsBtn.addEventListener("click", function () {
        if (document.fullscreenElement || filled) {
          if (document.fullscreenElement) {
            try { document.exitFullscreen(); } catch (e) {}
          }
          filled = false; panel.classList.remove("is-fill"); paint();
        } else {
          var p = null;
          try {
            if (panel.requestFullscreen) p = panel.requestFullscreen();
            else if (panel.webkitRequestFullscreen) { panel.webkitRequestFullscreen(); return; }
          } catch (e) {}
          if (p && typeof p.then === "function") {
            p.then(null, function () { filled = true; panel.classList.add("is-fill"); paint(); });
          } else {
            setTimeout(function () { if (!document.fullscreenElement) { filled = true; panel.classList.add("is-fill"); paint(); } }, 300);
          }
        }
      });

      document.addEventListener("fullscreenchange", paint);
      document.addEventListener("webkitfullscreenchange", paint);
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && filled) { filled = false; panel.classList.remove("is-fill"); paint(); } });
      paint();
    }
  }

  /* Mirror best + last score to the HTML cells above the canvas */
  var bestEl  = document.getElementById("ck-best-disp");
  var scoreEl = document.getElementById("ck-score-disp");

  function sync() {
    var best = 0, last = null;
    try {
      best = parseInt(localStorage.getItem("cnk-cricket-best"), 10) || 0;
      last = JSON.parse(localStorage.getItem("cnk-cricket-last") || "null");
    } catch (e) {}
    if (bestEl)  bestEl.textContent  = best ? String(best) : "—";
    if (scoreEl && last && last.line) scoreEl.textContent = String(last.line);
  }

  sync();
  setInterval(sync, 1500);
})();

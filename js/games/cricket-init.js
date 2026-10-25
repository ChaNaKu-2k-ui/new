/* Cricket page init — touch pad, fullscreen, HTML stat mirroring. */
(function () {
  "use strict";

  var panel  = document.getElementById("game");
  var fsBtn  = document.getElementById("ck-fs");

  if (typeof CNKGame === "undefined") return;

  /* Show touch pad on any coarse-pointer device */
  if (CNKGame.touch && panel) panel.setAttribute("data-pad", "on");

  /* Fullscreen */
  if (fsBtn) CNKGame.fullscreen(panel, fsBtn);

  /* Mirror best + last to the HTML cells above the canvas */
  var bestEl = document.getElementById("ck-best-disp");
  var scoreEl = document.getElementById("ck-score-disp");

  function sync() {
    var best = 0;
    var last = null;
    try {
      best = parseInt(localStorage.getItem("cnk-cricket-best"), 10) || 0;
      last = JSON.parse(localStorage.getItem("cnk-cricket-last") || "null");
    } catch (e) {}

    if (bestEl) bestEl.textContent = best ? String(best) : "—";
    if (scoreEl && last && last.line) scoreEl.textContent = String(last.line);
  }

  sync();
  setInterval(sync, 1500);
})();

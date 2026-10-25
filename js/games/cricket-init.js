/* Cricket page init: touch pad, fullscreen wiring, HTML stat mirroring.
   Runs after shell.js and cricket.js (all deferred, so order holds). */
(function () {
  "use strict";

  var panel  = document.getElementById("game");
  var fsBtn  = document.getElementById("ck-fs");
  var fsBtn2 = document.getElementById("ck-fs2");

  if (typeof CNKGame === "undefined") return;

  /* Show the mobile pad on any touch-capable screen. */
  if (CNKGame.touch && panel) panel.setAttribute("data-pad", "on");

  /* Full screen — both buttons do the same thing. */
  if (fsBtn) CNKGame.fullscreen(panel, fsBtn);
  if (fsBtn2 && fsBtn) {
    fsBtn2.addEventListener("click", function () { fsBtn.click(); });
  }

  /* Mirror the last match + best into the HTML cells.
     The canvas HUD is authoritative; these cells are for screen readers
     and for anyone who scrolls past the game. */
  var scoreEl = document.getElementById("ck-score-disp");
  var bestEl  = document.getElementById("ck-best-disp");

  function sync() {
    var best = 0, last = null;
    try {
      best = parseInt(localStorage.getItem("cnk-cricket-best"), 10) || 0;
      last = JSON.parse(localStorage.getItem("cnk-cricket-last") || "null");
    } catch (e) { /* storage blocked — leave the dashes */ }

    if (bestEl) bestEl.textContent = best ? String(best) : "—";
    if (scoreEl) {
      scoreEl.textContent = (last && last.line) ? String(last.line) : "—";
    }
  }

  sync();
  setInterval(sync, 1500);
})();

/* Cricket page init: touch detection, fullscreen wiring, stat display updates.
   Runs after shell.js and cricket.js. */
(function () {
  "use strict";

  var panel  = document.getElementById("game");
  var fsBtn  = document.getElementById("ck-fs");
  var fsBtn2 = document.getElementById("ck-fs2");

  /* Show mobile pad on touch screens */
  if (CNKGame.touch) {
    panel.setAttribute("data-pad", "on");
  }

  /* Full screen – both buttons do the same thing */
  if (fsBtn) CNKGame.fullscreen(panel, fsBtn);
  if (fsBtn2) {
    fsBtn2.addEventListener("click", function () {
      fsBtn.click();   /* delegate to the main FS button */
    });
  }

  /* Keep the HTML stat cells in sync (the canvas HUD is the authoritative display;
     these HTML cells give screen readers something to read). */
  var scoreEl = document.getElementById("ck-score-disp");
  var bestEl  = document.getElementById("ck-best-disp");

  function syncStats() {
    /* Read best from localStorage – cricket.js keeps it there. */
    var b = 0;
    try { b = parseInt(localStorage.getItem("cnk-cricket-best")) || 0; } catch (e) {}
    if (bestEl) bestEl.textContent = String(b);
  }

  syncStats();
  setInterval(syncStats, 2000);
})();

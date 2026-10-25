/* Cricket page init — touch pad, fullscreen, HTML stat mirroring. */
(function () {
  "use strict";

  var panel  = document.getElementById("game");
  var fsBtn  = document.getElementById("ck-fs");

  /* Show touch pad on any coarse-pointer device */
  if (panel && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
    panel.setAttribute("data-pad", "on");
  }

  /* Standard Fullscreen API implementation */
  if (fsBtn && panel) {
    var expandIco = fsBtn.querySelector(".ico-expand");
    var shrinkIco = fsBtn.querySelector(".ico-shrink");

    fsBtn.addEventListener("click", function () {
      if (!document.fullscreenElement) {
        if (panel.requestFullscreen) {
          panel.requestFullscreen().catch(function(){});
        } else if (panel.webkitRequestFullscreen) {
          panel.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    });

    document.addEventListener("fullscreenchange", function () {
      var isFs = !!document.fullscreenElement;
      if (expandIco) expandIco.hidden = isFs;
      if (shrinkIco) shrinkIco.hidden = !isFs;
    });
  }

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

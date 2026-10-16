/* Shared helpers for the games: touch detection, full screen (with a fallback for phones that cannot
   full-screen a box, such as iPhone Safari), saved settings and short sound effects. Nothing leaves the browser. */
(function () {
  "use strict";

  /* Any touch-capable screen gets the arrow buttons, including phones that report a mouse as their main pointer. */
  var touch = ("ontouchstart" in window) || (navigator.maxTouchPoints || 0) > 0 ||
    window.matchMedia("(any-pointer: coarse)").matches;

  var hasOwn = function (obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); };

  /* Saved settings: only keys that exist in defaults, and only values of the same type, are kept. */
  function load(key, defaults) {
    var out = {}, k;
    for (k in defaults) if (hasOwn(defaults, k)) out[k] = defaults[k];
    try {
      var saved = JSON.parse(localStorage.getItem(key)) || {};
      for (k in defaults) {
        if (hasOwn(saved, k) && typeof saved[k] === typeof defaults[k]) out[k] = saved[k];
      }
    } catch (e) { /* storage blocked or corrupt: keep the defaults */ }
    return out;
  }

  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* keep playing */ }
  }

  /* Full screen. Uses the Fullscreen API where the browser has it. Otherwise the game fills the whole
     window (position: fixed), which still hides the page around it. The button is always shown. */
  function fullscreen(el, btn) {
    var native = !!el.requestFullscreen && document.fullscreenEnabled !== false;
    var filled = false;

    function isOn() { return document.fullscreenElement === el || filled; }

    function paint() {
      var on = isOn();
      btn.setAttribute("aria-label", on ? "Exit full screen" : "Full screen");
      btn.title = on ? "Exit full screen" : "Full screen";
      var expand = btn.querySelector(".ico-expand"), shrink = btn.querySelector(".ico-shrink");
      if (expand) expand.hidden = on;
      if (shrink) shrink.hidden = !on;
    }

    function fillOn() { filled = true; el.classList.add("is-fill"); paint(); }
    function fillOff() { filled = false; el.classList.remove("is-fill"); paint(); }

    function enter() {
      if (native) {
        try {
          var p = el.requestFullscreen();
          if (p && typeof p.then === "function") { p.then(null, fillOn); return; }
        } catch (e) { /* not allowed here: fill the window instead */ }
        setTimeout(function () { if (!document.fullscreenElement) fillOn(); }, 300);
        return;
      }
      fillOn();
    }

    function exit() {
      if (document.fullscreenElement) {
        try {
          var p = document.exitFullscreen();
          if (p && p.catch) p.catch(function () {});
        } catch (e) { /* ignore */ }
      }
      fillOff();
    }

    btn.addEventListener("click", function () { if (isOn()) exit(); else enter(); });
    document.addEventListener("fullscreenchange", paint);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && filled) fillOff(); });
    paint();
  }

  /* Short tone. Does nothing when sound is off or the browser blocks audio. */
  var audio = null;
  function unlockAudio() {
    if (audio) return audio;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audio = new AC();
    } catch (e) { audio = null; }
    return audio;
  }
  function beep(on, freq, ms, type) {
    if (!on) return;
    var ac = unlockAudio();
    if (!ac) return;
    try {
      if (ac.state === "suspended" && ac.resume) {
        var r = ac.resume();
        if (r && r.catch) r.catch(function () {});
      }
      var t = ac.currentTime, osc = ac.createOscillator(), gain = ac.createGain();
      osc.type = type || "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + ms / 1000);
    } catch (e) { /* audio blocked: stay silent */ }
  }

  window.CNKGame = { touch: touch, load: load, save: save, fullscreen: fullscreen, beep: beep, unlockAudio: unlockAudio };
})();

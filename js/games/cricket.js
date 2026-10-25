/* ============================================================================
   CRICKET LEGENDS v3 — modern browser cricket
   chanaku.pages.dev/games/cricket

   Renders to a 900×600 canvas. Uses perspective projection for depth.
   6 modes · 5 difficulties · 12 teams · 4 themes · full commentary ·
   complete scorecards · sound effects · localStorage saves · touch/keyboard.
   ========================================================================== */
(function () {
  "use strict";

  /* ===========================================================================
     §1  CONSTANTS
     =========================================================================== */
  var VW = 900, VH = 600;
  var BPO = 6;                            // balls per over

  var LS_SET  = "cnk-cricket-settings";
  var LS_BEST = "cnk-cricket-best";
  var LS_LAST = "cnk-cricket-last";
  var LS_CAREER = "cnk-cricket-career";
  var LS_MUTE = "cnk-nokia-muted";

  /* ===========================================================================
     §2  UTILITIES
     =========================================================================== */
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeIn(t) { return t * t * t; }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ===========================================================================
     §3  PALETTES (4 themes)
     =========================================================================== */
  var PALETTES = {
    day: {
      name: "DAY",
      skyTop: "#5ba8d8", skyBot: "#c4e4f0", sun: "#ffe9a8",
      grassA: "#4ea83d", grassB: "#439434", grassHi: "#5eb54a",
      pitch: "#c8b991", pitchB: "#b8a87f", crease: "#f0e6c8",
      crowd: "#1e2a1e", crowdDot: ["#e0c060", "#c04060", "#5070c0", "#60a040", "#e0e0e0"],
      boundary: "#ffffff",
      hudBg: "rgba(0,15,0,0.72)", hudBorder: "rgba(255,255,255,0.18)",
      uiText: "#ffffff", uiDim: "#a8c8a0", uiAccent: "#ffd600",
      panelBg: "rgba(0,20,10,0.92)", panelBorder: "rgba(255,255,255,0.25)",
      btnBg: "#0f3a0f", btnActive: "#2a7a2a", btnText: "#eaffd0",
      perfect: "#4aff4a", good: "#ffcc00", ok: "#ff8800", miss: "#a03030",
      ball: "#c42020", ballHi: "#ff8080", trail: "rgba(196,32,32,0.5)",
      skin: "#d4a878", skinD: "#a88058", helmet: "#1a2540",
      pads: "#f4ecd8", bat: "#c8a040", batGrip: "#3a2010",
      stump: "#e0c888", bail: "#f0e0a0",
      fielderHome: "#e8e8d8", fielderAway: "#2a4a7a",
      scan: "rgba(0,0,0,0.10)"
    },
    dusk: {
      name: "DUSK",
      skyTop: "#ff6b35", skyBot: "#ffb347", sun: "#ffe680",
      grassA: "#5a7c2a", grassB: "#4a6a1e", grassHi: "#6a9028",
      pitch: "#d4a87a", pitchB: "#c49a6c", crease: "#ffe9d0",
      crowd: "#2a1a10", crowdDot: ["#ff8060", "#ffcc60", "#60a0c0", "#a060c0", "#f0e0d0"],
      boundary: "#fff4e0",
      hudBg: "rgba(30,10,0,0.78)", hudBorder: "rgba(255,200,120,0.30)",
      uiText: "#fff4e0", uiDim: "#d8b090", uiAccent: "#ffd660",
      panelBg: "rgba(20,10,0,0.94)", panelBorder: "rgba(255,200,120,0.35)",
      btnBg: "#3a2010", btnActive: "#7a4a20", btnText: "#ffecd0",
      perfect: "#a0ffa0", good: "#ffd660", ok: "#ff8040", miss: "#802020",
      ball: "#c42020", ballHi: "#ff8080", trail: "rgba(196,32,32,0.5)",
      skin: "#e0b088", skinD: "#b08860", helmet: "#2a1530",
      pads: "#fff0e0", bat: "#d0a850", batGrip: "#3a2010",
      stump: "#f0d090", bail: "#ffe8a0",
      fielderHome: "#ffe0c0", fielderAway: "#4a2a10",
      scan: "rgba(30,10,0,0.10)"
    },
    night: {
      name: "NIGHT",
      skyTop: "#050a1a", skyBot: "#101a30", sun: "#f0f0ff",
      grassA: "#1e5a2a", grassB: "#184a22", grassHi: "#2a7038",
      pitch: "#8a7658", pitchB: "#7a6848", crease: "#d0c0a0",
      crowd: "#050810", crowdDot: ["#ff4040", "#40a0ff", "#ffaa40", "#a0ff60", "#e0e0f0"],
      boundary: "#f0f0ff",
      hudBg: "rgba(0,5,15,0.85)", hudBorder: "rgba(100,150,220,0.30)",
      uiText: "#e0f0ff", uiDim: "#7088a8", uiAccent: "#00e5ff",
      panelBg: "rgba(0,10,30,0.95)", panelBorder: "rgba(100,150,220,0.40)",
      btnBg: "#0a1a30", btnActive: "#2a4a80", btnText: "#d0e8ff",
      perfect: "#00ff88", good: "#00e5ff", ok: "#ffaa00", miss: "#802020",
      ball: "#ff3030", ballHi: "#ff8080", trail: "rgba(255,48,48,0.6)",
      skin: "#e0b090", skinD: "#b08060", helmet: "#1a1a3a",
      pads: "#e8e8f8", bat: "#c8a848", batGrip: "#2a1a08",
      stump: "#e0d0a0", bail: "#f0e8b0",
      fielderHome: "#e8f0ff", fielderAway: "#2a3a6a",
      scan: "rgba(0,0,0,0.15)"
    },
    retro: {
      name: "RETRO",
      skyTop: "#9bbc0f", skyBot: "#8bac0f", sun: "#c4d96b",
      grassA: "#8bac0f", grassB: "#7a9c0e",

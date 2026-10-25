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
      grassA: "#8bac0f", grassB: "#7a9c0e", grassHi: "#a0c020",
      pitch: "#c4d96b", pitchB: "#b8cc5e", crease: "#e4f09a",
      crowd: "#0f380f", crowdDot: ["#306230", "#306230"],
      boundary: "#0f380f",
      hudBg: "rgba(15,56,15,0.92)", hudBorder: "rgba(255,255,255,0.15)",
      uiText: "#e8f5b0", uiDim: "#7a9c4e", uiAccent: "#ffffff",
      panelBg: "rgba(15,56,15,0.96)", panelBorder: "rgba(154,192,32,0.40)",
      btnBg: "#1e4a1e", btnActive: "#4a7a2a", btnText: "#e8f5b0",
      perfect: "#e8f5b0", good: "#c4d96b", ok: "#8bac0f", miss: "#306230",
      ball: "#0f380f", ballHi: "#5a7a1e", trail: "rgba(15,56,15,0.5)",
      skin: "#8bac0f", skinD: "#306230", helmet: "#0f380f",
      pads: "#c4d96b", bat: "#306230", batGrip: "#0f380f",
      stump: "#0f380f", bail: "#0f380f",
      fielderHome: "#0f380f", fielderAway: "#306230",
      scan: "rgba(15,56,15,0.14)"
    }
  };
  var PALETTE_KEYS = ["day", "dusk", "night", "retro"];

  var P = PALETTES.day;

  /* ===========================================================================
     §4  TEAMS (12 international)
     =========================================================================== */
  var TEAMS = [
    { id: "SL",  name: "Sri Lanka",    kitA: "#0039a6", kitB: "#ffd200", emblem: "SL" },
    { id: "IN",  name: "India",        kitA: "#1a4fa0", kitB: "#ff8a00", emblem: "IN" },
    { id: "AUS", name: "Australia",    kitA: "#0a6b3a", kitB: "#ffd700", emblem: "AU" },
    { id: "ENG", name: "England",      kitA: "#002f6c", kitB: "#ffffff", emblem: "EN" },
    { id: "WI",  name: "West Indies",  kitA: "#7a0c1e", kitB: "#ffd700", emblem: "WI" },
    { id: "PAK", name: "Pakistan",     kitA: "#0a5c2e", kitB: "#ffffff", emblem: "PK" },
    { id: "SA",  name: "South Africa", kitA: "#007a4d", kitB: "#ffb612", emblem: "SA" },
    { id: "NZ",  name: "New Zealand",  kitA: "#1a1a1a", kitB: "#c8c8c8", emblem: "NZ" },
    { id: "BAN", name: "Bangladesh",   kitA: "#006a4e", kitB: "#f42a41", emblem: "BD" },
    { id: "AFG", name: "Afghanistan",  kitA: "#0a4a8a", kitB: "#d32011", emblem: "AF" },
    { id: "IRE", name: "Ireland",      kitA: "#009a49", kitB: "#ffffff", emblem: "IE" },
    { id: "ZIM", name: "Zimbabwe",     kitA: "#c8102e", kitB: "#ffd200", emblem: "ZW" }
  ];

  /* ===========================================================================
     §5  DIFFICULTIES (5)
     =========================================================================== */
  var DIFFS = {
    gully: { key: "gully", name: "GULLY",         barSpeed: 0.55, window: 0.28, aiSkill: 0.30, aiAggro: 0.55, fielders: 4,  aiTarget: [32, 46] },
    club:  { key: "club",  name: "CLUB",          barSpeed: 0.80, window: 0.20, aiSkill: 0.50, aiAggro: 0.85, fielders: 6,  aiTarget: [42, 58] },
    state: { key: "state", name: "STATE",         barSpeed: 1.05, window: 0.14, aiSkill: 0.68, aiAggro: 1.05, fielders: 7,  aiTarget: [52, 68] },
    intl:  { key: "intl",  name: "INTERNATIONAL", barSpeed: 1.30, window: 0.10, aiSkill: 0.82, aiAggro: 1.20, fielders: 8,  aiTarget: [62, 80] },
    legend:{ key: "legend",name: "LEGEND",        barSpeed: 1.60, window: 0.075, aiSkill: 0.94, aiAggro: 1.38, fielders: 9,  aiTarget: [72, 92] }
  };
  var DIFF_KEYS = ["gully", "club", "state", "intl", "legend"];

  /* ===========================================================================
     §6  MODES
     =========================================================================== */
  var MODES = {
    quick:    { key: "quick",    name: "QUICK MATCH",  desc: "5 overs, chase or defend",      overs: 5,  wkts: 10, solo: false, tour: false },
    tour:     { key: "tour",     name: "TOURNAMENT",   desc: "8 teams, QF → SF → Final",     overs: 5,  wkts: 10, solo: false, tour: true  },
    super:    { key: "super",    name: "SUPER OVER",   desc: "1 over, 2 wickets, pure drama",overs: 1,  wkts: 2,  solo: false, tour: false },
    endless:  { key: "endless",  name: "ENDLESS",      desc: "Bat until you're out",         overs: 20, wkts: 10, solo: true,  tour: false },
    practice: { key: "practice", name: "PRACTICE",     desc: "No wickets, learn the timing", overs: 10, wkts: 99, solo: true,  tour: false },
    career:   { key: "career",   name: "CAREER",       desc: "Play matches, earn XP, level up", overs: 5, wkts: 10, solo: false, tour: false }
  };
  var MODE_KEYS = ["quick", "tour", "super", "endless", "practice", "career"];

  /* ===========================================================================
     §7  ZONES (shot directions, 8 sectors)
     =========================================================================== */
  var ZONES = [
    { key: "slip",    name: "SLIP",      angle: -140, dist: 0.55 },
    { key: "third",   name: "THIRD MAN", angle: -110, dist: 0.85 },
    { key: "point",   name: "POINT",     angle: -60,  dist: 1.00 },
    { key: "cover",   name: "COVER",     angle: -20,  dist: 1.00 },
    { key: "straight",name: "STRAIGHT",  angle: 0,    dist: 1.05 },
    { key: "midw",    name: "MID-WICKET",angle: 30,   dist: 1.00 },
    { key: "square",  name: "SQ LEG",    angle: 70,   dist: 1.00 },
    { key: "fine",    name: "FINE LEG",  angle: 110,  dist: 0.85 }
  ];

  /* ===========================================================================
     §8  FIELD PRESETS
     =========================================================================== */
  var FIELD_PRESETS = {
    attacking:  { name: "ATTACKING",  spread: 0.65 },
    balanced:   { name: "BALANCED",   spread: 0.85 },
    defensive:  { name: "DEFENSIVE",  spread: 1.10 }
  };

  /* ===========================================================================
     §9  COMMENTARY
     =========================================================================== */
  var CMT = {
    six:      ["That's massive! Six runs!", "Out of the ground!", "Clean strike, no doubt!", "He's middled that perfectly!", "Six! What a shot!"],
    four:     ["Beautifully timed — FOUR!", "Cracked through the gap!", "Races away for four!", "Perfect placement!", "He found the gap!"],
    two:      ["Quick running, two runs.", "Good placement for two.", "They come back for the second."],
    one:      ["Pushed for a single.", "Rotates the strike.", "Easy single."],
    dot:      ["Solid defence.", "Dot ball, good bowling.", "No run there.", "Keeper takes it."],
    bowled:   ["BOWLED HIM! Timber!", "Through the gate!", "Stumps shattered!"],
    caught:   ["CAUGHT! Great catch!", "Straight to the fielder!", "He's holed out!"],
    lbw:      ["LBW! Plumb!", "That's hitting middle!", "Umpire's finger goes up!"],
    wide:     ["Wide called.", "Down the leg side."],
    noBall:   ["No ball!"],
    fifty:    ["FIFTY! Superb batting!", "Half century up!"],
    hundred:  ["HUNDRED! Magnificent!", "What an innings! Century!"]
  };

  /* ===========================================================================
     §10  GAME STATE
     =========================================================================== */
  var G = {
    screen: "boot",
    prev: null,
    menuSel: 0,
    settings: null,
    teams: { player: 0, opp: 1 },
    mode: "quick",
    diff: null,
    tour: null,
    match: null,
    innings: null,
    toss: null,
    career: null,
    time: 0,
    shake: 0,
    flash: 0,
    particles: [],
    commentary: [],
    commentaryScroll: 0,
    ball: null,
    camX: 0, camY: 0,
    keyHeld: {},
    touchHeld: {},
    hitboxes: []
  };

  /* ===========================================================================
     §11  STORAGE
     =========================================================================== */
  function loadJSON(key, fallback) {
    try {
      var s = localStorage.getItem(key);
      return s ? JSON.parse(s) : fallback;
    } catch (e) { return fallback; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function loadBest() {
    try { return parseInt(localStorage.getItem(LS_BEST), 10) || 0; } catch (e) { return 0; }
  }
  function saveBest(v) {
    try { localStorage.setItem(LS_BEST, String(v)); } catch (e) {}
    var el = document.getElementById("ck-best-disp");
    if (el) el.textContent = String(v);
  }
  function saveLast(line) {
    saveJSON(LS_LAST, { line: line, t: Date.now() });
  }
  function defaultSettings() {
    return { sound: true, palette: "day", scanlines: false, assist: true, difficulty: "club" };
  }
  function loadSettings() {
    var s = loadJSON(LS_SET, null) || defaultSettings();
    if (!PALETTES[s.palette]) s.palette = "day";
    if (!DIFFS[s.difficulty]) s.difficulty = "club";
    return s;
  }
  function saveSettings() { saveJSON(LS_SET, G.settings); }
  function loadCareer() {
    return loadJSON(LS_CAREER, { matches: 0, runs: 0, wickets: 0, best: 0, level: 1, xp: 0, history: [] });
  }

  /* ===========================================================================
     §12  AUDIO (Web Audio synthesis)
     =========================================================================== */
  var AC = null, master = null, muted = false;

  function audioInit() {
    if (AC) { if (AC.state === "suspended") AC.resume(); return; }
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    AC = new Ctx();
    master = AC.createGain();
    master.gain.value = 0.35;
    master.connect(AC.destination);
  }

  function tone(freq, dur, type, vol, when) {
    if (!AC || muted) return;
    var t = AC.currentTime + (when || 0);
    var o = AC.createOscillator();
    var g = AC.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function sweep(f1, f2, dur, type, vol) {
    if (!AC || muted) return;
    var t = AC.currentTime;
    var o = AC.createOscillator();
    var g = AC.createGain();
    o.type = type || "sawtooth";
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, freq) {
    if (!AC || muted) return;
    var t = AC.currentTime;
    var len = Math.floor(AC.sampleRate * dur);
    var buf = AC.createBuffer(1, len, AC.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = AC.createBufferSource();
    src.buffer = buf;
    var flt = AC.createBiquadFilter();
    flt.type = "bandpass";
    flt.frequency.value = freq || 800;
    flt.Q.value = 1.2;
    var g = AC.createGain();
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  var SFX = {
    click:   function () { tone(660, 0.05, "square", 0.10); },
    tick:    function () { tone(880, 0.03, "square", 0.08); },
    select:  function () { tone(990, 0.09, "square", 0.12); tone(1320, 0.10, "square", 0.10, 0.06); },
    bowl:    function () { tone(280, 0.10, "triangle", 0.15); },
    bat:     function () { noise(0.08, 0.30, 1200); tone(180, 0.12, "square", 0.18); },
    edge:    function () { tone(520, 0.05, "square", 0.15); },
    miss:    function () { tone(140, 0.18, "sawtooth", 0.20); },
    four:    function () { [660, 880, 1100].forEach(function (f, i) { tone(f, 0.13, "square", 0.13, i * 0.07); }); },
    six:     function () { [660, 880, 1100, 1320, 1760].forEach(function (f, i) { tone(f, 0.15, "square", 0.12, i * 0.07); }); },
    out:     function () { sweep(280, 60, 0.35, "sawtooth", 0.25); noise(0.25, 0.20, 300); },
    catch:   function () { tone(440, 0.08, "square", 0.18); tone(280, 0.10, "square", 0.15, 0.06); },
    cheer:   function () { noise(0.7, 0.15, 700); },
    win:     function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.18, "square", 0.12, i * 0.11); }); },
    lose:    function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.20, "triangle", 0.12, i * 0.13); }); },
    level:   function () { [880, 1100, 1320, 1760].forEach(function (f, i) { tone(f, 0.16, "square", 0.13, i * 0.09); }); }
  };

  /* ===========================================================================
     §13  CANVAS + PROJECTION
     =========================================================================== */
  var cv = document.getElementById("ck-board");
  var ctx = cv ? cv.getContext("2d") : null;
  if (ctx) ctx.imageSmoothingEnabled = true;

  /* 3D projection: camera at origin looking down +Z.
     World coordinates: X = right, Y = up, Z = forward.
     Returns screen coords + perspective scale. */
  function project(x, y, z) {
    if (z <= 0.5) return null;
    var focal = 520;                     // pixels per unit at z=1
    return {
      x: VW / 2 + (x * focal) / z,
      y: VH * 0.62 - (y * focal) / z,
      s: focal / z
    };
  }

  /* Camera views, blended per phase */
  var CAM = {
    bat:     { h: 2.0, z: -1.0, tilt: 0.10 },   // behind striker
    bowl:    { h: 2.2, z: 21.0, tilt: 0.08 },   // behind bowler
    field:   { h: 45,  z: 14.0, tilt: 0.6 },
    replay:  { h: 3.5, z: 8.0,  tilt: 0.3 }
  };
  var camBlend = 0;         // 0=bat, 1=bowl
  var camTarget = 0;
  var camMode = "bat";

  function setCam(mode) {
    camMode = mode;
    camTarget = mode === "bat" ? 0 : 1;
  }

  /* ===========================================================================
     §14  DRAW HELPERS
     =========================================================================== */
  function rect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function roundRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function text(str, x, y, size, color, align, font) {
    ctx.font = (size || 16) + "px " + (font || "'Barlow Condensed', sans-serif");
    ctx.fillStyle = color || "#fff";
    ctx.textAlign = align || "left";
    ctx.textBaseline = "middle";
    ctx.fillText(str, Math.round(x), Math.round(y));
  }
  function textMon(str, x, y, size, color, align) {
    text(str, x, y, size, color, align, "'JetBrains Mono', monospace");
  }

  /* ===========================================================================
     §15  WORLD DRAWING
     =========================================================================== */
  function drawSky() {
    var grd = ctx.createLinearGradient(0, 0, 0, VH * 0.55);
    grd.addColorStop(0, P.skyTop);
    grd.addColorStop(1, P.skyBot);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, VW, VH * 0.55);

    if (P === PALETTES.night) {
      for (var i = 0; i < 40; i++) {
        var sx = (i * 73) % VW;
        var sy = (i * 37) % (VH * 0.4);
        ctx.fillStyle = "rgba(255,255,255," + (0.3 + (i % 5) * 0.1) + ")";
        ctx.fillRect(sx, sy, 1, 1);
      }
      // Floodlight beams
      for (var f = 0; f < 4; f++) {
        var fx = 100 + f * 230;
        var grd2 = ctx.createRadialGradient(fx, -20, 10, fx, 250, 200);
        grd2.addColorStop(0, "rgba(255,255,220,0.35)");
        grd2.addColorStop(1, "rgba(255,255,220,0)");
        ctx.fillStyle = grd2;
        ctx.fillRect(fx - 200, 0, 400, 350);
      }
    } else if (P === PALETTES.day) {
      var sunGrd = ctx.createRadialGradient(760, 80, 10, 760, 80, 80);
      sunGrd.addColorStop(0, "rgba(255,255,200,0.95)");
      sunGrd.addColorStop(1, "rgba(255,255,200,0)");
      ctx.fillStyle = sunGrd;
      ctx.beginPath(); ctx.arc(760, 80, 80, 0, Math.PI * 2); ctx.fill();
    } else if (P === PALETTES.dusk) {
      ctx.fillStyle = "rgba(255,220,120,0.85)";
      ctx.beginPath(); ctx.arc(720, 200, 46, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawCrowd() {
    var top = VH * 0.42;
    var bot = VH * 0.52;
    ctx.fillStyle = P.crowd;
    ctx.fillRect(0, top, VW, bot - top);
    for (var i = 0; i < 260; i++) {
      var cx = (i * 41) % VW;
      var cy = top + ((i * 13) % (bot - top));
      ctx.fillStyle = P.crowdDot[i % P.crowdDot.length];
      ctx.fillRect(cx, cy, 2, 2);
    }
  }

  function drawGround() {
    var hz = VH * 0.55;
    // mown stripes
    for (var y = hz; y < VH; y += 24) {
      var t = (y - hz) / (VH - hz);
      var col = ((y / 24) | 0) % 2 ? P.grassA : P.grassB;
      ctx.fillStyle = col;
      ctx.fillRect(0, y, VW, 24);
    }
    // horizon fog
    var grd = ctx.createLinearGradient(0, hz - 20, 0, hz + 30);
    grd.addColorStop(0, "rgba(255,255,255,0)");
    grd.addColorStop(1, "rgba(255,255,255,0.10)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, hz - 20, VW, 60);

    // boundary rope
    var rope = project(0, 0, 40);
    if (rope) {
      ctx.strokeStyle = P.boundary;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(VW / 2, VH * 0.85, VW * 0.48, VH * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawPitch3D() {
    // Striker end at z=0, bowler end at z=20
    var corners = [
      project(-1.5, 0, 0), project(1.5, 0, 0),
      project(1.0, 0, 20), project(-1.0, 0, 20)
    ];
    if (corners.some(function (c) { return !c; })) return;

    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();
    ctx.fillStyle = P.pitch;
    ctx.fill();

    // creases
    var creaseNear = [project(-1.4, 0, 0.3), project(1.4, 0, 0.3)];
    if (creaseNear[0] && creaseNear[1]) {
      ctx.strokeStyle = P.crease;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(creaseNear[0].x, creaseNear[0].y);
      ctx.lineTo(creaseNear[1].x, creaseNear[1].y);
      ctx.stroke();
    }
    var creaseFar = [project(-1.0, 0, 19.7), project(1.0, 0, 19.7)];
    if (creaseFar[0] && creaseFar[1]) {
      ctx.strokeStyle = P.crease;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(creaseFar[0].x, creaseFar[0].y);
      ctx.lineTo(creaseFar[1].x, creaseFar[1].y);
      ctx.stroke();
    }
  }

  function drawStumps(worldX, worldZ, height, batsmanEnd) {
    var top = project(worldX, height || 0.7, worldZ);
    var bot = project(worldX, 0, worldZ);
    if (!top || !bot) return;
    var w = batsmanEnd ? 3 : 2;
    ctx.fillStyle = P.stump;
    ctx.fillRect(top.x - w * 1.2, top.y, w, bot.y - top.y);
    ctx.fillRect(top.x, top.y, w, bot.y - top.y);
    ctx.fillRect(top.x + w * 1.2, top.y, w, bot.y - top.y);
    // bails
    ctx.fillStyle = P.bail;
    ctx.fillRect(top.x - w * 1.2, top.y - 2, w * 3.4, 2);
  }

  /* Simple humanoid — tuned for perspective */
  function drawPlayer(x, z, kitA, kitB, anim, facingAway) {
    var base = project(x, 0, z);
    var head = project(x, 1.75, z);
    if (!base || !head) return;

    var scale = base.s;
    var w = Math.max(2, scale * 0.35);
    var h = base.y - head.y;

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(base.x, base.y + 1, w * 1.4, w * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // legs
    var legSwing = Math.sin(anim * 10) * scale * 0.15;
    ctx.fillStyle = kitB;
    ctx.fillRect(base.x - w * 0.7, base.y - h * 0.42, w * 0.6, h * 0.42);
    ctx.fillRect(base.x + w * 0.1, base.y - h * 0.42, w * 0.6, h * 0.42);

    // torso
    ctx.fillStyle = kitA;
    ctx.fillRect(base.x - w * 0.85, head.y + h * 0.55, w * 1.7, h * 0.45);

    // head
    ctx.fillStyle = P.skin;
    var headR = scale * 0.22;
    ctx.beginPath();
    ctx.arc(base.x, head.y + headR, headR, 0, Math.PI * 2);
    ctx.fill();

    // helmet
    ctx.fillStyle = P.helmet;
    ctx.beginPath();
    ctx.arc(base.x, head.y + headR, headR * 1.05, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(base.x - headR * 1.05, head.y + headR * 0.6, headR * 2.1, headR * 0.6);
  }

  /* Player with bat — used for striker */
  function drawBatsman3D(x, z, kitA, kitB, swingPhase) {
    var base = project(x, 0, z);
    var head = project(x, 1.75, z);
    if (!base || !head) return;

    var scale = base.s;
    var w = Math.max(2, scale * 0.35);
    var h = base.y - head.y;

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(base.x, base.y + 1, w * 1.5, w * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // legs (pads)
    ctx.fillStyle = P.pads;
    ctx.fillRect(base.x - w * 0.75, base.y - h * 0.42, w * 0.65, h * 0.42);
    ctx.fillRect(base.x + w * 0.1, base.y - h * 0.42, w * 0.65, h * 0.42);

    // torso
    ctx.fillStyle = kitA;
    ctx.fillRect(base.x - w * 0.9, head.y + h * 0.55, w * 1.8, h * 0.45);
    ctx.fillStyle = kitB;
    ctx.fillRect(base.x - w * 0.9, head.y + h * 0.75, w * 1.8, h * 0.08);

    // head + helmet
    ctx.fillStyle = P.skin;
    var headR = scale * 0.22;
    ctx.beginPath();
    ctx.arc(base.x, head.y + headR, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.helmet;
    ctx.beginPath();
    ctx.arc(base.x, head.y + headR, headR * 1.05, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(base.x - headR * 1.05, head.y + headR * 0.6, headR * 2.1, headR * 0.6);

    // bat
    var batAng;
    if (swingPhase > 0) {
      batAng = -1.2 + swingPhase * 2.8;   // arc from backlift to follow-through
    } else {
      batAng = -0.5;
    }
    var batLen = scale * 0.9;
    var gripX = base.x + w * 1.1;
    var gripY = head.y + h * 0.65;

    ctx.save();
    ctx.translate(gripX, gripY);
    ctx.rotate(batAng);
    ctx.fillStyle = P.batGrip;
    ctx.fillRect(-1.5, -scale * 0.15, 3, scale * 0.15);
    ctx.fillStyle = P.bat;
    ctx.fillRect(-scale * 0.09, 0, scale * 0.18, batLen);
    ctx.restore();
  }

  /* Ball with trail */
  function drawBall3D(x, y, z, size) {
    var p = project(x, y, z);
    if (!p) return;
    var r = Math.max(3, (p.s * 0.11) * (size || 1));
    // shadow
    var sh = project(x, 0, z);
    if (sh) {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(sh.x, sh.y, r * 1.3, r * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // ball
    var grd = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, r * 0.1, p.x, p.y, r);
    grd.addColorStop(0, P.ballHi);
    grd.addColorStop(1, P.ball);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    // seam
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.7, -0.6, 0.6);
    ctx.stroke();
  }

  function drawFielders(worldPositions, kitA) {
    for (var i = 0; i < worldPositions.length; i++) {
      var f = worldPositions[i];
      drawPlayer(f.x, f.z, P.fielderHome, kitA, 0, false);
    }
  }

  /* ===========================================================================
     §16  HUD & MENUS
     =========================================================================== */
  function drawHUDPanel(x, y, w, h) {
    roundRect(x, y, w, h, 8, P.hudBg, P.hudBorder);
    ctx.strokeStyle = P.hudBorder;
    ctx.lineWidth = 1;
  }

  function drawHUD() {
    if (!G.innings) return;
    var I = G.innings, m = G.match;

    // Top scoreboard
    drawHUDPanel(20, 20, 320, 56);
    text(m.playerTeam.id, 36, 42, 22, P.uiAccent);
    textMon(I.runs + "/" + I.wkts, 100, 42, 22, P.uiText);
    textMon(Math.floor(I.balls / 6) + "." + (I.balls % 6), 210, 42, 20, P.uiDim);
    text("OVERS", 250, 42, 11, P.uiDim);

    if (I.target) {
      var need = Math.max(0, I.target - I.runs);
      var left = Math.max(0, I.maxBalls - I.balls);
      textMon("NEED " + need + " OFF " + left, 100, 64, 13, need > 0 ? P.uiAccent : P.perfect);
    } else {
      text("BATTING", 100, 64, 12, P.uiDim);
    }

    // Opponent / info
    drawHUDPanel(VW - 320, 20, 300, 56);
    text(m.oppTeam.id, VW - 300, 42, 22, P.uiAccent);
    text(S(0) || "", 0, 0, 0); // spacer
    text(m.oppTeam.name.toUpperCase(), VW - 250, 42, 18, P.uiText);
    text(G.diff.name, VW - 250, 62, 12, P.uiDim);
    if (I.target) {
      textMon("TGT " + I.target, VW - 60, 42, 16, P.uiAccent, "right");
    }

    // Commentary feed (bottom left)
    drawHUDPanel(20, VH - 190, 280, 170);
    text("COMMENTARY", 36, VH - 172, 12, P.uiAccent);
    var cmt = G.commentary.slice(-5);
    for (var i = 0; i < cmt.length; i++) {
      var line = cmt[cmt.length - 1 - i];
      var age = Math.min(1, (Date.now() - line.t) / 15000);
      ctx.globalAlpha = 1 - age * 0.7;
      text(line.text, 36, VH - 150 + i * 22, 12, P.uiText);
      ctx.globalAlpha = 1;
    }

    // Wagon wheel / mini stats (bottom right)
    drawHUDPanel(VW - 200, VH - 130, 180, 110);
    text("STRIKE RATE", VW - 190, VH - 112, 11, P.uiDim);
    textMon(I.balls ? Math.round(I.runs / I.balls * 100) : 0, VW - 190, VH - 90, 22, P.uiText);
    text("4s " + I.fours + "   6s " + I.sixes, VW - 190, VH - 62, 13, P.uiDim);
    if (I.target) {
      var rr = I.balls ? ((I.runs / I.balls) * 6).toFixed(1) : "0.0";
      text("RR " + rr, VW - 190, VH - 44, 13, P.uiText);
    }

    // Timing bar (bottom center, during flight)
    if (G.ball && G.ball.phase === "flight" && G.ball.batting) {
      drawTimingBar();
    }

    // Aim indicator (bottom center)
    if (G.ball && G.ball.phase === "flight" && G.ball.batting) {
      drawAimIndicator();
    }

    // Bowling controls
    if (G.ball && (G.ball.phase === "aim" || G.ball.phase === "release")) {
      drawBowlingControls();
    }
  }

  function drawTimingBar() {
    var b = G.ball;
    var cx = VW / 2;
    var y = VH - 44;
    var w = 340, h = 12;
    drawHUDPanel(cx - w / 2 - 8, y - 10, w + 16, h + 20);
    // zones
    var win = G.diff.window;
    rect(cx - w / 2, y, w, h, P.miss);
    rect(cx - w / 2 + (0.5 - win) * w, y, win * 2 * w, h, P.ok);
    rect(cx - w / 2 + (0.5 - win * 0.72) * w, y, win * 1.44 * w, h, P.good);
    rect(cx - w / 2 + (0.5 - win * 0.30) * w, y, win * 0.60 * w, h, P.perfect);
    // marker
    var mx = cx - w / 2 + b.timPos * w;
    ctx.fillStyle = "#fff";
    ctx.fillRect(mx - 1.5, y - 4, 3, h + 8);
    // label
    text("TIMING", cx, y - 18, 11, P.uiDim, "center");
  }

  function drawAimIndicator() {
    var b = G.ball;
    var cx = VW / 2;
    var z = ZONES[b.aim];
    var onFielder = b.fielders.indexOf(b.aim) >= 0;
    var col = onFielder ? P.miss : P.uiAccent;
    var label = z.name + (onFielder ? " (!)" : "");
    var sub = b.loft ? "LOFT" : "GROUND";
    drawHUDPanel(cx - 120, VH - 100, 240, 44);
    text(label, cx, VH - 86, 16, col, "center");
    text(sub + "  ·  ◀ ▶ to aim", cx, VH - 68, 11, P.uiDim, "center");
  }

  function drawBowlingControls() {
    var b = G.ball;
    var cx = VW / 2;
    if (b.phase === "aim") {
      // Length picker
      drawHUDPanel(cx - 220, VH - 150, 440, 110);
      text("LENGTH", cx - 200, VH - 130, 12, P.uiDim);
      var lens = ["SHORT", "GOOD", "FULL", "YORKER"];
      for (var i = 0; i < 4; i++) {
        var bx = cx - 200 + i * 100;
        var on = i === b.length;
        roundRect(bx, VH - 112, 90, 32, 6, on ? P.btnActive : P.btnBg, on ? P.uiAccent : P.panelBorder);
        text(lens[i], bx + 45, VH - 96, 13, on ? P.uiAccent : P.uiDim, "center");
      }
      // Line picker
      text("LINE", cx - 200, VH - 60, 12, P.uiDim);
      var lines = ["LEG", "MIDDLE", "OFF"];
      for (var j = 0; j < 3; j++) {
        var lx = cx - 120 + j * 100;
        var on2 = j === b.line;
        roundRect(lx, VH - 62, 90, 28, 6, on2 ? P.btnActive : P.btnBg, on2 ? P.uiAccent : P.panelBorder);
        text(lines[j], lx + 45, VH - 48, 13, on2 ? P.uiAccent : P.uiDim, "center");
      }
      text("SPACE: BOWL", cx, VH - 18, 12, P.uiAccent, "center");
    } else if (b.phase === "release") {
      // Release meter
      var y = VH - 60;
      var w = 380, h = 16;
      drawHUDPanel(cx - w / 2 - 10, y - 30, w + 20, h + 40);
      text("RELEASE", cx, y - 16, 12, P.uiDim, "center");
      rect(cx - w / 2, y, w, h, P.miss);
      rect(cx - w / 2 + w * 0.40, y, w * 0.20, h, P.perfect);
      rect(cx - w / 2 + w * 0.30, y, w * 0.40, h, P.good);
      var mx = cx - w / 2 + b.accPos * w;
      ctx.fillStyle = "#fff";
      ctx.fillRect(mx - 2, y - 6, 4, h + 12);
    }
  }

  /* ===========================================================================
     §17  MENUS
     =========================================================================== */
  function drawMenuBackground() {
    drawSky();
    drawCrowd();
    drawGround();
    // vignette
    var grd = ctx.createRadialGradient(VW / 2, VH / 2, 150, VW / 2, VH / 2, 500);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, VW, VH);
  }

  function drawMenuButton(x, y, w, h, label, selected, desc) {
    roundRect(x, y, w, h, 10, selected ? P.btnActive : P.panelBg, selected ? P.uiAccent : P.panelBorder);
    if (selected) {
      roundRect(x, y, w, h, 10, null, P.uiAccent);
    }
    text(label, x + w / 2, y + h / 2 - (desc ? 8 : 0), 22, selected ? "#fff" : P.uiText, "center");
    if (desc) text(desc, x + w / 2, y + h / 2 + 12, 12, P.uiDim, "center");
    return { x: x, y: y, w: w, h: h };
  }

  function drawMainMenu() {
    drawMenuBackground();

    // Title
    var grd = ctx.createLinearGradient(0, 60, 0, 160);
    grd.addColorStop(0, P.uiAccent);
    grd.addColorStop(1, "#ffffff");
    ctx.font = "900 72px 'Barlow Condensed', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillText("CRICKET LEGENDS", VW / 2 + 3, 118);
    ctx.fillStyle = grd;
    ctx.fillText("CRICKET LEGENDS", VW / 2, 115);
    text("MODERN BROWSER CRICKET", VW / 2, 165, 14, P.uiDim, "center");

    // Menu items
    var items = [
      { label: "QUICK MATCH", mode: "quick", desc: "5 overs. Bat or bowl." },
      { label: "TOURNAMENT", mode: "tour", desc: "8 teams. QF → SF → Final." },
      { label: "SUPER OVER", mode: "super", desc: "1 over. 2 wickets. Drama." },
      { label: "ENDLESS", mode: "endless", desc: "Bat until you're out." },
      { label: "PRACTICE", mode: "practice", desc: "Learn the timing." },
      { label: "CAREER", mode: "career", desc: "Level up your player." },
      { label: "SETTINGS", mode: "settings", desc: "Sound, theme, difficulty." }
    ];

    var startY = 210;
    var btnW = 340, btnH = 44, gap = 8;
    G.hitboxes = [];
    for (var i = 0; i < items.length; i++) {
      var y = startY + i * (btnH + gap);
      var b = drawMenuButton(VW / 2 - btnW / 2, y, btnW, btnH, items[i].label, i === G.menuSel, items[i].desc);
      b.action = items[i].mode;
      G.hitboxes.push(b);
    }

    // Footer info
    var best = loadBest();
    if (best) {
      text("PERSONAL BEST: " + best + " RUNS", VW / 2, VH - 30, 14, P.uiAccent, "center");
    }
  }

  function drawTeamSelect() {
    drawMenuBackground();
    text("NEW MATCH", VW / 2, 46, 32, P.uiAccent, "center");
    text(MODES[G.mode].name, VW / 2, 82, 18, P.uiText, "center");
    text(MODES[G.mode].desc, VW / 2, 106, 13, P.uiDim, "center");

    // Player team card
    var t = TEAMS[G.teams.player];
    var cardX = VW / 2 - 320, cardY = 140, cardW = 280, cardH = 200;
    roundRect(cardX, cardY, cardW, cardH, 12, P.panelBg, P.panelBorder);
    ctx.fillStyle = t.kitA;
    ctx.fillRect(cardX, cardY, cardW, 50);
    ctx.fillStyle = t.kitB;
    ctx.fillRect(cardX, cardY + 50, cardW, 6);
    text(t.id, cardX + cardW / 2, cardY + 26, 36, "#fff", "center");
    text(t.name.toUpperCase(), cardX + cardW / 2, cardY + 80, 22, P.uiText, "center");
    text("YOUR TEAM", cardX + cardW / 2, cardY + 106, 12, P.uiDim, "center");

    // Difficulty picker (middle)
    var d = DIFFS[G.settings.difficulty];
    var dX = VW / 2 - 80, dY = 190, dW = 160, dH = 90;
    roundRect(dX, dY, dW, dH, 12, P.panelBg, P.panelBorder);
    text("DIFFICULTY", dX + dW / 2, dY + 20, 12, P.uiDim, "center");
    text(d.name, dX + dW / 2, dY + 48, 24, P.uiAccent, "center");
    text("◀ ▶", dX + dW / 2, dY + 74, 14, P.uiDim, "center");

    // Opponent team card
    var ot = TEAMS[G.teams.opp];
    var ocX = VW / 2 + 40;
    roundRect(ocX, cardY, cardW, cardH, 12, P.panelBg, P.panelBorder);
    ctx.fillStyle = ot.kitA;
    ctx.fillRect(ocX, cardY, cardW, 50);
    ctx.fillStyle = ot.kitB;
    ctx.fillRect(ocX, cardY + 50, cardW, 6);
    text(ot.id, ocX + cardW / 2, cardY + 26, 36, "#fff", "center");
    text(ot.name.toUpperCase(), ocX + cardW / 2, cardY + 80, 22, P.uiText, "center");
    text("OPPONENT", ocX + cardW / 2, cardY + 106, 12, P.uiDim, "center");

    // Controls
    G.hitboxes = [
      { x: cardX, y: cardY, w: cardW, h: cardH, action: "prevTeam" },
      { x: ocX, y: cardY, w: cardW, h: cardH, action: "nextOpp" },
      { x: dX, y: dY, w: dW, h: dH, action: "cycleDiff" }
    ];

    roundRect(VW / 2 - 100, VH - 80, 200, 48, 10, P.btnActive, P.uiAccent);
    text("START MATCH", VW / 2, VH - 56, 22, "#fff", "center");
    G.hitboxes.push({ x: VW / 2 - 100, y: VH - 80, w: 200, h: 48, action: "startMatch" });
    G.hitboxes.push({ x: 20, y: VH - 50, w: 100, h: 36, action: "back" });
    roundRect(20, VH - 50, 100, 36, 6, P.btnBg, P.panelBorder);
    text("BACK", 70, VH - 32, 14, P.uiText, "center");
  }

  function drawTossScreen() {
    drawMenuBackground();
    var T = G.toss;
    text("THE TOSS", VW / 2, 60, 44, P.uiAccent, "center");

    if (T.phase === "call") {
      text("CALL IT", VW / 2, 130, 20, P.uiText, "center");
      var coins = ["HEADS", "TAILS"];
      for (var i = 0; i < 2; i++) {
        var x = VW / 2 - 220 + i * 240;
        var on = i === T.sel;
        roundRect(x, 200, 200, 80, 12, on ? P.btnActive : P.panelBg, on ? P.uiAccent : P.panelBorder);
        text(coins[i], x + 100, 240, 28, on ? "#fff" : P.uiText, "center");
        G.hitboxes.push({ x: x, y: 200, w: 200, h: 80, action: "call" + i });
      }
      text("◀ ▶ to choose  ·  SPACE to flip", VW / 2, 340, 14, P.uiDim, "center");
    } else if (T.phase === "flip") {
      var spin = Math.abs(Math.cos(T.timer * 14));
      var cw = 120 * spin, ch = 120;
      ctx.fillStyle = P.uiAccent;
      ctx.beginPath();
      ctx.ellipse(VW / 2, 260, cw, ch * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = P.uiText;
      text("FLIPPING...", VW / 2, 400, 20, P.uiDim, "center");
    } else if (T.phase === "choice") {
      text(T.result.toUpperCase() + "!", VW / 2, 130, 30, P.uiText, "center");
      text("YOU WIN THE TOSS", VW / 2, 175, 20, P.uiAccent, "center");
      var opts = ["BAT FIRST", "BOWL FIRST"];
      for (var j = 0; j < 2; j++) {
        var bx = VW / 2 - 220 + j * 240;
        var on2 = j === T.sel;
        roundRect(bx, 220, 200, 80, 12, on2 ? P.btnActive : P.panelBg, on2 ? P.uiAccent : P.panelBorder);
        text(opts[j], bx + 100, 260, 24, on2 ? "#fff" : P.uiText, "center");
        G.hitboxes.push({ x: bx, y: 220, w: 200, h: 80, action: "choose" + j });
      }
    } else if (T.phase === "lost") {
      text(T.result.toUpperCase() + "!", VW / 2, 130, 30, P.uiText, "center");
      text("OPPONENT WINS THE TOSS", VW / 2, 175, 20, P.uiDim, "center");
      text("THEY CHOSE TO " + (T.aiChoice === "bat" ? "BAT" : "BOWL"), VW / 2, 240, 24, P.uiAccent, "center");
      roundRect(VW / 2 - 100, 320, 200, 60, 10, P.btnActive, P.uiAccent);
      text("CONTINUE", VW / 2, 350, 20, "#fff", "center");
      G.hitboxes.push({ x: VW / 2 - 100, y: 320, w: 200, h: 60, action: "continue" });
    }
  }

  function drawResultScreen() {
    var m = G.match;
    drawMenuBackground();

    // Big banner
    var isWin = m.result === "win";
    var isTie = m.result === "tie";
    var title = isWin ? "VICTORY" : isTie ? "TIED MATCH" : "DEFEAT";
    var col = isWin ? P.perfect : isTie ? P.uiAccent : P.miss;

    var grd = ctx.createLinearGradient(0, 100, 0, 200);
    grd.addColorStop(0, col);
    grd.addColorStop(1, "#ffffff");
    ctx.font = "900 72px 'Barlow Condensed', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillText(title, VW / 2 + 3, 163);
    ctx.fillStyle = grd;
    ctx.fillText(title, VW / 2, 160);

    text(m.margin || "", VW / 2, 210, 20, P.uiText, "center");

    // Scorecard comparison
    var ps = m.playerScore, os = m.oppScore;
    var cardY = 250, cardH = 140;
    roundRect(VW / 2 - 300, cardY, 280, cardH, 12, P.panelBg, P.panelBorder);
    roundRect(VW / 2 + 20, cardY, 280, cardH, 12, P.panelBg, P.panelBorder);

    text("YOU", VW / 2 - 160, cardY + 26, 16, P.uiDim, "center");
    text(m.playerTeam.name.toUpperCase(), VW / 2 - 160, cardY + 50, 14, P.uiText, "center");
    textMon((ps ? ps.runs : 0) + "/" + (ps ? ps.wkts : 0), VW / 2 - 160, cardY + 84, 36, P.uiAccent, "center");
    if (ps) {
      text(Math.floor(ps.balls / 6) + "." + (ps.balls % 6) + " OV  ·  " + ps.fours + "×4  " + ps.sixes + "×6", VW / 2 - 160, cardY + 118, 12, P.uiDim, "center");
    }

    text("THEM", VW / 2 + 160, cardY + 26, 16, P.uiDim, "center");
    text(m.oppTeam.name.toUpperCase(), VW / 2 + 160, cardY + 50, 14, P.uiText, "center");
    if (os) {
      textMon(os.runs + "/" + os.wkts, VW / 2 + 160, cardY + 84, 36, P.uiText, "center");
      text(Math.floor(os.balls / 6) + "." + (os.balls % 6) + " OV", VW / 2 + 160, cardY + 118, 12, P.uiDim, "center");
    } else {
      text("—", VW / 2 + 160, cardY + 84, 36, P.uiDim, "center");
    }

    // Buttons
    G.hitboxes = [];
    var btns = [
      { label: "PLAY AGAIN", action: "restart", x: VW / 2 - 220, y: VH - 110 },
      { label: "MAIN MENU",  action: "menu",    x: VW / 2 + 20,  y: VH - 110 }
    ];
    for (var i = 0; i < btns.length; i++) {
      roundRect(btns[i].x, btns[i].y, 200, 56, 10, P.btnActive, P.uiAccent);
      text(btns[i].label, btns[i].x + 100, btns[i].y + 28, 20, "#fff", "center");
      G.hitboxes.push({ x: btns[i].x, y: btns[i].y, w: 200, h: 56, action: btns[i].action });
    }
  }

  function drawSettings() {
    drawMenuBackground();
    text("SETTINGS", VW / 2, 60, 44, P.uiAccent, "center");

    var items = [
      { label: "SOUND", value: G.settings.sound ? "ON" : "OFF" },
      { label: "THEME", value: PALETTES[G.settings.palette].name },
      { label: "SCANLINES", value: G.settings.scanlines ? "ON" : "OFF" },
      { label: "TIMING AID", value: G.settings.assist ? "ON" : "OFF" },
      { label: "BACK", value: "" }
    ];

    G.hitboxes = [];
    for (var i = 0; i < items.length; i++) {
      var y = 140 + i * 60;
      var on = i === G.menuSel;
      roundRect(VW / 2 - 250, y, 500, 48, 8, on ? P.btnActive : P.panelBg, on ? P.uiAccent : P.panelBorder);
      text(items[i].label, VW / 2 - 230, y + 24, 18, on ? "#fff" : P.uiText);
      if (items[i].value) {
        text(items[i].value, VW / 2 + 230, y + 24, 18, on ? P.uiAccent : P.uiDim, "right");
      }
      G.hitboxes.push({ x: VW / 2 - 250, y: y, w: 500, h: 48, action: "setting" + i });
    }
  }

  function drawHowTo() {
    drawMenuBackground();
    text("HOW TO PLAY", VW / 2, 50, 40, P.uiAccent, "center");

    var sections = [
      { title: "BATTING", lines: [
        "◀ ▶  aim at a gap",
        "▲ ▼  loft / ground shot",
        "SPACE  swing",
        "Time it well — the marker must hit the green"
      ]},
      { title: "BOWLING", lines: [
        "◀ ▶  change line (leg / middle / off)",
        "▲ ▼  change length (short / good / full / yorker)",
        "SPACE  start release meter",
        "SPACE again  release when the marker is centered"
      ]},
      { title: "MATCH", lines: [
        "Win the toss — bat or bowl, both are yours",
        "P  pause   M  mute   ESC  back to menu",
        "On mobile: D-pad + HIT button"
      ]}
    ];

    var startY = 100;
    for (var s = 0; s < sections.length; s++) {
      text(sections[s].title, 80, startY + s * 150, 20, P.uiAccent);
      for (var l = 0; l < sections[s].lines.length; l++) {
        text(sections[s].lines[l], 100, startY + s * 150 + 30 + l * 22, 14, P.uiText);
      }
    }

    roundRect(VW / 2 - 80, VH - 60, 160, 44, 8, P.btnActive, P.uiAccent);
    text("GOT IT", VW / 2, VH - 38, 18, "#fff", "center");
    G.hitboxes = [{ x: VW / 2 - 80, y: VH - 60, w: 160, h: 44, action: "back" }];
  }

  function drawPause() {
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, VW, VH);
    text("PAUSED", VW / 2, 150, 56, P.uiAccent, "center");

    var items = ["RESUME", "RESTART", "MAIN MENU"];
    G.hitboxes = [];
    for (var i = 0; i < 3; i++) {
      var y = 240 + i * 60;
      var on = i === G.menuSel;
      roundRect(VW / 2 - 150, y, 300, 48, 8, on ? P.btnActive : P.panelBg, on ? P.uiAccent : P.panelBorder);
      text(items[i], VW / 2, y + 24, 20, on ? "#fff" : P.uiText, "center");
      G.hitboxes.push({ x: VW / 2 - 150, y: y, w: 300, h: 48, action: "pause" + i });
    }
  }

  function drawInningsBreak() {
    drawMenuBackground();
    text("INNINGS BREAK", VW / 2, 80, 44, P.uiAccent, "center");
    var m = G.match;
    var first = m.first, second = G.innings;

    if (first) {
      text("FIRST INNINGS", VW / 2, 160, 18, P.uiDim, "center");
      textMon(first.runs + "/" + first.wkts, VW / 2, 200, 48, P.uiText, "center");
      text(Math.floor(first.balls / 6) + "." + (first.balls % 6) + " OVERS", VW / 2, 240, 16, P.uiDim, "center");
    }

    if (second && second.target) {
      text("TARGET", VW / 2, 300, 18, P.uiDim, "center");
      textMon(String(second.target), VW / 2, 340, 56, P.uiAccent, "center");
      text("FROM " + Math.floor(second.maxBalls / 6) + " OVERS", VW / 2, 380, 16, P.uiDim, "center");
    }

    roundRect(VW / 2 - 100, VH - 100, 200, 56, 10, P.btnActive, P.uiAccent);
    text("CONTINUE", VW / 2, VH - 72, 22, "#fff", "center");
    G.hitboxes = [{ x: VW / 2 - 100, y: VH - 100, w: 200, h: 56, action: "continue" }];
  }

  /* ===========================================================================
     §18  PARTICLE EFFECTS
     =========================================================================== */
  function burst(x, y, color, count) {
    for (var i = 0; i < count; i++) {
      G.particles.push({
        x: x, y: y,
        vx: rand(-200, 200),
        vy: rand(-300, -50),
        life: rand(0.5, 1.2),
        color: color,
        size: rand(2, 5)
      });
    }
  }

  function updateParticles(dt) {
    for (var i = G.particles.length - 1; i >= 0; i--) {
      var p = G.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 800 * dt;
      p.life -= dt;
      if (p.life <= 0) G.particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (var i = 0; i < G.particles.length; i++) {
      var p = G.particles[i];
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  /* ===========================================================================
     §19  COMMENTARY HELPER
     =========================================================================== */
  function say(text) {
    G.commentary.push({ text: text, t: Date.now() });
    if (G.commentary.length > 20) G.commentary.shift();
  }

  /* ===========================================================================
     §20  GAME FLOW — match start
     =========================================================================== */
  function startMatch() {
    var mode = MODES[G.mode];
    var playerTeam = TEAMS[G.teams.player];
    var oppTeam = TEAMS[G.teams.opp];
    G.diff = DIFFS[G.settings.difficulty];

    // Tournament: build bracket
    if (mode.tour) {
      var others = shuffle(TEAMS.filter(function (t, i) { return i !== G.teams.player; }));
      G.tour = { round: 0, player: playerTeam, opponents: others.slice(0, 3), won: [] };
    } else {
      G.tour = null;
    }

    G.match = {
      mode: G.mode,
      modeDef: mode,
      overs: mode.overs,
      wkts: mode.wkts,
      solo: mode.solo,
      playerTeam: playerTeam,
      oppTeam: oppTeam,
      innings: 1,
      first: null,
      second: null,
      playerScore: null,
      oppScore: null,
      target: 0,
      result: null,
      margin: "",
      playerBatsFirst: false
    };

    G.commentary = [];
    setState("toss");
  }

  function openToss() {
    G.toss = {
      phase: "call", sel: 0, timer: 0, resolved: false,
      result: null, won: false, aiChoice: null
    };
    G.menuSel = 0;
    setState("toss");
  }

  function resolveTossFlip() {
    var T = G.toss;
    T.result = Math.random() < 0.5 ? "heads" : "tails";
    T.won = (T.sel === 0 ? "heads" : "tails") === T.result;
    T.resolved = true;
    if (T.won) {
      T.phase = "choice";
      T.sel = 0;
    } else {
      T.aiChoice = Math.random() < 0.6 ? "bat" : "bowl";
      T.phase = "lost";
    }
  }

  function startAfterToss() {
    var T = G.toss;
    var playerBats = T.won ? (T.sel === 0) : (T.aiChoice === "bowl");
    G.match.playerBatsFirst = playerBats;
    beginInnings(playerBats ? "player" : "ai", 0);
  }

  /* ===========================================================================
     §21  INNINGS
     =========================================================================== */
  function beginInnings(batting, target) {
    var m = G.match;
    G.innings = {
      batting: batting,
      runs: 0, wkts: 0, balls: 0,
      fours: 0, sixes: 0, dots: 0,
      maxBalls: m.overs * BPO,
      maxWkts: m.wkts,
      target: target,
      history: [],
      phase: "ready",
      phaseT: 0,
      finished: false
    };
    setCam(batting === "player" ? "bat" : "bowl");
    setState("innings");
    nextBall();
  }

  function nextBall() {
    var I = G.innings;
    if (!I || I.finished) return;

    I.phase = "ready";
    I.phaseT = 0;
    I.message = "";
    I.messageT = 0;

    var batting = I.batting === "player";
    var aim = batting ? Math.floor(Math.random() * 8) : 4;

    G.ball = {
      phase: batting ? "flight" : "aim",
      batting: batting,
      t: 0,
      duration: batting ? (1.1 / G.diff.barSpeed) : 1.3,
      // Delivery info

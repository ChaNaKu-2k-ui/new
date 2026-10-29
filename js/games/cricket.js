/* ============================================================================
   CRICKET LEGENDS v4.1 — rebuilt engine, camera fixed
   ========================================================================== */
(function () {
  "use strict";

  var VW = 900, VH = 600, BPO = 6, FOCAL = 420;
  var LS_SET = "cnk-cricket-settings";
  var LS_BEST = "cnk-cricket-best";
  var LS_LAST = "cnk-cricket-last";
  var LS_CAREER = "cnk-cricket-career";

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var PALETTES = {
    day: { name: "DAY", skyTop: "#5ba8d8", skyBot: "#c4e4f0", sun: "#ffe9a8", grassA: "#4ea83d", grassB: "#439434", pitch: "#c8b991", pitchAlt: "#c0b184", crease: "#f0e6c8", crowd: "#1e2a1e", crowdDot: ["#e0c060","#c04060","#5070c0","#60a040","#e0e0e0"], boundary: "#ffffff", hudBg: "rgba(0,15,0,0.78)", hudBorder: "rgba(255,255,255,0.18)", uiText: "#ffffff", uiDim: "#a8c8a0", uiAccent: "#ffd600", panelBg: "rgba(0,20,10,0.94)", panelBorder: "rgba(255,255,255,0.25)", btnBg: "#0f3a0f", btnActive: "#2a7a2a", btnText: "#eaffd0", perfect: "#4aff4a", good: "#ffcc00", ok: "#ff8800", miss: "#a03030", ball: "#c42020", ballHi: "#ff8080", skin: "#d4a878", helmet: "#1a2540", pads: "#f4ecd8", bat: "#c8a040", batGrip: "#3a2010", stump: "#e0c888", bail: "#f0e0a0", fielderHome: "#e8e8d8", scan: "rgba(0,0,0,0.10)", light: null },
    dusk: { name: "DUSK", skyTop: "#ff6b35", skyBot: "#ffb347", sun: "#ffe680", grassA: "#5a7c2a", grassB: "#4a6a1e", pitch: "#d4a87a", pitchAlt: "#ca9e70", crease: "#ffe9d0", crowd: "#2a1a10", crowdDot: ["#ff8060","#ffcc60","#60a0c0","#a060c0","#f0e0d0"], boundary: "#fff4e0", hudBg: "rgba(30,10,0,0.82)", hudBorder: "rgba(255,200,120,0.30)", uiText: "#fff4e0", uiDim: "#d8b090", uiAccent: "#ffd660", panelBg: "rgba(20,10,0,0.95)", panelBorder: "rgba(255,200,120,0.35)", btnBg: "#3a2010", btnActive: "#7a4a20", btnText: "#ffecd0", perfect: "#a0ffa0", good: "#ffd660", ok: "#ff8040", miss: "#802020", ball: "#c42020", ballHi: "#ff8080", skin: "#e0b088", helmet: "#2a1530", pads: "#fff0e0", bat: "#d0a850", batGrip: "#3a2010", stump: "#f0d090", bail: "#ffe8a0", fielderHome: "#ffe0c0", scan: "rgba(30,10,0,0.10)", light: null },
    night: { name: "NIGHT", skyTop: "#050a1a", skyBot: "#101a30", sun: "#f0f0ff", grassA: "#1e5a2a", grassB: "#184a22", pitch: "#8a7658", pitchAlt: "#826e50", crease: "#d0c0a0", crowd: "#050810", crowdDot: ["#ff4040","#40a0ff","#ffaa40","#a0ff60","#e0e0f0"], boundary: "#f0f0ff", hudBg: "rgba(0,5,15,0.88)", hudBorder: "rgba(100,150,220,0.30)", uiText: "#e0f0ff", uiDim: "#7088a8", uiAccent: "#00e5ff", panelBg: "rgba(0,10,30,0.96)", panelBorder: "rgba(100,150,220,0.40)", btnBg: "#0a1a30", btnActive: "#2a4a80", btnText: "#d0e8ff", perfect: "#00ff88", good: "#00e5ff", ok: "#ffaa00", miss: "#802020", ball: "#ff3030", ballHi: "#ff8080", skin: "#e0b090", helmet: "#1a1a3a", pads: "#e8e8f8", bat: "#c8a848", batGrip: "#2a1a08", stump: "#e0d0a0", bail: "#f0e8b0", fielderHome: "#e8f0ff", scan: "rgba(0,0,0,0.15)", light: "rgba(220,240,255,0.35)" },
    retro: { name: "RETRO", skyTop: "#9bbc0f", skyBot: "#8bac0f", sun: "#c4d96b", grassA: "#8bac0f", grassB: "#7a9c0e", pitch: "#c4d96b", pitchAlt: "#bcd663", crease: "#e4f09a", crowd: "#0f380f", crowdDot: ["#306230","#306230"], boundary: "#0f380f", hudBg: "rgba(15,56,15,0.94)", hudBorder: "rgba(255,255,255,0.15)", uiText: "#e8f5b0", uiDim: "#7a9c4e", uiAccent: "#ffffff", panelBg: "rgba(15,56,15,0.97)", panelBorder: "rgba(154,192,32,0.40)", btnBg: "#1e4a1e", btnActive: "#4a7a2a", btnText: "#e8f5b0", perfect: "#e8f5b0", good: "#c4d96b", ok: "#8bac0f", miss: "#306230", ball: "#0f380f", ballHi: "#5a7a1e", skin: "#8bac0f", helmet: "#0f380f", pads: "#c4d96b", bat: "#306230", batGrip: "#0f380f", stump: "#0f380f", bail: "#0f380f", fielderHome: "#0f380f", scan: "rgba(15,56,15,0.14)", light: null }
  };

  var PALETTE_KEYS = ["day", "dusk", "night", "retro"];
  var P = PALETTES.day;

  var TEAMS = [
    { id: "SL", name: "Sri Lanka", kitA: "#0039a6", kitB: "#ffd200" },
    { id: "IN", name: "India", kitA: "#1a4fa0", kitB: "#ff8a00" },
    { id: "AUS", name: "Australia", kitA: "#0a6b3a", kitB: "#ffd700" },
    { id: "ENG", name: "England", kitA: "#002f6c", kitB: "#ffffff" },
    { id: "WI", name: "West Indies", kitA: "#7a0c1e", kitB: "#ffd700" },
    { id: "PAK", name: "Pakistan", kitA: "#0a5c2e", kitB: "#ffffff" },
    { id: "SA", name: "South Africa", kitA: "#007a4d", kitB: "#ffb612" },
    { id: "NZ", name: "New Zealand", kitA: "#1a1a1a", kitB: "#c8c8c8" },
    { id: "BAN", name: "Bangladesh", kitA: "#006a4e", kitB: "#f42a41" },
    { id: "AFG", name: "Afghanistan", kitA: "#0a4a8a", kitB: "#d32011" },
    { id: "IRE", name: "Ireland", kitA: "#009a49", kitB: "#ffffff" },
    { id: "ZIM", name: "Zimbabwe", kitA: "#c8102e", kitB: "#ffd200" }
  ];

  var DIFFS = {
    gully: { name: "GULLY", barSpeed: 0.55, window: 0.28, aiSkill: 0.28, aggBias: 0.80, fielders: 4 },
    club: { name: "CLUB", barSpeed: 0.80, window: 0.20, aiSkill: 0.48, aggBias: 0.95, fielders: 6 },
    state: { name: "STATE", barSpeed: 1.05, window: 0.14, aiSkill: 0.64, aggBias: 1.05, fielders: 7 },
    intl: { name: "INTERNATIONAL", barSpeed: 1.30, window: 0.10, aiSkill: 0.80, aggBias: 1.10, fielders: 8 },
    legend: { name: "LEGEND", barSpeed: 1.60, window: 0.075, aiSkill: 0.92, aggBias: 1.15, fielders: 9 }
  };
  var DIFF_KEYS = ["gully", "club", "state", "intl", "legend"];

  var MODES = {
    quick: { name: "QUICK MATCH", desc: "5 overs. Bat or bowl.", overs: 5, wkts: 10, solo: false, aggression: 1.0 },
    tour: { name: "TOURNAMENT", desc: "8 teams. QF → SF → Final.", overs: 5, wkts: 10, solo: false, aggression: 1.0 },
    super: { name: "SUPER OVER", desc: "1 over. 2 wickets. Pure drama.", overs: 1, wkts: 2, solo: false, aggression: 1.3 },
    t10: { name: "T10 BLAST", desc: "10 overs, all-out attack.", overs: 10, wkts: 10, solo: false, aggression: 1.4 },
    odi: { name: "ODI CHASE", desc: "20 overs, steady build.", overs: 20, wkts: 10, solo: false, aggression: 0.85 },
    endless: { name: "ENDLESS", desc: "Bat until you're out.", overs: 20, wkts: 10, solo: true, aggression: 1.0 },
    practice: { name: "PRACTICE", desc: "Learn the timing. No wickets.", overs: 10, wkts: 99, solo: true, aggression: 0.9 },
    career: { name: "CAREER", desc: "Play matches, earn XP, level up.", overs: 5, wkts: 10, solo: false, aggression: 1.0 },
    gauntlet: { name: "GAUNTLET", desc: "Each over gets harder. Survive.", overs: 30, wkts: 5, solo: true, aggression: 1.1 }
  };
  var MODE_ORDER = ["quick", "tour", "super", "t10", "odi", "endless", "practice", "career", "gauntlet"];

  var ZONES = [
    { name: "SLIP", angle: -140, dist: 0.55, value: 0.15 },
    { name: "THIRD MAN", angle: -110, dist: 0.85, value: 0.45 },
    { name: "POINT", angle: -60, dist: 1.00, value: 0.75 },
    { name: "COVER", angle: -20, dist: 1.00, value: 0.90 },
    { name: "STRAIGHT", angle: 0, dist: 1.05, value: 1.00 },
    { name: "MID-WICKET", angle: 30, dist: 1.00, value: 0.85 },
    { name: "SQ LEG", angle: 70, dist: 1.00, value: 0.70 },
    { name: "FINE LEG", angle: 110, dist: 0.85, value: 0.50 }
  ];

  var CMT = {
    six: ["That's massive! Six!", "Out of the ground!", "Clean strike, no doubt!"],
    four: ["Beautifully timed — FOUR!", "Cracked through the gap!", "Races away for four!"],
    two: ["Quick running, two runs.", "Good placement for two."],
    one: ["Pushed for a single.", "Rotates the strike."],
    dot: ["Solid defence.", "Dot ball, good bowling."],
    bowled: ["BOWLED HIM! Timber!", "Through the gate!"],
    caught: ["CAUGHT! Great catch!", "Straight to the fielder!"],
    lbw: ["LBW! Plumb!", "Umpire's finger goes up!"],
    runout: ["RUN OUT! Sharp fielding!", "Short of the crease!"]
  };

  var LEN_NAMES = ["short", "good", "full", "yorker"];
  var LINE_VALS = [-0.7, 0, 0.7];
  var BOUNCE_MAP = { short: 0.55, good: 0.30, full: 0.10, yorker: 0.03 };

  var G = {
    screen: "boot", prev: null, menuSel: 0, settings: null,
    teams: { player: 0, opp: 1 }, mode: "quick", diff: null, tour: null,
    match: null, innings: null, toss: null, career: null,
    time: 0, shake: 0, flash: 0, particles: [], commentary: [],
    ball: null, keyHeld: {}, touchHeld: {}, hitboxes: [],
    cam: { y: 1.8, z: -4.0, ty: 1.8, tz: -4.0 }, fielders: []
  };

  function loadJSON(k, f) { try { var s = localStorage.getItem(k); return s ? JSON.parse(s) : f; } catch (e) { return f; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function loadBest() { try { return parseInt(localStorage.getItem(LS_BEST), 10) || 0; } catch (e) { return 0; } }
  function saveBest(v) { try { localStorage.setItem(LS_BEST, String(v)); } catch (e) {} var el = document.getElementById("ck-best-disp"); if (el) el.textContent = String(v); }
  function saveLast(line) { saveJSON(LS_LAST, { line: line, t: Date.now() }); }
  function loadSettings() {
    var s = loadJSON(LS_SET, null) || { sound: true, palette: "day", scanlines: false, assist: true, difficulty: "club" };
    if (!PALETTES[s.palette]) s.palette = "day";
    if (!DIFFS[s.difficulty]) s.difficulty = "club";
    return s;
  }
  function saveSettings() { saveJSON(LS_SET, G.settings); }
  function loadCareer() {
    return loadJSON(LS_CAREER, { matches: 0, runs: 0, wickets: 0, best: 0, level: 1, xp: 0, history: [] });
  }

  var AC = null, master = null, muted = false;
  function audioInit() { if (AC) { if (AC.state === "suspended") AC.resume(); return; } var Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return; AC = new Ctx(); master = AC.createGain(); master.gain.value = 0.35; master.connect(AC.destination); }
  function tone(freq, dur, type, vol, when) { if (!AC || muted) return; var t = AC.currentTime + (when || 0); var o = AC.createOscillator(), g = AC.createGain(); o.type = type || "square"; o.frequency.setValueAtTime(freq, t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02); }
  function noise(dur, vol, freq) { if (!AC || muted) return; var t = AC.currentTime; var len = Math.floor(AC.sampleRate * dur); var buf = AC.createBuffer(1, len, AC.sampleRate); var d = buf.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; var src = AC.createBufferSource(); src.buffer = buf; var flt = AC.createBiquadFilter(); flt.type = "bandpass"; flt.frequency.value = freq || 800; flt.Q.value = 1.2; var g = AC.createGain(); g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); src.connect(flt); flt.connect(g); g.connect(master); src.start(t); src.stop(t + dur + 0.02); }
  
  var SFX = {
    click: function () { tone(660, 0.05, "square", 0.10); },
    tick: function () { tone(880, 0.03, "square", 0.08); },
    select: function () { tone(990, 0.09, "square", 0.12); tone(1320, 0.10, "square", 0.10, 0.06); },
    bowl: function () { tone(280, 0.10, "triangle", 0.15); },
    bat: function () { noise(0.08, 0.30, 1200); tone(180, 0.12, "square", 0.18); },
    miss: function () { tone(140, 0.18, "sawtooth", 0.20); },
    four: function () { [660, 880, 1100].forEach(function (f, i) { tone(f, 0.13, "square", 0.13, i * 0.07); }); },
    six: function () { [660, 880, 1100, 1320, 1760].forEach(function (f, i) { tone(f, 0.15, "square", 0.12, i * 0.07); }); },
    out: function () { tone(280, 0.35, "sawtooth", 0.25); noise(0.25, 0.20, 300); },
    cheer: function () { noise(0.7, 0.15, 700); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.18, "square", 0.12, i * 0.11); }); },
    lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.20, "triangle", 0.12, i * 0.13); }); },
    level: function () { [880, 1100, 1320, 1760].forEach(function (f, i) { tone(f, 0.16, "square", 0.13, i * 0.09); }); }
  };

  var cv = document.getElementById("ck-board");
  var ctx = cv ? cv.getContext("2d") : null;

  function setCam(y, z, snap) { G.cam.ty = y; G.cam.tz = z; if (snap) { G.cam.y = y; G.cam.z = z; } }
  function camUpdate(dt) { var k = clamp(dt * 4, 0, 1); G.cam.y = lerp(G.cam.y, G.cam.ty, k); G.cam.z = lerp(G.cam.z, G.cam.tz, k); }
  
  function project(x, y, z) {
    var lookingForward = G.cam.z < 10;
    var adjZ = lookingForward ? (z - G.cam.z) : (G.cam.z - z);
    if (adjZ < 0.6) return null;
    var screenX = VW / 2 + (x * FOCAL) / adjZ * (lookingForward ? 1 : -1);
    return { x: screenX, y: VH * 0.62 - ((y - G.cam.y) * FOCAL) / adjZ, s: FOCAL / adjZ };
  }

  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function roundRect(x, y, w, h, r, fill, stroke) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); } }
  function text(str, x, y, size, color, align, font) { ctx.font = (size || 16) + "px " + (font || "'Barlow Condensed', sans-serif"); ctx.fillStyle = color || "#fff"; ctx.textAlign = align || "left"; ctx.textBaseline = "middle"; ctx.fillText(str, Math.round(x), Math.round(y)); }
  function textMon(str, x, y, size, color, align) { text(str, x, y, size, color, align, "'JetBrains Mono', monospace"); }

  function drawSky() {
    var grd = ctx.createLinearGradient(0, 0, 0, VH * 0.55);
    grd.addColorStop(0, P.skyTop); grd.addColorStop(1, P.skyBot);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH * 0.55);
    if (P === PALETTES.night) {
      for (var i = 0; i < 40; i++) { ctx.fillStyle = "rgba(255,255,255," + (0.3 + (i % 5) * 0.1) + ")"; ctx.fillRect((i * 73) % VW, (i * 37) % (VH * 0.4), 1, 1); }
      if (P.light) { for (var f = 0; f < 4; f++) { var fx = 100 + f * 230; var grd2 = ctx.createRadialGradient(fx, -20, 10, fx, 250, 200); grd2.addColorStop(0, P.light); grd2.addColorStop(1, "rgba(220,240,255,0)"); ctx.fillStyle = grd2; ctx.fillRect(fx - 200, 0, 400, 350); } }
    } else if (P === PALETTES.day) {
      var sunG = ctx.createRadialGradient(760, 80, 10, 760, 80, 80);
      sunG.addColorStop(0, "rgba(255,255,200,0.95)"); sunG.addColorStop(1, "rgba(255,255,200,0)");
      ctx.fillStyle = sunG; ctx.beginPath(); ctx.arc(760, 80, 80, 0, Math.PI * 2); ctx.fill();
    } else if (P === PALETTES.dusk) {
      ctx.fillStyle = "rgba(255,220,120,0.85)"; ctx.beginPath(); ctx.arc(720, 200, 46, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawCrowd() { var top = VH * 0.42, bot = VH * 0.52; ctx.fillStyle = P.crowd; ctx.fillRect(0, top, VW, bot - top); for (var i = 0; i < 260; i++) { var row = i % 3; var cx = (i * 41 + row * 7) % VW; var cy = top + ((i * 13) % (bot - top)); var size = 1 + row * 0.6; ctx.globalAlpha = 0.55 + row * 0.18; ctx.fillStyle = P.crowdDot[i % P.crowdDot.length]; ctx.fillRect(cx, cy, size, size); } ctx.globalAlpha = 1; }
  function drawGround() { var hz = VH * 0.55; for (var y = hz; y < VH; y += 24) { ctx.fillStyle = ((y / 24) | 0) % 2 ? P.grassA : P.grassB; ctx.fillRect(0, y, VW, 24); } var grd = ctx.createLinearGradient(0, hz - 20, 0, hz + 30); grd.addColorStop(0, "rgba(255,255,255,0)"); grd.addColorStop(1, "rgba(255,255,255,0.10)"); ctx.fillStyle = grd; ctx.fillRect(0, hz - 20, VW, 60); ctx.strokeStyle = P.boundary; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(VW / 2, VH * 0.85, VW * 0.48, VH * 0.22, 0, 0, Math.PI * 2); ctx.stroke(); }
  
  function drawPitch() {
    var near = [project(-1.5, 0, 0.1), project(1.5, 0, 0.1), project(1.0, 0, 20), project(-1.0, 0, 20)];
    if (!near.some(function (c) { return !c; })) { ctx.beginPath(); ctx.moveTo(near[0].x, near[0].y); ctx.lineTo(near[1].x, near[1].y); ctx.lineTo(near[2].x, near[2].y); ctx.lineTo(near[3].x, near[3].y); ctx.closePath(); ctx.fillStyle = P.pitch; ctx.fill(); for (var i = 0; i < 8; i++) { var a = project(-1.5 + i * 0.375, 0, 0.1); var b = project(-1.5 + i * 0.375, 0, 20); if (a && b) { ctx.strokeStyle = i % 2 ? P.pitchAlt : "rgba(0,0,0,0.06)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } } }
    var cN = [project(-1.4, 0, 0.4), project(1.4, 0, 0.4)]; if (cN[0] && cN[1]) { ctx.strokeStyle = P.crease; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cN[0].x, cN[0].y); ctx.lineTo(cN[1].x, cN[1].y); ctx.stroke(); }
    var cF = [project(-1.0, 0, 19.7), project(1.0, 0, 19.7)]; if (cF[0] && cF[1]) { ctx.strokeStyle = P.crease; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cF[0].x, cF[0].y); ctx.lineTo(cF[1].x, cF[1].y); ctx.stroke(); }
  }

  function drawStumps(wx, wz, h) { var top = project(wx, h || 0.7, wz), bot = project(wx, 0, wz); if (!top || !bot) return; var w = Math.max(2, top.s * 0.02); ctx.fillStyle = P.stump; ctx.fillRect(top.x - w * 1.2, top.y, w, bot.y - top.y); ctx.fillRect(top.x, top.y, w, bot.y - top.y); ctx.fillRect(top.x + w * 1.2, top.y, w, bot.y - top.y); ctx.fillStyle = P.bail; ctx.fillRect(top.x - w * 1.2, top.y - 2, w * 3.4, 2); }

  function drawPlayer(x, z, kA, kB, anim) { var base = project(x, 0, z), head = project(x, 1.75, z); if (!base || !head) return; var scale = base.s, w = Math.max(2, scale * 0.35), h = base.y - head.y; ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(base.x, base.y + 1, w * 1.4, w * 0.35, 0, 0, Math.PI * 2); ctx.fill(); var ls = Math.sin(anim * 10) * scale * 0.15; ctx.fillStyle = kB; ctx.fillRect(base.x - w * 0.7 + ls, base.y - h * 0.42, w * 0.6, h * 0.42); ctx.fillRect(base.x + w * 0.1 - ls, base.y - h * 0.42, w * 0.6, h * 0.42); ctx.fillStyle = kA; ctx.fillRect(base.x - w * 0.85, head.y + h * 0.55, w * 1.7, h * 0.45); ctx.fillStyle = P.skin; var hr = scale * 0.22; ctx.beginPath(); ctx.arc(base.x, head.y + hr, hr, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = P.helmet; ctx.beginPath(); ctx.arc(base.x, head.y + hr, hr * 1.05, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillRect(base.x - hr * 1.05, head.y + hr * 0.6, hr * 2.1, hr * 0.6); }

  function drawBatsman(x, z, kA, kB, swing) { var base = project(x, 0, z), head = project(x, 1.75, z); if (!base || !head) return; var scale = base.s, w = Math.max(2, scale * 0.35), h = base.y - head.y; ctx.fillStyle = "rgba(0,0,0,0.30)"; ctx.beginPath(); ctx.ellipse(base.x, base.y + 1, w * 1.5, w * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = P.pads; ctx.fillRect(base.x - w * 0.75, base.y - h * 0.42, w * 0.65, h * 0.42); ctx.fillRect(base.x + w * 0.1, base.y - h * 0.42, w * 0.65, h * 0.42); ctx.fillStyle = kA; ctx.fillRect(base.x - w * 0.9, head.y + h * 0.55, w * 1.8, h * 0.45); ctx.fillStyle = kB; ctx.fillRect(base.x - w * 0.9, head.y + h * 0.75, w * 1.8, h * 0.08); ctx.fillStyle = P.skin; var hr = scale * 0.22; ctx.beginPath(); ctx.arc(base.x, head.y + hr, hr, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = P.helmet; ctx.beginPath(); ctx.arc(base.x, head.y + hr, hr * 1.05, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillRect(base.x - hr * 1.05, head.y + hr * 0.6, hr * 2.1, hr * 0.6); var ang = swing > 0 ? -1.2 + swing * 2.8 : -0.5; if (swing > 0.02) { ctx.strokeStyle = "rgba(255,255,200," + (0.5 * swing) + ")"; ctx.lineWidth = scale * 0.08; ctx.beginPath(); ctx.arc(base.x + w * 1.1, head.y + h * 0.65, scale * 0.7, -1.2 + (swing - 0.3) * 2.8, -1.2 + swing * 2.8); ctx.stroke(); } ctx.save(); ctx.translate(base.x + w * 1.1, head.y + h * 0.65); ctx.rotate(ang); ctx.fillStyle = P.batGrip; ctx.fillRect(-1.5, -scale * 0.15, 3, scale * 0.15); ctx.fillStyle = P.bat; ctx.fillRect(-scale * 0.09, 0, scale * 0.18, scale * 0.9); ctx.restore(); }

  function drawBall(x, y, z, onFire) { var p = project(x, y, z); if (!p) return; var r = Math.max(3, p.s * 0.11); var sh = project(x, 0, z); if (sh) { var shadowScale = 1 + (y / 2) * 0.4; ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, r * 1.3 * shadowScale, r * 0.4 * shadowScale, 0, 0, Math.PI * 2); ctx.fill(); } if (onFire) { var fire = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3); fire.addColorStop(0, "rgba(255,200,80,0.8)"); fire.addColorStop(1, "rgba(255,200,80,0)"); ctx.fillStyle = fire; ctx.beginPath(); ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2); ctx.fill(); } var grd = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, r * 0.1, p.x, p.y, r); grd.addColorStop(0, P.ballHi); grd.addColorStop(1, P.ball); ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.7, -0.6, 0.6); ctx.stroke(); }

  function drawFielders(bowlingTeam) { var legColor = bowlingTeam ? bowlingTeam.kitA : "#3a5a3a"; for (var i = 0; i < G.fielders.length; i++) { var f = G.fielders[i]; var bob = Math.sin(G.time * 1.5 + i) * 0.03; drawPlayer(f.x, f.z, P.fielderHome, legColor, bob); } }
  function panel(x, y, w, h) { roundRect(x, y, w, h, 8, P.hudBg, P.hudBorder); }

  function drawOverStrip(x, y) { var I = G.innings; if (!I) return; var last = I.history.slice(-6); for (var i = 0; i < 6; i++) { var bx = x + i * 22; var b = last[last.length - 6 + i]; var fill = !b ? "rgba(255,255,255,0.10)" : b.wicket ? P.miss : b.runs >= 4 ? P.uiAccent : b.runs > 0 ? P.good : "rgba(255,255,255,0.25)"; ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(bx + 9, y + 9, 9, 0, Math.PI * 2); ctx.fill(); if (b) { var lbl = b.wicket ? "W" : String(b.runs); text(lbl, bx + 9, y + 9, 12, b.wicket ? "#fff" : "#111", "center", "'JetBrains Mono', monospace"); } } }

  function drawHUD() {
    var I = G.innings, m = G.match; if (!I) return;
    panel(20, 20, 320, 66);
    text(m.playerTeam.id, 36, 44, 22, P.uiAccent);
    textMon(I.runs + "/" + I.wkts, 100, 44, 24, P.uiText);
    textMon(Math.floor(I.balls / 6) + "." + (I.balls % 6), 220, 44, 20, P.uiDim);
    text("OVERS", 260, 44, 11, P.uiDim);
    if (I.target) { var need = Math.max(0, I.target - I.runs); var left = Math.max(0, I.maxBalls - I.balls); var rr = left > 0 ? (need / left) * 6 : 0; textMon("NEED " + need + " OFF " + left, 36, 68, 13, need > 0 ? P.uiAccent : P.perfect); text("RRR " + rr.toFixed(1), 220, 68, 12, P.uiDim); } else { var oversLeft = (I.maxBalls - I.balls) / 6; text("BATTING", 36, 68, 12, P.uiDim); textMon(oversLeft.toFixed(1) + " OV LEFT", 140, 68, 12, P.uiDim); }
    drawOverStrip(20, 98);
    panel(VW - 320, 20, 300, 66);
    text(m.oppTeam.id, VW - 300, 44, 22, P.uiAccent);
    text(m.oppTeam.name.toUpperCase(), VW - 250, 44, 18, P.uiText);
    text(G.diff.name, VW - 250, 68, 12, P.uiDim);
    if (I.target) textMon("TGT " + I.target, VW - 60, 44, 16, P.uiAccent, "right");
    if (I.partnerRuns !== undefined) { panel(VW - 320, 98, 300, 44); text("PARTNERSHIP", VW - 310, 114, 11, P.uiDim); textMon(I.partnerRuns + " (" + I.partnerBalls + ")", VW - 310, 130, 14, P.uiText); }
    panel(20, VH - 190, 280, 170); text("COMMENTARY", 36, VH - 172, 12, P.uiAccent); var cmt = G.commentary.slice(-5); for (var i = 0; i < cmt.length; i++) { var line = cmt[cmt.length - 1 - i]; var age = (Date.now() - line.t) / 15000; ctx.globalAlpha = 1 - Math.min(1, age) * 0.7; text(line.text, 36, VH - 150 + i * 22, 12, P.uiText); ctx.globalAlpha = 1; }
    panel(VW - 200, VH - 130, 180, 110); text("STRIKE RATE", VW - 190, VH - 112, 11, P.uiDim); textMon(I.balls ? Math.round((I.runs / I.balls) * 100) : 0, VW - 190, VH - 90, 22, P.uiText); text("4s " + I.fours + " 6s " + I.sixes, VW - 190, VH - 62, 13, P.uiDim); if (I.target) textMon("RR " + (I.balls ? ((I.runs / I.balls) * 6).toFixed(1) : "0.0"), VW - 190, VH - 44, 13, P.uiText);
    if (G.ball && G.ball.phase === "flight" && G.ball.batting) { drawTimingBar(); drawAimIndicator(); }
    if (G.ball && (G.ball.phase === "aim" || G.ball.phase === "release")) drawBowlingControls();
  }

  function drawTimingBar() { var b = G.ball; var cx = VW / 2, y = VH - 44, w = 340, h = 12; panel(cx - w / 2 - 8, y - 10, w + 16, h + 20); var win = G.diff.window; rect(cx - w / 2, y, w, h, P.miss); rect(cx - w / 2 + (0.5 - win) * w, y, win * 2 * w, h, P.ok); rect(cx - w / 2 + (0.5 - win * 0.72) * w, y, win * 1.44 * w, h, P.good); rect(cx - w / 2 + (0.5 - win * 0.30) * w, y, win * 0.60 * w, h, P.perfect); var mx = cx - w / 2 + b.timPos * w; ctx.fillStyle = "#fff"; ctx.fillRect(mx - 1.5, y - 4, 3, h + 8); text("TIMING", cx, y - 18, 11, P.uiDim, "center"); }
  function drawAimIndicator() { var b = G.ball, cx = VW / 2, z = ZONES[b.aim]; var onF = b.fielders.indexOf(b.aim) >= 0; var col = onF ? P.miss : P.uiAccent; var lbl = z.name + (onF ? " (!)" : ""); var sub = b.loft ? "LOFT" : "GROUND"; panel(cx - 120, VH - 100, 240, 44); text(lbl, cx, VH - 86, 16, col, "center"); text(sub + " · ◀ ▶ to aim", cx, VH - 68, 11, P.uiDim, "center"); }
  function drawBowlingControls() { var b = G.ball, cx = VW / 2; if (b.phase === "aim") { panel(cx - 220, VH - 150, 440, 110); text("LENGTH", cx - 200, VH - 130, 12, P.uiDim); var lens = ["SHORT", "GOOD", "FULL", "YORKER"]; for (var i = 0; i < 4; i++) { var bx = cx - 200 + i * 100; var on = i === b.length; roundRect(bx, VH - 112, 90, 32, 6, on ? P.btnActive : P.btnBg, on ? P.uiAccent : P.panelBorder); text(lens[i], bx + 45, VH - 96, 13, on ? P.uiAccent : P.uiDim, "center"); } text("LINE", cx - 200, VH - 60, 12, P.uiDim); var lines = ["LEG", "MIDDLE", "OFF"]; for (var j = 0; j < 3; j++) { var lx = cx - 120 + j * 100; var on2 = j === b.line; roundRect(lx, VH - 62, 90, 28, 6, on2 ? P.btnActive : P.btnBg, on2 ? P.uiAccent : P.panelBorder); text(lines[j], lx + 45, VH - 48, 13, on2 ? P.uiAccent : P.uiDim, "center"); } text("SPACE: BOWL", cx, VH - 18, 12, P.uiAccent, "center"); } else if (b.phase === "release") { var y = VH - 60, w = 380, h = 16; panel(cx - w / 2 - 10, y - 30, w + 20, h + 40); text("RELEASE", cx, y - 16, 12, P.uiDim, "center"); rect(cx - w / 2, y, w, h, P.miss); rect(cx - w / 2 + w * 0.40, y, w * 0.20, h, P.perfect); rect(cx - w / 2 + w * 0.30, y, w * 0.40, h, P.good); var mx = cx - w / 2 + b.accPos * w; ctx.fillStyle = "#fff"; ctx.fillRect(mx - 2, y - 6, 4, h + 12); } }

  function drawMenuBg() { drawSky(); drawCrowd(); drawGround(); var grd = ctx.createRadialGradient(VW / 2, VH / 2, 150, VW / 2, VH / 2, 500); grd.addColorStop(0, "rgba(0,0,0,0)"); grd.addColorStop(1, "rgba(0,0,0,0.55)"); ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH); }
  function drawMenuBtn(x, y, w, h, label, sel, desc) { roundRect(x, y, w, h, 10, sel ? P.btnActive : P.panelBg, sel ? P.uiAccent : P.panelBorder); if (sel) roundRect(x, y, w, h, 10, null, P.uiAccent); text(label, x + w / 2, y + h / 2 - (desc ? 7 : 0), 20, sel ? "#fff" : P.uiText, "center"); if (desc) text(desc, x + w / 2, y + h / 2 + 12, 11, P.uiDim, "center"); return { x: x, y: y, w: w, h: h }; }

  function drawMainMenu() { drawMenuBg(); var grd = ctx.createLinearGradient(0, 40, 0, 130); grd.addColorStop(0, P.uiAccent); grd.addColorStop(1, "#ffffff"); ctx.font = "900 64px 'Barlow Condensed', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillText("CRICKET LEGENDS", VW / 2 + 3, 92); ctx.fillStyle = grd; ctx.fillText("CRICKET LEGENDS", VW / 2, 89); text("MODERN BROWSER CRICKET", VW / 2, 130, 13, P.uiDim, "center"); var cols = 2, colW = 300, colGap = 20, rowH = 48, rowGap = 8; var startX = VW / 2 - (cols * colW + (cols - 1) * colGap) / 2; var startY = 168; G.hitboxes = []; for (var i = 0; i < MODE_ORDER.length; i++) { var mode = MODE_ORDER[i]; var mDef = MODES[mode]; var col = i % cols, row = Math.floor(i / cols); var bx = startX + col * (colW + colGap); var by = startY + row * (rowH + rowGap); var sel = i === G.menuSel; var b = drawMenuBtn(bx, by, colW, rowH, mDef.name, sel, sel ? mDef.desc : null); b.action = "mode:" + mode; G.hitboxes.push(b); } var sIdx = MODE_ORDER.length; var sCol = sIdx % cols, sRow = Math.floor(sIdx / cols); var sx = startX + sCol * (colW + colGap); var sy = startY + sRow * (rowH + rowGap); var sb = drawMenuBtn(sx, sy, colW, rowH, "SETTINGS", sIdx === G.menuSel, null); sb.action = "settings"; G.hitboxes.push(sb); var best = loadBest(); if (best) text("PERSONAL BEST: " + best + " RUNS", VW / 2, VH - 28, 14, P.uiAccent, "center"); }

  function drawTeamSelect() { drawMenuBg(); text("NEW MATCH", VW / 2, 46, 32, P.uiAccent, "center"); text(MODES[G.mode].name, VW / 2, 82, 18, P.uiText, "center"); text(MODES[G.mode].desc, VW / 2, 106, 13, P.uiDim, "center"); var t = TEAMS[G.teams.player]; var cardW = 280, cardH = 200, cardY = 140; var cardX = VW / 2 - 320; roundRect(cardX, cardY, cardW, cardH, 12, P.panelBg, P.panelBorder); ctx.fillStyle = t.kitA; ctx.fillRect(cardX, cardY, cardW, 50); ctx.fillStyle = t.kitB; ctx.fillRect(cardX, cardY + 50, cardW, 6); text(t.id, cardX + cardW / 2, cardY + 26, 36, "#fff", "center"); text(t.name.toUpperCase(), cardX + cardW / 2, cardY + 80, 22, P.uiText, "center"); text("YOUR TEAM", cardX + cardW / 2, cardY + 106, 12, P.uiDim, "center"); var d = DIFFS[G.settings.difficulty]; var dX = VW / 2 - 80, dY = 190, dW = 160, dH = 90; roundRect(dX, dY, dW, dH, 12, P.panelBg, P.panelBorder); text("DIFFICULTY", dX + dW / 2, dY + 20, 12, P.uiDim, "center"); text(d.name, dX + dW / 2, dY + 48, 22, P.uiAccent, "center"); text("◀ ▶", dX + dW / 2, dY + 74, 14, P.uiDim, "center"); var ot = TEAMS[G.teams.opp]; var ocX = VW / 2 + 40; roundRect(ocX, cardY, cardW, cardH, 12, P.panelBg, P.panelBorder); ctx.fillStyle = ot.kitA; ctx.fillRect(ocX, cardY, cardW, 50); ctx.fillStyle = ot.kitB; ctx.fillRect(ocX, cardY + 50, cardW, 6); text(ot.id, ocX + cardW / 2, cardY + 26, 36, "#fff", "center"); text(ot.name.toUpperCase(), ocX + cardW / 2, cardY + 80, 22, P.uiText, "center"); text("OPPONENT", ocX + cardW / 2, cardY + 106, 12, P.uiDim, "center"); G.hitboxes = [ { x: cardX, y: cardY, w: cardW, h: cardH, action: "prevTeam" }, { x: ocX, y: cardY, w: cardW, h: cardH, action: "nextOpp" }, { x: dX, y: dY, w: dW, h: dH, action: "cycleDiff" } ]; roundRect(VW / 2 - 100, VH - 80, 200, 48, 10, P.btnActive, P.uiAccent); text("START MATCH", VW / 2, VH - 56, 22, "#fff", "center"); G.hitboxes.push({ x: VW / 2 - 100, y: VH - 80, w: 200, h: 48, action: "startMatch" }); G.hitboxes.push({ x: 20, y: VH - 50, w: 100, h: 36, action: "back" }); roundRect(20, VH - 50, 100, 36, 6, P.btnBg, P.panelBorder); text("BACK", 70, VH - 32, 14, P.uiText, "center"); }

  function drawToss() { drawMenuBg(); var T = G.toss; text("THE TOSS", VW / 2, 60, 44, P.uiAccent, "center"); if (!T) return; if (T.phase === "call") { text("CALL IT", VW / 2, 130, 20, P.uiText, "center"); var coins = ["HEADS", "TAILS"]; G.hitboxes = []; for (var i = 0; i < 2; i++) { var x = VW / 2 - 220 + i * 240; var on = i === T.sel; roundRect(x, 200, 200, 80, 12, on ? P.btnActive : P.panelBg, on ? P.uiAccent : P.panelBorder); text(coins[i], x + 100, 240, 28, on ? "#fff" : P.uiText, "center"); G.hitboxes.push({ x: x, y: 200, w: 200, h: 80, action: "call:" + i }); } text("◀ ▶ to choose · SPACE to flip", VW / 2, 340, 14, P.uiDim, "center"); } else if (T.phase === "flip") { var spin = Math.abs(Math.cos(T.timer * 14)), cw = 120 * spin; ctx.fillStyle = P.uiAccent; ctx.beginPath(); ctx.ellipse(VW / 2, 260, cw, 108, 0, 0, Math.PI * 2); ctx.fill(); text("FLIPPING...", VW / 2, 400, 20, P.uiDim, "center"); } else if (T.phase === "choice") { text(T.result.toUpperCase() + "!", VW / 2, 130, 30, P.uiText, "center"); text("YOU WIN THE TOSS", VW / 2, 175, 20, P.uiAccent, "center"); var opts = ["BAT FIRST", "BOWL FIRST"]; G.hitboxes = []; for (var j = 0; j < 2; j++) { var bx = VW / 2 - 220 + j * 240; var on2 = j === T.sel; roundRect(bx, 220, 200, 80, 12, on2 ? P.btnActive : P.panelBg, on2 ? P.uiAccent : P.panelBorder); text(opts[j], bx + 100, 260, 24, on2 ? "#fff" : P.uiText, "center"); G.hitboxes.push({ x: bx, y: 220, w: 200, h: 80, action: "choose:" + j }); } } else if (T.phase === "lost") { text(T.result.toUpperCase() + "!", VW / 2, 130, 30, P.uiText, "center"); text("OPPONENT WINS THE TOSS", VW / 2, 175, 20, P.uiDim, "center"); text("THEY CHOSE TO " + (T.aiChoice === "bat" ? "BAT" : "BOWL"), VW / 2, 240, 24, P.uiAccent, "center"); roundRect(VW / 2 - 100, 320, 200, 60, 10, P.btnActive, P.uiAccent); text("CONTINUE", VW / 2, 350, 20, "#fff", "center"); G.hitboxes = [{ x: VW / 2 - 100, y: 320, w: 200, h: 60, action: "continue" }]; } }

  function drawResult() { var m = G.match; drawMenuBg(); var isW = m.result === "win", isT = m.result === "tie"; var title = isW ? "VICTORY" : isT ? "TIED MATCH" : "DEFEAT"; var col = isW ? P.perfect : isT ? P.uiAccent : P.miss; var grd = ctx.createLinearGradient(0, 100, 0, 200); grd.addColorStop(0, col); grd.addColorStop(1, "#ffffff"); ctx.font = "900 68px 'Barlow Condensed', sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillText(title, VW / 2 + 3, 163); ctx.fillStyle = grd; ctx.fillText(title, VW / 2, 160); text(m.margin || "", VW / 2, 210, 20, P.uiText, "center"); var ps = m.playerScore, os = m.oppScore, cardY = 250, cardH = 140; roundRect(VW / 2 - 300, cardY, 280, cardH, 12, P.panelBg, P.panelBorder); roundRect(VW / 2 + 20, cardY, 280, cardH, 12, P.panelBg, P.panelBorder); text("YOU", VW / 2 - 160, cardY + 26, 16, P.uiDim, "center"); text(m.playerTeam.name.toUpperCase(), VW / 2 - 160, cardY + 50, 14, P.uiText, "center"); if (ps) { textMon(ps.runs + "/" + ps.wkts, VW / 2 - 160, cardY + 84, 36, P.uiAccent, "center"); text(Math.floor(ps.balls / 6) + "." + (ps.balls % 6) + " OV · " + ps.fours + "×4 " + ps.sixes + "×6", VW / 2 - 160, cardY + 118, 12, P.uiDim, "center"); } text("THEM", VW / 2 + 160, cardY + 26, 16, P.uiDim, "center"); text(m.oppTeam.name.toUpperCase(), VW / 2 + 160, cardY + 50, 14, P.uiText, "center"); if (os) { textMon(os.runs + "/" + os.wkts, VW / 2 + 160, cardY + 84, 36, P.uiText, "center"); text(Math.floor(os.balls / 6) + "." + (os.balls % 6) + " OV", VW / 2 + 160, cardY + 118, 12, P.uiDim, "center"); } G.hitboxes = []; var btns = [ { label: "PLAY AGAIN", action: "restart", x: VW / 2 - 220, y: VH - 110 }, { label: "MAIN MENU", action: "menu", x: VW / 2 + 20, y: VH - 110 } ]; for (var i = 0; i < btns.length; i++) { roundRect(btns[i].x, btns[i].y, 200, 56, 10, P.btnActive, P.uiAccent); text(btns[i].label, btns[i].x + 100, btns[i].y + 28, 20, "#fff", "center"); G.hitboxes.push({ x: btns[i].x, y: btns[i].y, w: 200, h: 56, action: btns[i].action }); } }

  function drawSettings() { drawMenuBg(); text("SETTINGS", VW / 2, 60, 44, P.uiAccent, "center"); var items = [ { label: "SOUND", value: G.settings.sound ? "ON" : "OFF" }, { label: "THEME", value: PALETTES[G.settings.palette].name }, { label: "SCANLINES", value: G.settings.scanlines ? "ON" : "OFF" }, { label: "TIMING AID", value: G.settings.assist ? "ON" : "OFF" }, { label: "BACK", value: "" } ]; G.hitboxes = []; for (var i = 0; i < items.length; i++) { var y = 140 + i * 60; var on = i === G.menuSel; roundRect(VW / 2 - 250, y, 500, 48, 8, on ? P.btnActive : P.panelBg, on ? P.uiAccent : P.panelBorder); text(items[i].label, VW / 2 - 230, y + 24, 18, on ? "#fff" : P.uiText); if (items[i].value) text(items[i].value, VW / 2 + 230, y + 24, 18, on ? P.uiAccent : P.uiDim, "right"); G.hitboxes.push({ x: VW / 2 - 250, y: y, w: 500, h: 48, action: "setting:" + i }); } }
  
  function burst(x, y, c, n) { for (var i = 0; i < n; i++) { G.particles.push({ x: x, y: y, vx: rand(-200, 200), vy: rand(-300, -50), life: rand(0.5, 1.2), color: c, size: rand(2, 5) }); } }
  function updateParticles(dt) { for (var i = G.particles.length - 1; i >= 0; i--) { var p = G.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 800 * dt; p.life -= dt; if (p.life <= 0) G.particles.splice(i, 1); } }
  function drawParticles() { for (var i = 0; i < G.particles.length; i++) { var p = G.particles[i]; ctx.globalAlpha = clamp(p.life, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); } ctx.globalAlpha = 1; }

  function drawInningsView() { if (!G.ball) return; var m = G.match, b = G.ball; var battingTeam = G.innings.batting === "player" ? m.playerTeam : m.oppTeam; var bowlingTeam = G.innings.batting === "player" ? m.oppTeam : m.playerTeam; drawSky(); drawCrowd(); drawGround(); drawPitch(); drawStumps(0, 19.5, 0.7); drawStumps(0, 0.7, 0.7); drawFielders(bowlingTeam); if (b.phase === "aim" || b.phase === "release" || b.phase === "flight") { var bz = b.phase === "flight" ? 19.5 - easeOut(clamp(b.t * 1.5, 0, 1)) * 4 : 19.5; drawPlayer(0, bz, bowlingTeam.kitA, bowlingTeam.kitB, b.t * 2); } drawBatsman(0, 0.8, battingTeam.kitA, battingTeam.kitB, b.swingT); if (b.phase === "flight" || b.phase === "field") { var pos; if (b.phase === "field" && b.fieldAnim) { var fa = b.fieldAnim, t = clamp(fa.t / fa.dur, 0, 1); var z = ZONES[fa.aim], rad = (z.angle * Math.PI) / 180, td = z.dist * 14; var tx = Math.cos(rad) * td, tz = 10 + Math.sin(rad) * td; var u = easeOut(t); pos = { x: lerp(0, tx, u), z: lerp(1, tz, u), y: lerp(1, 0.1, u) + Math.sin(u * Math.PI) * (fa.res.runs >= 4 ? 6 : 1.5) }; } else { pos = ballPosition(b.t); } drawBall(pos.x, pos.y, pos.z, b.phase === "field" && b.fieldAnim && b.fieldAnim.res.runs >= 6); } drawHUD(); drawParticles(); }

  function ballPosition(t) { var b = G.ball; var u = clamp(t / b.duration, 0, 1); var z = lerp(20, 0.3, u); var swingOffset = b.swing * Math.sin(u * Math.PI) * 0.3; var x = b.deliveryLine * 0.45 * (1 - u * 0.6) + swingOffset; var bt = b.bounceT; var y; if (u < bt) { var v = u / bt; y = lerp(1.8, b.bounceY, v * v); } else { var v2 = (u - bt) / (1 - bt); var postRise = (0.9 - b.bounceY) * Math.sin(v2 * Math.PI * 0.6) * (0.3 + b.bounceY); y = b.bounceY + postRise; } return { x: x, y: y, z: z, u: u }; }
  function deliveryQuality(b) { var acc = b.accuracy !== undefined ? b.accuracy : 0.7; var lenFit = { short: 0.75, good: 1.0, full: 0.85, yorker: 0.55 }[b.lengthName] || 0.8; return clamp(acc * 0.6 + lenFit * 0.4, 0, 1); }
  function setLen(b, idx) { b.length = idx; b.deliveryLength = LEN_NAMES[idx]; b.lengthName = LEN_NAMES[idx]; b.bounceY = BOUNCE_MAP[LEN_NAMES[idx]]; }
  function setLine(b, idx) { b.line = idx; b.deliveryLine = LINE_VALS[idx]; }
  function say(msg) { G.commentary.push({ text: msg, t: Date.now() }); if (G.commentary.length > 20) G.commentary.shift(); }

  function startMatch() { var mode = MODES[G.mode]; var pt = TEAMS[G.teams.player], ot = TEAMS[G.teams.opp]; G.diff = DIFFS[G.settings.difficulty]; if (G.mode === "tour") { var others = shuffle(TEAMS.filter(function (t, i) { return i !== G.teams.player; })); G.tour = { round: 0, player: pt, opponents: others.slice(0, 3), won: [] }; ot = G.tour.opponents[0]; } else { G.tour = null; } G.match = { mode: G.mode, modeDef: mode, overs: mode.overs, wkts: mode.wkts, solo: mode.solo, playerTeam: pt, oppTeam: ot, innings: 1, first: null, second: null, playerScore: null, oppScore: null, target: 0, result: null, margin: "", playerBatsFirst: false, aggression: mode.aggression }; G.commentary = []; openToss(); }
  function openToss() { G.toss = { phase: "call", sel: 0, timer: 0, resolved: false, result: null, won: false, aiChoice: null }; G.menuSel = 0; setState("toss"); }
  function resolveTossFlip() { var T = G.toss; T.result = Math.random() < 0.5 ? "heads" : "tails"; T.won = (T.sel === 0 ? "heads" : "tails") === T.result; T.resolved = true; if (T.won) { T.phase = "choice"; T.sel = 0; } else { T.aiChoice = Math.random() < 0.6 ? "bat" : "bowl"; T.phase = "lost"; } }
  function startAfterToss() { var T = G.toss; var playerBats = T.won ? T.sel === 0 : T.aiChoice === "bowl"; G.match.playerBatsFirst = playerBats; beginInnings(playerBats ? "player" : "ai", 0); }
  function beginInnings(batting, target) { var m = G.match; G.innings = { batting: batting, runs: 0, wkts: 0, balls: 0, fours: 0, sixes: 0, dots: 0, maxBalls: m.overs * BPO, maxWkts: m.wkts, target: target, history: [], phase: "ready", phaseT: 0, finished: false, partnerRuns: 0, partnerBalls: 0 }; if (batting === "player") setCam(1.8, -4.0, true); else setCam(2.2, 23, true); setState("innings"); nextBall(); }

  function pickFielders(n) { var z = []; for (var i = 0; i < ZONES.length; i++) z.push(i); shuffle(z); return z.slice(0, n); }
  function updateFielders(fielders) { G.fielders = []; for (var i = 0; i < fielders.length; i++) { var z = ZONES[fielders[i]]; var rad = (z.angle * Math.PI) / 180; var d = z.dist * 14; G.fielders.push({ x: Math.cos(rad) * d, z: 10 + Math.sin(rad) * d, zone: fielders[i] }); } }

  function nextBall() { var I = G.innings; if (!I || I.finished) return; I.phase = "ready"; I.phaseT = 0; var batting = I.batting === "player"; var flds = pickFielders(G.diff.fielders); updateFielders(flds); var lenName = batting ? pick(["short", "good", "good", "good", "full", "yorker"]) : "good"; var lenIdx = LEN_NAMES.indexOf(lenName); var lineIdx; if (batting) { var roll = Math.random(); lineIdx = roll < 0.3 ? 0 : roll < 0.7 ? 1 : 2; } else { lineIdx = 1; } G.ball = { phase: batting ? "flight" : "aim", batting: batting, t: 0, duration: batting ? 1.1 / G.diff.barSpeed : 1.3, deliveryLine: LINE_VALS[lineIdx], deliveryLength: lenName, lengthName: lenName, swing: rand(-1, 1) * 0.7, bounceT: 0.55, bounceY: BOUNCE_MAP[lenName], aim: batting ? Math.floor(Math.random() * 8) : 4, loft: false, swingQueued: false, swingT: 0, queuedQuality: null, timPos: Math.random() < 0.5 ? 0.05 : 0.95, timDir: Math.random() < 0.5 ? 1 : -1, fielders: flds, length: lenIdx, line: lineIdx, accPos: 0.05, accDir: 1, accuracy: batting ? (0.55 + Math.random() * 0.35) : 0.7, quality: 0.5, resolved: false, result: null, fieldAnim: null }; say("Over " + (Math.floor(I.balls / 6) + 1) + "." + ((I.balls % 6) + 1)); }

  function aiBat(delivery) { var I = G.innings, m = G.match; var need = I.target ? Math.max(0, I.target - I.runs) : null; var ballsLeft = I.maxBalls - I.balls; var reqRate = need !== null && ballsLeft > 0 ? (need / ballsLeft) * 6 : 0; var wktsLeft = I.maxWkts - I.wkts; var skill = G.diff.aiSkill; var aggression; if (need !== null) { aggression = clamp((reqRate - 6) / 8 + (wktsLeft / I.maxWkts) * 0.3, 0, 1); } else { var oversLeft = (I.maxBalls - I.balls) / 6; aggression = clamp(0.45 + ((m.overs - oversLeft) / m.overs) * 0.4, 0, 1); } aggression *= (m.aggression || 1) * (G.diff.aggBias || 1); aggression = clamp(aggression, 0, 1); var ballQ = deliveryQuality(delivery); var shotQuality = skill * (0.55 + 0.45 * (1 - ballQ)); shotQuality *= 0.7 + Math.random() * 0.6; shotQuality = clamp(shotQuality, 0, 1); var best = 4, bestScore = -Infinity; for (var z = 0; z < ZONES.length; z++) { var s = ZONES[z].value; if (delivery.fielders.indexOf(z) >= 0) s -= 1.5 + aggression; s += (Math.random() - 0.5) * (1 - skill); if (s > bestScore) { bestScore = s; best = z; } } var loft = aggression > 0.55 && shotQuality > 0.5 && Math.random() < aggression; return { zone: best, loft: loft, quality: shotQuality, aggression: aggression }; }

  function resolveShot(shot, delivery) { var onFielder = delivery.fielders.indexOf(shot.zone) >= 0; var q = shot.quality; if (q < 0.2) { var roll = Math.random(); if (roll < 0.25) return { runs: 0, wicket: "BOWLED" }; if (roll < 0.40) return { runs: 0, wicket: "LBW" }; return { runs: 0, label: "MISSED" }; } if (onFielder) { if (shot.loft && Math.random() < 0.6) return { runs: 0, wicket: "CAUGHT" }; if (Math.random() < 0.12) return { runs: 0, wicket: "RUN OUT" }; return { runs: Math.random() < 0.5 ? 0 : 1, label: "FIELDED" }; } if (shot.loft && q > 0.75) return { runs: 6, label: "SIX!" }; if (q > 0.6) return { runs: 4, label: "FOUR!" }; if (q > 0.35) return { runs: 2, label: "TWO" }; return { runs: 1, label: "SINGLE" }; }

  function resolveBat(q) { var b = G.ball, I = G.innings, m = G.match; b.resolved = true; b.phase = "result"; var res; if (m.solo && m.mode === "practice" && q === "miss") { res = { runs: 0, label: "MISSED" }; say("No run. Try again."); } else { var shotQuality = q === "perfect" ? 0.92 : q === "good" ? 0.68 : q === "ok" ? 0.42 : 0.10; var shot = { zone: b.aim, loft: b.loft, quality: shotQuality, aggression: b.loft ? 0.7 : 0.4 }; res = resolveShot(shot, b); } if (res.runs === 4) burst(VW / 2, VH / 2, P.uiAccent, 20); if (res.runs === 6) burst(VW / 2, VH / 2, P.perfect, 30); if (res.wicket) burst(VW / 2, VH / 2, P.miss, 25); b.result = res; startFieldAnimation(res, b.aim); playResultSfx(res); }

  function resolveBowl() { var b = G.ball; b.resolved = true; b.phase = "result"; b.accuracy = clamp(1 - Math.abs(b.accPos - 0.5) * 2, 0, 1); b.quality = deliveryQuality(b); var shot = aiBat(b); var res = resolveShot(shot, b); b.result = res; startFieldAnimation(res, shot.zone); playResultSfx(res); }

  function playResultSfx(res) { if (res.runs === 6) { SFX.six(); G.flash = 0.5; G.shake = 8; } else if (res.runs === 4) { SFX.four(); G.flash = 0.3; } else if (res.wicket) { SFX.out(); } else if (res.runs === 0) { SFX.miss(); } else { SFX.bat(); } if (res.wicket) say(pick(CMT[res.wicket.toLowerCase()] || CMT.caught)); else if (res.runs === 6) say(pick(CMT.six)); else if (res.runs === 4) say(pick(CMT.four)); else if (res.runs === 2) say(pick(CMT.two)); else if (res.runs === 1) say(pick(CMT.one)); else say(pick(CMT.dot)); }

  function startFieldAnimation(res, zone) { var b = G.ball; b.fieldAnim = { aim: zone, res: res, t: 0, dur: res.runs === 6 ? 1.4 : res.wicket ? 1.3 : 1.1, applied: false }; b.phase = "field"; }
  function updateFieldAnim(dt) { var b = G.ball; if (!b.fieldAnim) return; b.fieldAnim.t += dt; if (!b.fieldAnim.applied && b.fieldAnim.t >= b.fieldAnim.dur) { b.fieldAnim.applied = true; applyBallResult(); } if (b.fieldAnim.applied && b.fieldAnim.t >= b.fieldAnim.dur + 1.0) { endBall(); } }

  function applyBallResult() { var b = G.ball, I = G.innings, res = b.result; if (!res) return; I.balls++; I.runs += res.runs; I.partnerRuns += res.runs; I.partnerBalls++; if (res.runs === 4) I.fours++; if (res.runs === 6) I.sixes++; if (res.runs === 0 && !res.wicket) I.dots++; if (res.wicket) { I.wkts++; I.partnerRuns = 0; I.partnerBalls = 0; } I.history.push({ runs: res.runs, wicket: res.wicket || null }); var el = document.getElementById("ck-score-disp"); if (el && I.batting === "player") el.textContent = I.runs + "/" + I.wkts; }

  function endBall() { var I = G.innings, m = G.match; if (I.target && I.runs >= I.target) return endInnings("target"); if (!m.solo && I.wkts >= I.maxWkts) return endInnings("all out"); if (I.balls >= I.maxBalls) return endInnings("overs"); nextBall(); }

  function endInnings(reason) {
    var I = G.innings, m = G.match; I.finished = true; var summary = { runs: I.runs, wkts: I.wkts, balls: I.balls, fours: I.fours, sixes: I.sixes, why: reason };
    if (m.solo) { m.playerScore = summary; m.oppScore = null; var best = loadBest(); if (summary.runs > best) saveBest(summary.runs); saveLast(summary.runs + "/" + summary.wkts); m.result = "solo"; m.margin = "FINAL SCORE: " + summary.runs + "/" + summary.wkts; SFX.win(); setState("result"); return; }
    if (m.innings === 1) { m.first = summary; m.innings = 2; m.target = I.runs + 1; m.nextBats = I.batting === "player" ? "ai" : "player"; setState("break"); SFX.cheer(); return; }
    m.second = summary; finishMatch(I.batting === "player" ? summary : m.first, I.batting === "ai" ? summary : m.first);
  }

  function finishMatch(pI, oI) { var m = G.match; m.playerScore = pI; m.oppScore = oI; if (pI.runs > oI.runs) { m.result = "win"; m.margin = "WON BY " + (pI.runs - oI.runs) + " RUNS"; SFX.win(); } else if (pI.runs < oI.runs) { m.result = "lose"; m.margin = "LOST BY " + (oI.runs - pI.runs) + " RUNS"; SFX.lose(); } else { m.result = "tie"; m.margin = "SCORES LEVEL"; SFX.cheer(); } var best = loadBest(); if (pI.runs > best) { saveBest(pI.runs); m.bestNew = true; } saveLast(pI.runs + "/" + pI.wkts + " v " + m.oppTeam.id); if (G.mode === "career") { var c = loadCareer(); c.matches++; c.runs += pI.runs; c.wickets += pI.wkts; if (pI.runs > c.best) c.best = pI.runs; c.xp += (m.result === "win" ? 100 : 40) + pI.runs; var nl = Math.floor(c.xp / 500) + 1; if (nl > c.level) { c.level = nl; SFX.level(); } c.history.push({ opp: m.oppTeam.id, runs: pI.runs, wkts: pI.wkts, result: m.result, t: Date.now() }); if (c.history.length > 20) c.history.shift(); saveJSON(LS_CAREER, c); } if (G.tour && G.mode === "tour" && m.result === "win") { G.tour.won.push(m.oppTeam.id); if (G.tour.round < 2) { G.tour.round++; m.oppTeam = G.tour.opponents[G.tour.round]; m.innings = 1; m.first = null; m.second = null; m.playerScore = null; m.oppScore = null; m.target = 0; m.result = null; setState("tourBracket"); return; } else { m.result = "win"; m.margin = "TOURNAMENT CHAMPIONS!"; } } setState("result"); }

  function handleAction(a) {
    if (a === "mute") { toggleSound(); return; }
    if (G.screen === "pause") { handlePause(a); return; }
    if (a === "pause") { if (G.screen === "innings" || G.screen === "break") { G.prev = G.screen; G.screen = "pause"; G.menuSel = 0; SFX.click(); } return; }
    switch (G.screen) {
      case "menu": handleMenu(a); break;
      case "teamSelect": handleTeamSelect(a); break;
      case "toss": handleToss(a); break;
      case "innings": handleInnings(a); break;
      case "break": if (a === "hit") continueAfterBreak(); break;
      case "result": handleResult(a); break;
      case "settings": handleSettings(a); break;
      case "tourBracket": if (a === "hit") openToss(); break;
    }
  }

  function handleMenu(a) { var total = MODE_ORDER.length + 1; if (a === "up") { G.menuSel = (G.menuSel - 2 + total) % total; SFX.click(); } if (a === "down") { G.menuSel = (G.menuSel + 2) % total; SFX.click(); } if (a === "left") { G.menuSel = (G.menuSel - 1 + total) % total; SFX.click(); } if (a === "right") { G.menuSel = (G.menuSel + 1) % total; SFX.click(); } if (a === "hit") { SFX.select(); if (G.menuSel === MODE_ORDER.length) setState("settings"); else { G.mode = MODE_ORDER[G.menuSel]; setState("teamSelect"); } } }
  function handleTeamSelect(a) { if (a === "left") { G.teams.player = (G.teams.player + 11) % 12; if (G.teams.player === G.teams.opp) G.teams.opp = (G.teams.opp + 1) % 12; SFX.tick(); } if (a === "right") { G.teams.player = (G.teams.player + 1) % 12; if (G.teams.player === G.teams.opp) G.teams.opp = (G.teams.opp + 1) % 12; SFX.tick(); } if (a === "up") { var i = DIFF_KEYS.indexOf(G.settings.difficulty); G.settings.difficulty = DIFF_KEYS[(i + 1) % DIFF_KEYS.length]; saveSettings(); SFX.tick(); } if (a === "down") { var i2 = DIFF_KEYS.indexOf(G.settings.difficulty); G.settings.difficulty = DIFF_KEYS[(i2 + DIFF_KEYS.length - 1) % DIFF_KEYS.length]; saveSettings(); SFX.tick(); } if (a === "hit") { SFX.select(); startMatch(); } if (a === "pause") setState("menu"); }
  function handleToss(a) { var T = G.toss; if (!T) return; if (T.phase === "call") { if (a === "left" || a === "right") { T.sel = 1 - T.sel; SFX.tick(); } if (a === "hit") { T.phase = "flip"; T.timer = 0; T.resolved = false; SFX.select(); } } else if (T.phase === "choice") { if (a === "left" || a === "right") { T.sel = 1 - T.sel; SFX.tick(); } if (a === "hit") startAfterToss(); } else if (T.phase === "lost" && a === "hit") { startAfterToss(); } }

  function handleInnings(a) {
    var b = G.ball; if (!b) return;
    if (b.phase === "flight" && b.batting) {
      if (a === "left") { b.aim = (b.aim + 7) % 8; SFX.tick(); }
      if (a === "right") { b.aim = (b.aim + 1) % 8; SFX.tick(); }
      if (a === "up") { b.loft = true; SFX.tick(); }
      if (a === "down") { b.loft = false; SFX.tick(); }
      if (a === "hit" && !b.swingQueued) { b.swingQueued = true; b.swingT = 0.01; var d = Math.abs(b.timPos - 0.5), w = G.diff.window; if (d <= w * 0.30) b.queuedQuality = "perfect"; else if (d <= w * 0.65) b.queuedQuality = "good"; else if (d <= w) b.queuedQuality = "ok"; else b.queuedQuality = "miss"; }
      if (b.swingQueued && !b.resolved && b.t / b.duration >= 0.85) resolveBat(b.queuedQuality || "miss");
    } else if (b.phase === "aim") {
      if (a === "left") { setLine(b, (b.line + 2) % 3); SFX.tick(); }
      if (a === "right") { setLine(b, (b.line + 1) % 3); SFX.tick(); }
      if (a === "up") { setLen(b, (b.length + 1) % 4); SFX.tick(); }
      if (a === "down") { setLen(b, (b.length + 3) % 4); SFX.tick(); }
      if (a === "hit") { b.phase = "release"; b.accPos = 0.05; b.accDir = 1; SFX.tick(); }
    } else if (b.phase === "release" && a === "hit") { b.phase = "flight"; b.t = 0; b.duration = 1.3; SFX.bowl(); }
  }

  function handleResult(a) { if (a === "hit") { setState("teamSelect"); SFX.select(); } }
  function handleSettings(a) { if (a === "up") { G.menuSel = (G.menuSel + 4) % 5; SFX.click(); } if (a === "down") { G.menuSel = (G.menuSel + 1) % 5; SFX.click(); } if (a === "hit") { var s = G.settings; SFX.select(); if (G.menuSel === 0) { s.sound = !s.sound; muted = !s.sound; } else if (G.menuSel === 1) { var i = PALETTE_KEYS.indexOf(s.palette); s.palette = PALETTE_KEYS[(i + 1) % PALETTE_KEYS.length]; P = PALETTES[s.palette]; } else if (G.menuSel === 2) s.scanlines = !s.scanlines; else if (G.menuSel === 3) s.assist = !s.assist; else if (G.menuSel === 4) { setState("menu"); return; } saveSettings(); syncSoundButton(); } if (a === "pause") setState("menu"); }
  function handlePause(a) { if (a === "up") { G.menuSel = (G.menuSel + 2) % 3; SFX.click(); } if (a === "down") { G.menuSel = (G.menuSel + 1) % 3; SFX.click(); } if (a === "hit") { if (G.menuSel === 0) { G.screen = G.prev || "innings"; G.menuSel = 0; SFX.click(); } else if (G.menuSel === 1) { setState("teamSelect"); SFX.click(); } else { setState("menu"); SFX.click(); } } if (a === "pause") { G.screen = G.prev || "innings"; G.menuSel = 0; } }

  function continueAfterBreak() { var m = G.match; beginInnings(m.nextBats, m.target); }
  function toggleSound() { G.settings.sound = !G.settings.sound; muted = !G.settings.sound; saveSettings(); syncSoundButton(); if (!muted) SFX.tick(); }
  function syncSoundButton() { var b = document.getElementById("ck-sound"); if (b) { b.setAttribute("aria-pressed", G.settings.sound ? "false" : "true"); b.innerHTML = G.settings.sound ? "🔊" : "🔇"; } }

  function setState(name) { G.screen = name; G.stateT = 0; G.hitboxes = []; G.menuSel = 0; if (name === "teamSelect" && G.mode === "career") { var c = loadCareer(); G.settings.difficulty = DIFF_KEYS[Math.min(4, Math.floor((c.level - 1) / 2))]; } var p = document.getElementById("game"); if (p && (("ontouchstart" in window) || navigator.maxTouchPoints > 0)) { var padOn = { innings: 1, toss: 1, break: 1, result: 1, tourBracket: 1 }; p.setAttribute("data-pad", padOn[name] ? "on" : "off"); } }

  function update(dt) {
    G.time += dt; G.shake = Math.max(0, G.shake - dt * 20); G.flash = Math.max(0, G.flash - dt * 1.6); updateParticles(dt); camUpdate(dt);
    if (G.screen === "toss" && G.toss && G.toss.phase === "flip") { G.toss.timer += dt; if (G.toss.timer > 1.6 && !G.toss.resolved) resolveTossFlip(); }
    if (G.ball) { if (G.ball.phase === "flight") { if (G.ball.batting) updateBattingFlight(dt); else updateBowlingFlight(dt); } else if (G.ball.phase === "release") { G.ball.accPos += G.ball.accDir * dt * 1.8; if (G.ball.accPos >= 1) { G.ball.accPos = 1; G.ball.accDir = -1; } if (G.ball.accPos <= 0) { G.ball.accPos = 0; G.ball.accDir = 1; } } else if (G.ball.phase === "field") { updateFieldAnim(dt); } }
  }

  function updateBattingFlight(dt) { var b = G.ball; b.t += dt; var speed = G.diff.barSpeed * (G.settings.assist ? 0.82 : 1); b.timPos += b.timDir * dt * speed; if (b.timPos >= 1) { b.timPos = 1; b.timDir = -1; } if (b.timPos <= 0) { b.timPos = 0; b.timDir = 1; } if (b.swingQueued && !b.resolved) b.swingT = Math.min(1, b.swingT + dt * 6); if (b.t / b.duration >= 1 && !b.resolved) { b.swingQueued = false; b.swingT = 0; resolveBat("miss"); } }
  function updateBowlingFlight(dt) { var b = G.ball; b.t += dt; if (b.t > 0.60 && b.swingT === 0) b.swingT = 0.01; if (b.swingT > 0) b.swingT = Math.min(1, b.swingT + dt * 5); if (b.t >= 0.90 && !b.resolved) resolveBowl(); }

  function draw() { if (!ctx) return; ctx.save(); if (G.shake > 0.2) ctx.translate(rand(-G.shake, G.shake), rand(-G.shake, G.shake)); ctx.clearRect(-20, -20, VW + 40, VH + 40); switch (G.screen) { case "menu": drawMainMenu(); break; case "teamSelect": drawTeamSelect(); break; case "toss": drawToss(); break; case "innings": drawInningsView(); break; case "break": drawBreak(); break; case "result": drawResult(); break; case "settings": drawSettings(); break; case "howto": drawHowTo(); break; case "pause": drawInningsView(); drawPause(); break; case "tourBracket": drawTourBracket(); break; } if (G.flash > 0) { ctx.fillStyle = "rgba(255,255,255," + G.flash + ")"; ctx.fillRect(0, 0, VW, VH); } if (G.settings.scanlines) { ctx.fillStyle = P.scan; for (var y = 0; y < VH; y += 3) ctx.fillRect(0, y, VW, 1); } ctx.restore(); }

  var KEYMAP = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", Space: "hit", Enter: "hit", KeyP: "pause", Escape: "pause", KeyM: "mute" };

  function bindInput() {
    document.addEventListener("keydown", function (e) { var a = KEYMAP[e.code]; if (!a) return; if (e.code === "Space" || e.code.indexOf("Arrow") === 0) e.preventDefault(); if (G.keyHeld[e.code]) return; G.keyHeld[e.code] = true; audioInit(); handleAction(a); }, { passive: false });
    document.addEventListener("keyup", function (e) { G.keyHeld[e.code] = false; });
    function bindBtn(id, action) { var el = document.getElementById(id); if (!el) return; el.addEventListener("pointerdown", function (e) { e.preventDefault(); audioInit(); if (!G.touchHeld[id]) handleAction(action); G.touchHeld[id] = true; el.classList.add("active"); }); el.addEventListener("pointerup", function () { G.touchHeld[id] = false; el.classList.remove("active"); }); el.addEventListener("pointercancel", function () { G.touchHeld[id] = false; el.classList.remove("active"); }); el.addEventListener("pointerleave", function () { G.touchHeld[id] = false; el.classList.remove("active"); }); }
    bindBtn("ck-left", "left"); bindBtn("ck-right", "right"); bindBtn("ck-up", "up"); bindBtn("ck-down", "down"); bindBtn("ck-hit", "hit"); bindBtn("ck-pause", "pause"); bindBtn("ck-sound", "mute");
    if (cv) { cv.addEventListener("pointerdown", function (e) { e.preventDefault(); audioInit(); var r = cv.getBoundingClientRect(); var x = (e.clientX - r.left) * (VW / r.width); var y = (e.clientY - r.top) * (VH / r.height); for (var i = G.hitboxes.length - 1; i >= 0; i--) { var b = G.hitboxes[i]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { audioInit(); SFX.click(); handleHitboxAction(b.action); return; } } if (G.screen !== "menu" && G.screen !== "teamSelect") handleAction("hit"); }); }
    document.addEventListener("visibilitychange", function () { if (document.hidden && G.screen === "innings") { G.prev = "innings"; G.screen = "pause"; } });
  }

  function handleHitboxAction(a) { if (!a) return; if (a.indexOf("mode:") === 0) { G.mode = a.slice(5); setState("teamSelect"); return; } if (a === "settings") { setState("settings"); return; } if (a === "startMatch") return startMatch(); if (a === "back") return setState("menu"); if (a === "continue") { if (G.screen === "toss") return startAfterToss(); if (G.screen === "tourBracket") return openToss(); return continueAfterBreak(); } if (a === "tourNext") return openToss(); if (a === "restart") return startMatch(); if (a === "menu") return setState("menu"); if (a.indexOf("call:") === 0) { G.toss.sel = parseInt(a.slice(5), 10); G.toss.phase = "flip"; G.toss.timer = 0; G.toss.resolved = false; SFX.select(); return; } if (a.indexOf("choose:") === 0) { G.toss.sel = parseInt(a.slice(7), 10); startAfterToss(); return; } if (a === "prevTeam") { G.teams.player = (G.teams.player + 11) % 12; if (G.teams.player === G.teams.opp) G.teams.opp = (G.teams.opp + 1) % 12; return; } if (a === "nextOpp") { G.teams.opp = (G.teams.opp + 1) % 12; if (G.teams.opp === G.teams.player) G.teams.opp = (G.teams.opp + 1) % 12; return; } if (a === "cycleDiff") { var i = DIFF_KEYS.indexOf(G.settings.difficulty); G.settings.difficulty = DIFF_KEYS[(i + 1) % DIFF_KEYS.length]; saveSettings(); return; } if (a.indexOf("setting:") === 0) { G.menuSel = parseInt(a.slice(8), 10); handleSettings("hit"); return; } if (a.indexOf("pause:") === 0) { G.menuSel = parseInt(a.slice(6), 10); handlePause("hit"); return; } }

  function boot() { G.settings = loadSettings(); P = PALETTES[G.settings.palette] || PALETTES.day; muted = !G.settings.sound; syncSoundButton(); G.teams.opp = (G.teams.player + 1) % 12; bindInput(); setState("menu"); var last = performance.now(); function frame(t) { var dt = Math.min(0.05, (t - last) / 1000); last = t; update(dt); draw(); requestAnimationFrame(frame); } requestAnimationFrame(frame); window.CNKCricket = { G: G, state: function () { return G.screen; } }; window.CNKGame = Object.assign({}, window.CNKGame || {}, window.CNKCricket); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

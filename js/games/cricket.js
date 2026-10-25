/* ============================================================================
   Cricket Legends — Nokia-style pixel cricket
   chanaku.pages.dev/games/cricket

   Renders into a 150×150 offscreen buffer and blits it to the 600×600 board
   at exactly 4×, so every virtual pixel stays a clean 4×4 square.

   Modes      : quick · tournament · super over · endless · practice
   Innings    : both are playable — you bat, and you bowl.
   Persistence: settings + best score + last match in localStorage.

   Contract kept from the previous build:
     #ck-board #ck-up #ck-down #ck-left #ck-right #ck-hit
     #ck-sound #ck-fs #ck-pause #ck-score-disp #ck-best-disp
     CNKGame.touch / fullscreen / load / save / beep
     localStorage keys cnk-cricket-best, cnk-nokia-muted
   ========================================================================== */
(function () {
  "use strict";

  /* ── geometry ─────────────────────────────────────────────────────────── */
  var VW = 150, VH = 150;
  var BPO = 6;                        // balls per over

  /* ── storage keys ─────────────────────────────────────────────────────── */
  var LS_BEST = "cnk-cricket-best";
  var LS_SET  = "cnk-cricket-settings";
  var LS_LAST = "cnk-cricket-last";
  var LS_MUTE = "cnk-nokia-muted";

  /* ── palette ──────────────────────────────────────────────────────────── */
  var PAL = {
    color: {
      fieldA:"#4AB83A", fieldB:"#3EA832", grassHi:"#57C845",
      pitch:"#C8C0A0", pitchAlt:"#D8CEB0", crease:"#EFE9D2",
      crowd:"#20301E", crowdDot:"#48604A",
      boundary:"#EEEEDD", hudBg:"#000000", hudLine:"#1E3A1E",
      white:"#F0F0E0", yellow:"#FFEE00", orange:"#FF8800", red:"#FF3333",
      menuBg:"#001800", menuSel:"#007700", menuTxt:"#88CC88", menuSelTxt:"#EEFFEE",
      menuDim:"#335533", menuTitle:"#00FF44",
      notifBg:"#07091C", notifBorder:"#5468A8",
      ball:"#CC1111", ballHi:"#FF6A6A",
      stump:"#D0C090", bail:"#F0E0A0", fielderCol:"#EEEEDD",
      panel:"#DDDDC8", panelBorder:"#9999AA", panelTxt:"#223322",
      tzMiss:"#7A1E1E", tzOk:"#8A7A00", tzGood:"#226622", tzPerf:"#44CC44",
      skin:"#C09070", skinD:"#9A6B4E", helmet:"#1A2040", pad:"#EFE6C4", bat:"#C8A040",
      scan:"rgba(0,0,0,0.12)"
    },
    lcd: {
      fieldA:"#9BBC0F", fieldB:"#8BAC0F", grassHi:"#A8C94A",
      pitch:"#C4D96B", pitchAlt:"#B8CC5E", crease:"#E4F09A",
      crowd:"#0F380F", crowdDot:"#306230",
      boundary:"#0F380F", hudBg:"#0F380F", hudLine:"#306230",
      white:"#E8F5B0", yellow:"#0F380F", orange:"#306230", red:"#0F380F",
      menuBg:"#0F380F", menuSel:"#306230", menuTxt:"#9BBC0F", menuSelTxt:"#E8F5B0",
      menuDim:"#1E4A1E", menuTitle:"#E8F5B0",
      notifBg:"#0F380F", notifBorder:"#306230",
      ball:"#0F380F", ballHi:"#5A7A1E",
      stump:"#0F380F", bail:"#0F380F", fielderCol:"#0F380F",
      panel:"#C4D96B", panelBorder:"#306230", panelTxt:"#0F380F",
      tzMiss:"#306230", tzOk:"#4E7A1F", tzGood:"#6E9B2A", tzPerf:"#0F380F",
      skin:"#8BAC0F", skinD:"#306230", helmet:"#0F380F", pad:"#C4D96B", bat:"#306230",
      scan:"rgba(15,56,15,0.10)"
    },
    amber: {
      fieldA:"#E8A33D", fieldB:"#D8942E", grassHi:"#F2B44D",
      pitch:"#F2D18A", pitchAlt:"#E8C57B", crease:"#FFF0C8",
      crowd:"#3D1E00", crowdDot:"#7A3D00",
      boundary:"#3D1E00", hudBg:"#2A1400", hudLine:"#7A3D00",
      white:"#FFF3D0", yellow:"#3D1E00", orange:"#7A3D00", red:"#5A1F00",
      menuBg:"#2A1400", menuSel:"#7A3D00", menuTxt:"#FFC46B", menuSelTxt:"#FFF3D0",
      menuDim:"#5A2E00", menuTitle:"#FFD98A",
      notifBg:"#2A1400", notifBorder:"#7A3D00",
      ball:"#3D1E00", ballHi:"#8A4A00",
      stump:"#3D1E00", bail:"#3D1E00", fielderCol:"#3D1E00",
      panel:"#F2D18A", panelBorder:"#7A3D00", panelTxt:"#2A1400",
      tzMiss:"#7A3D00", tzOk:"#A85C00", tzGood:"#C97A00", tzPerf:"#3D1E00",
      skin:"#E8B06B", skinD:"#B87A38", helmet:"#2A1400", pad:"#FFF0C8", bat:"#A86A2A",
      scan:"rgba(42,20,0,0.10)"
    }
  };

  var C = PAL.color;

  /* ── teams ────────────────────────────────────────────────────────────── */
  var TEAMS = [
    { id:"SL",  name:"Sri Lanka",    kitA:"#1B3FCC", kitB:"#FFD200" },
    { id:"IN",  name:"India",        kitA:"#1B4FA0", kitB:"#FF8A00" },
    { id:"AUS", name:"Australia",    kitA:"#0B6B3A", kitB:"#FFD700" },
    { id:"ENG", name:"England",      kitA:"#1B3C8C", kitB:"#FFFFFF" },
    { id:"WI",  name:"West Indies",  kitA:"#7A0C1E", kitB:"#FFD700" },
    { id:"PAK", name:"Pakistan",     kitA:"#0A5C2E", kitB:"#FFFFFF" },
    { id:"SA",  name:"South Africa", kitA:"#007A4D", kitB:"#FFB612" },
    { id:"NZ",  name:"New Zealand",  kitA:"#111111", kitB:"#DDDDDD" }
  ];

  /* ── difficulty ───────────────────────────────────────────────────────── */
  var DIFFS = {
    gully: { key:"gully", name:"GULLY",         bar:0.78, win:0.20, skill:0.35, fielders:3, ai:0.55 },
    club:  { key:"club",  name:"CLUB",          bar:1.00, win:0.16, skill:0.50, fielders:4, ai:0.80 },
    state: { key:"state", name:"STATE",         bar:1.22, win:0.13, skill:0.66, fielders:5, ai:1.05 },
    intl:  { key:"intl",  name:"INTERNATIONAL", bar:1.44, win:0.10, skill:0.80, fielders:6, ai:1.30 }
  };
  var DIFF_KEYS = ["gully", "club", "state", "intl"];

  /* ── modes ────────────────────────────────────────────────────────────── */
  var MODES = {
    quick:    { key:"quick",    name:"QUICK MATCH", overs:5,  wkts:10, solo:false, noWkts:false },
    tour:     { key:"tour",     name:"TOURNAMENT",  overs:5,  wkts:10, solo:false, noWkts:false },
    super:    { key:"super",    name:"SUPER OVER",  overs:1,  wkts:2,  solo:false, noWkts:false },
    endless:  { key:"endless",  name:"ENDLESS",     overs:20, wkts:10, solo:true,  noWkts:false },
    practice: { key:"practice", name:"PRACTICE",    overs:10, wkts:99, solo:true,  noWkts:true  }
  };
  var MODE_KEYS = ["quick", "tour", "super", "endless", "practice"];

  /* ── fielding zones (top-down coordinates inside the oval) ────────────── */
  var ZONES = [
    { s:"FL", n:"FINE LEG", x:30,  y:112 },
    { s:"SL", n:"SQ LEG",   x:18,  y:78  },
    { s:"ST", n:"STRAIGHT", x:75,  y:24  },
    { s:"CV", n:"COVER",    x:118, y:50  },
    { s:"PT", n:"POINT",    x:128, y:84  },
    { s:"TM", n:"3RD MAN",  x:114, y:116 }
  ];

  var FIELD = { cx:75, cy:76, rx:64, ry:58 };

  /* ── pitch geometry (perspective, camera behind the striker) ──────────── */
  var PT = { farY:26, nearY:126, farHW:16, nearHW:56, cx:75 };

  /* ── helpers ──────────────────────────────────────────────────────────── */
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ri(n) { return Math.floor(Math.random() * n); }
  function rf(lo, hi) { return lo + Math.random() * (hi - lo); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function round(v) { return Math.round(v); }

  /* ── canvas ───────────────────────────────────────────────────────────── */
  var cv = document.getElementById("ck-board");
  var ctx = cv ? cv.getContext("2d") : null;

  var oc = document.createElement("canvas");
  oc.width = VW; oc.height = VH;
  var octx = oc.getContext("2d");

  function fr(x, y, w, h, col) {
    if (w <= 0 || h <= 0) return;
    octx.fillStyle = col;
    octx.fillRect(round(x), round(y), Math.max(1, round(w)), Math.max(1, round(h)));
  }

  function tx(str, x, y, col, size, align) {
    octx.fillStyle = col || C.white;
    octx.font = (size || 5) + "px monospace";
    octx.textAlign = align || "left";
    octx.textBaseline = "top";
    octx.fillText("" + str, round(x), round(y));
  }

  function dot(x, y, r, col) {
    octx.fillStyle = col;
    octx.beginPath();
    octx.arc(x, y, r, 0, Math.PI * 2);
    octx.fill();
  }

  function ellipseStroke(cx, cy, rx, ry, col, lw) {
    octx.strokeStyle = col;
    octx.lineWidth = lw || 1;
    octx.beginPath();
    if (octx.ellipse) {
      octx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    } else {
      for (var i = 0; i <= 48; i++) {
        var a = (i / 48) * Math.PI * 2;
        var px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
        if (i === 0) octx.moveTo(px, py); else octx.lineTo(px, py);
      }
    }
    octx.stroke();
  }

  function pitchX(norm, y) {
    var t = clamp((y - PT.farY) / (PT.nearY - PT.farY), 0, 1);
    var hw = lerp(PT.farHW, PT.nearHW, t);
    return PT.cx - hw + hw * 2 * norm;
  }

  /* ── sound ────────────────────────────────────────────────────────────── */
  var SFX = {
    on: function () { return S.settings.sound; },
    b: function (f, ms, type) {
      if (typeof CNKGame !== "undefined" && CNKGame.beep) CNKGame.beep(S.settings.sound, f, ms, type);
    },
    menu:   function () { SFX.b(560, 40); },
    tick:   function () { SFX.b(760, 25); },
    select: function () { SFX.b(880, 70); SFX.b(1180, 60); },
    bowl:   function () { SFX.b(300, 60, "triangle"); },
    bat:    function () { SFX.b(340, 45, "sawtooth"); },
    edge:   function () { SFX.b(520, 35, "square"); },
    miss:   function () { SFX.b(170, 110, "square"); },
    four:   function () { SFX.b(760, 80); SFX.b(1140, 110); },
    six:    function () { SFX.b(900, 90); SFX.b(1350, 130); SFX.b(1800, 90); },
    out:    function () { SFX.b(220, 180, "sawtooth"); SFX.b(150, 220, "sawtooth"); },
    win:    function () { [660, 880, 1100, 1320, 1760].forEach(function (f, i) { setTimeout(function () { SFX.b(f, 140); }, i * 95); }); },
    lose:   function () { [440, 330, 247].forEach(function (f, i) { setTimeout(function () { SFX.b(f, 190, "sawtooth"); }, i * 130); }); }
  };

  /* ── settings ─────────────────────────────────────────────────────────── */
  var DEFAULT_SETTINGS = { sound: true, palette: "color", scan: false, assist: true };

  var S = {
    screen: "menu",
    menuSel: 0,
    pauseSel: 0,
    settings: (typeof CNKGame !== "undefined" && CNKGame.load)
      ? CNKGame.load(LS_SET, DEFAULT_SETTINGS)
      : DEFAULT_SETTINGS,
    setup: { team: 0, diff: 1, row: 0 },
    mode: "quick",
    diff: DIFFS.club,
    toss: null,
    innings: null,
    match: null,
    tour: null,
    time: 0,
    flash: 0,
    shake: 0
  };

  function saveSettings() {
    if (typeof CNKGame !== "undefined" && CNKGame.save) CNKGame.save(LS_SET, S.settings);
    try {
      localStorage.setItem(LS_MUTE, S.settings.sound ? "0" : "1");
    } catch (e) {}
  }

  function applyPalette() {
    C = PAL[S.settings.palette] || PAL.color;
  }

  /* ── persistence helpers ──────────────────────────────────────────────── */
  function readBest() {
    try { return parseInt(localStorage.getItem(LS_BEST), 10) || 0; } catch (e) { return 0; }
  }
  function writeBest(v) {
    try { localStorage.setItem(LS_BEST, String(v)); } catch (e) {}
  }
  function writeLast(line) {
    try { localStorage.setItem(LS_LAST, JSON.stringify({ line: line, t: Date.now() })); } catch (e) {}
    var el = document.getElementById("ck-score-disp");
    if (el) el.textContent = line;
  }
  function mirrorBest(v) {
    var el = document.getElementById("ck-best-disp");
    if (el) el.textContent = String(v);
  }

  /* ── sprites ──────────────────────────────────────────────────────────── */
  function spriteBatsman(x, y, kitA, kitB, swing) {
    fr(x - 7, y, 15, 2, "rgba(0,0,0,0.22)");
    fr(x - 4, y - 9, 3, 9, kitB);
    fr(x + 1, y - 9, 3, 9, kitB);
    fr(x - 4, y - 8, 1, 7, C.pad);
    fr(x + 3, y - 8, 1, 7, C.pad);
    fr(x - 5, y - 18, 10, 9, kitA);
    fr(x - 7, y - 17, 2, 7, C.skin);
    fr(x + 5, y - 16, 2, 6, C.skin);
    fr(x - 5, y - 27, 10, 8, C.helmet);
    fr(x - 4, y - 26, 8, 3, "#2A3050");
    fr(x - 2, y - 25, 4, 2, C.skin);
    if (swing > 0) {
      var a = swing * Math.PI;
      var bx = x + 6 + Math.cos(a) * 9;
      var by = y - 22 - Math.sin(a) * 11;
      fr(bx - 1, by, 3, 12, C.bat);
      fr(bx - 1, by - 3, 3, 3, C.bat);
    } else {
      fr(x + 7, y - 24, 3, 20, C.bat);
      fr(x + 7, y - 4, 4, 3, C.bat);
    }
  }

  function spriteBowler(x, y, phase, kitA, small) {
    var s = small ? 0.72 : 1;
    var h = 22 * s, w = 9 * s;
    var stride = (phase > 0.15 && phase < 0.72) ? 2 : 0;
    fr(x - w / 2 - 1, y, w + 3, 2, "rgba(0,0,0,0.18)");
    fr(x - 3 * s, y - 8 * s, 2 * s, 8 * s, C.skinD);
    fr(x + 1 * s + stride, y - 8 * s, 2 * s, 8 * s, C.skinD);
    fr(x - w / 2, y - h * 0.72, w, h * 0.42, kitA);
    fr(x - w / 2 - 1, y - h * 0.7, 2 * s, 7 * s, C.skin);
    if (phase > 0.72) fr(x + w / 2, y - h * 0.95, 2 * s, 9 * s, C.skin);
    fr(x - 3 * s, y - h * 0.95, 6 * s, 5 * s, C.skin);
    fr(x - 3.5 * s, y - h, 7 * s, 2 * s, kitA);
  }

  function spriteStumps(cx, cy, w, h) {
    fr(cx - w / 2, cy, 1, h, C.stump);
    fr(cx, cy, 1, h, C.stump);
    fr(cx + w / 2, cy, 1, h, C.stump);
    fr(cx - w / 2, cy, w + 1, 1, C.bail);
  }

  function spriteFielder(x, y) {
    fr(x - 1, y + 1, 3, 1, "rgba(0,0,0,0.20)");
    fr(x - 1, y - 6, 3, 5, C.fielderCol);
    fr(x - 1, y - 8, 2, 2, C.fielderCol);
  }

  /* ── drawing: shared chrome ───────────────────────────────────────────── */
  function drawHUD() {
    var I = S.innings, m = S.match;
    fr(0, 0, VW, 22, C.hudBg);
    fr(0, 22, VW, 1, C.hudLine);

    var pT = m.playerTeam, oT = m.oppTeam;
    fr(2, 3, 9, 9, pT.kitA);
    fr(3, 4, 7, 2, pT.kitB);
    fr(13, 3, 9, 9, oT.kitA);
    fr(14, 4, 7, 2, oT.kitB);

    tx(I.runs + "/" + I.wkts, 26, 2, C.white, 8);
    tx(Math.floor(I.balls / BPO) + "." + (I.balls % BPO), 26, 12, C.yellow, 5);

    if (I.target) {
      var need = Math.max(0, I.target - I.runs);
      var left = Math.max(0, I.maxBalls - I.balls);
      tx(need > 0 ? "NEED " + need : "TARGET MET", VW - 3, 2, need > 0 ? C.orange : C.menuTitle, 5, "right");
      tx(left + " BALLS", VW - 3, 12, C.white, 5, "right");
    } else {
      tx(S.diff.name, VW - 3, 2, C.orange, 4, "right");
      tx((I.maxBalls - I.balls) + " BALLS", VW - 3, 12, C.white, 4, "right");
    }
  }

  function drawTimingBar(I) {
    var x = 20, y = 128, w = 110, h = 6;
    var w2 = S.diff.win;
    fr(x - 1, y - 1, w + 2, h + 2, "#000");
    fr(x, y, w, h, C.tzMiss);
    fr(x + (0.5 - w2) * w, y, w2 * 2 * w, h, C.tzOk);
    fr(x + (0.5 - w2 * 0.65) * w, y, w2 * 1.3 * w, h, C.tzGood);
    fr(x + (0.5 - w2 * 0.30) * w, y, w2 * 0.6 * w, h, C.tzPerf);
    var mx = x + I.timPos * w;
    fr(mx - 1, y - 2, 3, h + 4, "#FFFFFF");
  }

  function drawAimLabel(I) {
    var z = ZONES[I.aim];
    var hasF = I.fielders.indexOf(I.aim) >= 0;
    var label = (I.loft ? "LOFT " : "GROUND ") + z.n + (hasF ? " !" : "");
    tx("<", 6, 139, C.menuTxt, 5);
    tx(">", VW - 6, 139, C.menuTxt, 5, "right");
    tx(label, VW / 2, 139, hasF ? C.red : C.yellow, 5, "center");
  }

  function drawNotif(txt, sub) {
    var w = Math.max(80, txt.length * 6 + 18);
    var x = (VW - w) / 2, y = 56;
    fr(x - 2, y - 2, w + 4, sub ? 32 : 22, C.notifBorder);
    fr(x, y, w, sub ? 28 : 18, C.notifBg);
    tx(txt, VW / 2, y + 4, C.white, 7, "center");
    if (sub) tx(sub, VW / 2, y + 15, C.yellow, 4, "center");
  }

  /* ── drawing: batting view ────────────────────────────────────────────── */
  function drawBatView() {
    var I = S.innings, m = S.match;

    fr(0, 22, VW, VH - 22, C.fieldA);

    /* crowd band */
    fr(0, 22, VW, 10, C.crowd);
    for (var i = 0; i < 60; i++) {
      fr((i * 17) % VW, 24 + ((i * 7) % 6), 1, 1, C.crowdDot);
    }

    /* mown stripes */
    for (var y = 32; y < VH; y += 12) {
      fr(0, y, VW, 6, C.fieldB);
    }

    /* pitch polygon */
    octx.save();
    octx.beginPath();
    octx.moveTo(PT.cx - PT.farHW, PT.farY);
    octx.lineTo(PT.cx + PT.farHW, PT.farY);
    octx.lineTo(PT.cx + PT.nearHW, PT.nearY);
    octx.lineTo(PT.cx - PT.nearHW, PT.nearY);
    octx.closePath();
    octx.fillStyle = C.pitch;
    octx.fill();
    octx.clip();
    for (var py = PT.farY; py < PT.nearY; py += 4) {
      fr(PT.cx - PT.nearHW, py, PT.nearHW * 2, 2, C.pitchAlt);
    }
    octx.restore();

    /* creases */
    fr(pitchX(0.5, 118) - 22, 118, 44, 1, C.crease);
    fr(pitchX(0.5, 36) - 10, 36, 20, 1, C.crease);

    /* far stumps + bowler */
    spriteStumps(PT.cx, PT.farY + 1, 7, 5);
    spriteBowler(PT.cx, PT.farY + 14, I.bowlerPhase, m.oppTeam.kitA, true);

    /* the ball, with a short trail */
    if (I.phase === "flight" || I.phase === "done") {
      for (var k = 3; k >= 1; k--) {
        var q = ballPoint(I, Math.max(0, I.t - k * 0.018));
        fr(q.x - 1, q.y - 1, 2, 2, C.ballHi);
      }
      var b = ballPoint(I, I.t);
      fr(b.x - 1, b.y - 1, 4, 4, C.ball);
      fr(b.x - 1, b.y - 1, 1, 1, C.ballHi);
    }

    /* striker */
    spriteBatsman(70, 122, m.playerTeam.kitA, m.playerTeam.kitB, I.swingT);

    drawHUD();

    if (I.phase === "flight") {
      drawTimingBar(I);
      drawAimLabel(I);
    }

    if (I.message) drawNotif(I.message);
  }

  function ballPoint(I, t) {
    var u = clamp(t / 0.95, 0, 1);
    var y = lerp(PT.farY + 10, PT.nearY - 6, u);
    /* bounce: dip below the straight line just after pitching */
    var bounceT = 0.55;
    var bounce = u < bounceT ? 0 : Math.sin(((u - bounceT) / (1 - bounceT)) * Math.PI) * 5;
    var norm = 0.5 + (I.deliveryLine - 1) * 0.22;
    return { x: pitchX(norm, y), y: y - bounce };
  }

  /* ── drawing: bowling view (camera behind the bowler) ─────────────────── */
  function drawBowlView() {
    var I = S.innings, m = S.match;

    fr(0, 22, VW, VH - 22, C.fieldA);
    fr(0, 22, VW, 10, C.crowd);
    for (var i = 0; i < 60; i++) fr((i * 13) % VW, 24 + ((i * 5) % 6), 1, 1, C.crowdDot);
    for (var y = 32; y < VH; y += 12) fr(0, y, VW, 6, C.fieldB);

    octx.save();
    octx.beginPath();
    octx.moveTo(PT.cx - PT.nearHW, PT.nearY);
    octx.lineTo(PT.cx + PT.nearHW, PT.nearY);
    octx.lineTo(PT.cx + PT.farHW, PT.farY);
    octx.lineTo(PT.cx - PT.farHW, PT.farY);
    octx.closePath();
    octx.fillStyle = C.pitch;
    octx.fill();
    octx.clip();
    for (var py = PT.farY; py < PT.nearY; py += 4) fr(0, py, VW, 2, C.pitchAlt);
    octx.restore();

    fr(pitchX(0.5, 36) - 10, 36, 20, 1, C.crease);

    /* AI batsman at the far end */
    spriteBatsman(PT.cx - 2, PT.farY + 18, m.oppTeam.kitA, m.oppTeam.kitB, I.swingT);
    spriteStumps(PT.cx, PT.farY + 2, 7, 5);

    /* your bowler at the near end, back to camera */
    spriteBowler(PT.cx, 118, I.bowlerPhase, m.playerTeam.kitA, false);

    if (I.phase === "flight" || I.phase === "done") {
      var u = clamp(I.t / 0.95, 0, 1);
      var by = lerp(118, 40, u);
      var bx = lerp(PT.cx, pitchX(0.5 + (I.line - 1) * 0.22, by), 0.35);
      fr(bx - 1, by - 1, 4, 4, C.ball);
      fr(bx - 1, by - 1, 1, 1, C.ballHi);
    }

    drawHUD();

    if (I.phase === "aim") drawBowlPicker(I);
    if (I.phase === "release") drawAccuracyBar(I);

    if (I.message) drawNotif(I.message);
  }

  function drawBowlPicker(I) {
    var y = 128;
    fr(14, y - 2, 122, 18, "#000");
    var lines = ["SHORT", "GOOD", "FULL", "YORKER"];
    tx("LENGTH", 18, y, C.menuTxt, 4);
    for (var i = 0; i < 4; i++) {
      var x = 18 + i * 20;
      var on = i === I.length;
      fr(x, y + 6, 18, 8, on ? C.menuSel : C.menuDim);
      tx(lines[i], x + 9, y + 7, on ? C.menuSelTxt : C.menuTxt, 3, "center");
    }
    var lx = 100 + I.line * 15;
    tx("LINE", 100, y - 1, C.menuTxt, 3);
    fr(lx, y + 6, 13, 8, C.yellow);
    tx(I.line === 0 ? "LEG" : I.line === 1 ? "MID" : "OFF", lx + 6, y + 7, C.menuBg, 3, "center");
  }

  function drawAccuracyBar(I) {
    var x = 20, y = 128, w = 110, h = 7;
    fr(x - 1, y - 1, w + 2, h + 2, "#000");
    fr(x, y, w, h, C.tzMiss);
    fr(x + w * 0.36, y, w * 0.28, h, C.tzGood);
    fr(x + w * 0.44, y, w * 0.12, h, C.tzPerf);
    var mx = x + I.accPos * w;
    fr(mx - 1, y - 3, 3, h + 6, "#FFFFFF");
    tx("RELEASE", VW / 2, y - 8, C.white, 4, "center");
  }

  /* ── drawing: field ───────────────────────────────────────────────────── */
  function drawField() {
    var I = S.innings, f = I.field;

    fr(0, 22, VW, VH - 22, C.fieldA);
    for (var y = 24; y < VH; y += 10) fr(0, y, VW, 5, C.fieldB);

    ellipseStroke(FIELD.cx, FIELD.cy, FIELD.rx, FIELD.ry, C.boundary, 1);
    ellipseStroke(FIELD.cx, FIELD.cy, FIELD.rx * 0.58, FIELD.ry * 0.58, "rgba(255,255,255,0.22)", 1);

    fr(FIELD.cx - 3, FIELD.cy - 34, 6, 68, C.pitch);
    fr(FIELD.cx - 4, FIELD.cy - 34, 8, 1, C.crease);
    fr(FIELD.cx - 4, FIELD.cy + 33, 8, 1, C.crease);

    for (var i = 0; i < I.fielders.length; i++) {
      var z = ZONES[I.fielders[i]];
      spriteFielder(z.x, z.y);
    }

    if (f) {
      var t = clamp(f.t / f.dur, 0, 1);
      var e = easeOut(t);
      var zz = ZONES[f.zone];
      var bx = lerp(FIELD.cx, zz.x, e);
      var by = lerp(FIELD.cy + 20, zz.y, e) - Math.sin(e * Math.PI) * (f.loft ? 22 : 8);
      for (var k = 3; k >= 1; k--) {
        var e2 = easeOut(clamp((f.t - k * 0.03) / f.dur, 0, 1));
        fr(lerp(FIELD.cx, zz.x, e2) - 1,
           lerp(FIELD.cy + 20, zz.y, e2) - Math.sin(e2 * Math.PI) * (f.loft ? 22 : 8) - 1,
           2, 2, C.ballHi);
      }
      fr(bx - 1, by - 1, 4, 4, C.ball);
      fr(bx - 1, by - 1, 1, 1, C.ballHi);
    }

    drawHUD();

    if (f) {
      var label = f.res.wicket || f.res.label || "";
      var w = Math.max(70, label.length * 6 + 16);
      fr((VW - w) / 2, 50, w, 18, C.notifBg);
      fr((VW - w) / 2, 50, w, 1, C.notifBorder);
      tx(label, VW / 2, 55, f.res.wicket ? C.red : C.yellow, 6, "center");
    }
  }

  /* ── drawing: menus ───────────────────────────────────────────────────── */
  function menuBackdrop(title, sub) {
    fr(0, 0, VW, VH, C.menuBg);
    for (var y = 0; y < VH; y += 4) {
      fr(0, y, VW, 1, "rgba(255,255,255,0.025)");
    }
    if (title) tx(title, VW / 2, 12, C.menuTitle, 9, "center");
    if (sub) tx(sub, VW / 2, 24, C.menuTxt, 4, "center");
  }

  function drawList(items, sel, y0, gap) {
    gap = gap || 16;
    for (var i = 0; i < items.length; i++) {
      var y = y0 + i * gap;
      var on = i === sel;
      if (on) {
        fr(10, y - 3, VW - 20, gap - 3, C.menuSel);
        tx("> " + items[i], VW / 2, y, C.menuSelTxt, 5, "center");
      } else {
        tx(items[i], VW / 2, y, C.menuTxt, 5, "center");
      }
    }
  }

  function drawMenu() {
    menuBackdrop(null, null);
    tx("CRICKET", VW / 2, 14, C.menuTitle, 12, "center");
    tx("LEGENDS", VW / 2, 29, C.menuTitle, 8, "center");
    tx("NOKIA EDITION", VW / 2, 40, C.menuDim, 3, "center");

    spriteStumps(64, 46, 8, 8);
    spriteStumps(80, 46, 8, 8);

    drawList(["QUICK MATCH", "TOURNAMENT", "SUPER OVER", "ENDLESS", "PRACTICE", "HOW TO PLAY", "SETTINGS"],
             S.menuSel, 62, 11);

    var best = readBest();
    tx("BEST " + best, VW / 2, VH - 8, C.orange, 4, "center");
  }

  function drawSetup() {
    menuBackdrop("NEW MATCH", MODES[S.mode].name);
    var row = S.setup.row;

    var t = TEAMS[S.setup.team];
    fr(14, 38, VW - 28, 30, t.kitA);
    fr(14, 38, VW - 28, 4, t.kitB);
    tx(t.id, VW / 2, 45, "#FFFFFF", 11, "center");
    tx(t.name, VW / 2, 58, "#FFFFFF", 4, "center");
    tx("<", 6, 47, C.menuTxt, 6);
    tx(">", VW - 6, 47, C.menuTxt, 6, "right");
    if (row === 0) fr(14, 36, VW - 28, 34, "rgba(255,255,255,0.10)");

    fr(14, 74, VW - 28, 20, row === 1 ? C.menuSel : C.menuDim);
    tx(S.diff.name, VW / 2, 80, row === 1 ? C.menuSelTxt : C.menuTxt, 6, "center");

    tx("TEAM", 4, 30, C.menuDim, 3);
    tx("DIFFICULTY", 4, 70, C.menuDim, 3);

    tx("UP/DOWN: row   LEFT/RIGHT: change", VW / 2, 104, C.menuDim, 3, "center");
    tx("HIT: START", VW / 2, VH - 10, C.yellow, 5, "center");
  }

  function drawHelp() {
    menuBackdrop("HOW TO PLAY", null);
    var lines = [
      "BAT: the bar sweeps left/right.",
      "Press HIT when the marker is",
      "in the green. Perfect = 4 or 6.",
      "",
      "< > pick the gap.  ^ toggles",
      "LOFT (boundaries, but catchable).",
      "A red ! means a fielder is there.",
      "",
      "BOWL: choose length and line,",
      "then stop the release meter in",
      "the middle. Good balls take wickets.",
      "",
      "P pause   M mute",
      "Tap the pitch on a phone."
    ];
    for (var i = 0; i < lines.length; i++) {
      tx(lines[i], 8, 34 + i * 7.4, C.menuTxt, 3.6);
    }
    tx("HIT: back", VW / 2, VH - 8, C.menuDim, 4, "center");
  }

  function drawSettings() {
    menuBackdrop("SETTINGS", null);
    var s = S.settings;
    var items = [
      "SOUND " + (s.sound ? "ON" : "OFF"),
      "PALETTE " + s.palette.toUpperCase(),
      "SCANLINES " + (s.scan ? "ON" : "OFF"),
      "TIMING AID " + (s.assist ? "ON" : "OFF"),
      "BACK"
    ];
    drawList(items, S.menuSel, 46, 18);
    tx("HIT: change", VW / 2, VH - 8, C.menuDim, 4, "center");
  }

  function drawToss() {
    menuBackdrop("THE TOSS", null);
    var T = S.toss;

    if (T.phase === "call") {
      tx("CALL IT", VW / 2, 40, C.white, 6, "center");
      drawList(["HEADS", "TAILS"], T.sel, 56, 18);
      tx("HIT: flip", VW / 2, VH - 8, C.menuDim, 4, "center");
      return;
    }

    if (T.phase === "flip") {
      var spin = Math.abs(Math.cos(T.timer * 14));
      var w = Math.max(3, 26 * spin);
      fr(VW / 2 - w / 2, 52, w, 26, C.yellow);
      fr(VW / 2 - w / 2 + 2, 54, Math.max(1, w - 4), 22, C.orange);
      tx("FLIPPING...", VW / 2, 88, C.menuTxt, 4, "center");
      return;
    }

    tx(T.result.toUpperCase() + "!", VW / 2, 36, C.yellow, 8, "center");
    tx(T.won ? "YOU WIN THE TOSS" : "OPPONENT WINS", VW / 2, 52, C.white, 5, "center");

    if (T.phase === "choice") {
      drawList(["BAT FIRST", "BOWL FIRST"], T.sel, 66, 18);
      tx("HIT: confirm", VW / 2, VH - 8, C.menuDim, 4, "center");
    } else {
      tx("OPPONENT CHOSE TO " + (T.aiChoice === "bat" ? "BAT" : "BOWL"), VW / 2, 70, C.orange, 4, "center");
      tx("HIT: start", VW / 2, 86, C.yellow, 5, "center");
    }
  }

  function drawBreak() {
    var m = S.match, I = S.innings;
    menuBackdrop("INNINGS BREAK", null);

    tx("YOU", VW / 2 - 34, 36, C.menuTxt, 4, "center");
    tx("THEM", VW / 2 + 34, 36, C.menuTxt, 4, "center");
    tx(m.first.runs + "/" + m.first.wkts, VW / 2 - 34, 44, C.white, 8, "center");
    tx("-", VW / 2, 48, C.menuDim, 8, "center");

    if (I.batting === "player" && I.target) {
      tx("TARGET", VW / 2, 66, C.menuTxt, 4, "center");
      tx(String(I.target), VW / 2, 74, C.orange, 11, "center");
      tx("from " + (I.maxBalls / BPO) + " overs", VW / 2, 90, C.white, 4, "center");
    } else {
      tx("You need " + Math.max(0, I.target - I.runs), VW / 2, 72, C.orange, 6, "center");
    }

    tx("HIT: continue", VW / 2, VH - 8, C.yellow, 5, "center");
  }

  function drawScorecard(title, a, b) {
    menuBackdrop(title, null);
    var rows = [
      ["", "R", "W", "OV", "4s", "6s"],
      ["YOU", a.runs, a.wkts, (a.balls / BPO).toFixed(1), a.fours, a.sixes]
    ];
    if (b) rows.push(["THEM", b.runs, b.wkts, (b.balls / BPO).toFixed(1), b.fours, b.sixes]);

    var x0 = 10, y0 = 38, cw = 22;
    for (var r = 0; r < rows.length; r++) {
      for (var c = 0; c < rows[r].length; c++) {
        var col = r === 0 ? C.menuDim : (r === 1 ? C.white : C.orange);
        tx(String(rows[r][c]), x0 + c * cw, y0 + r * 12, col, r === 0 ? 3 : 5);
      }
    }
  }

  function drawResult() {
    var m = S.match, r = m.result;

    menuBackdrop(null, null);
    var isWin = r === "win", isTie = r === "tie";
    tx(isWin ? "VICTORY" : isTie ? "TIED" : "DEFEAT",
       VW / 2, 18, isWin ? C.menuTitle : isTie ? C.yellow : C.red, 11, "center");

    tx("YOU  " + m.playerScore.runs + "/" + m.playerScore.wkts,
       VW / 2, 40, C.white, 6, "center");
    if (m.oppScore) {
      tx("THEM " + m.oppScore.runs + "/" + m.oppScore.wkts,
         VW / 2, 50, C.menuTxt, 5, "center");
    }

    tx(m.margin || "", VW / 2, 64, C.yellow, 4, "center");

    if (m.bestNew) tx("NEW BEST!", VW / 2, 76, C.orange, 5, "center");
    else tx("BEST " + readBest(), VW / 2, 76, C.menuDim, 4, "center");

    tx("HIT: play again", VW / 2, 96, C.white, 4, "center");
    tx("P: menu", VW / 2, 104, C.menuDim, 3, "center");
  }

  function drawTourBracket() {
    var t = S.tour;
    menuBackdrop("TOURNAMENT", ["QUARTER-FINAL", "SEMI-FINAL", "FINAL"][t.round]);

    var p = t.player, o = t.opponents[t.round];
    fr(8, 40, 58, 34, p.kitA);
    fr(8, 40, 58, 4, p.kitB);
    tx(p.id, 37, 47, "#FFFFFF", 9, "center");
    tx(p.name, 37, 62, "#FFFFFF", 3, "center");

    tx("VS", VW / 2, 52, C.yellow, 5, "center");

    fr(84, 40, 58, 34, o.kitA);
    fr(84, 40, 58, 4, o.kitB);
    tx(o.id, 113, 47, "#FFFFFF", 9, "center");
    tx(o.name, 113, 62, "#FFFFFF", 3, "center");

    for (var i = 0; i < 3; i++) {
      var x = 16 + i * 42;
      var done = i < t.round, cur = i === t.round;
      fr(x, 82, 34, 14, done ? C.menuSel : cur ? C.menuSel : C.menuDim);
      tx(["QF", "SF", "FINAL"][i], x + 17, 86, done || cur ? C.menuSelTxt : C.menuTxt, 4, "center");
    }

    tx("HIT: play", VW / 2, VH - 8, C.yellow, 5, "center");
  }

  function drawTourEnd(kind) {
    menuBackdrop(null, null);
    if (kind === "win") {
      fr(58, 26, 34, 4, C.yellow);
      fr(63, 30, 24, 18, C.yellow);
      fr(52, 33, 9, 11, C.yellow);
      fr(89, 33, 9, 11, C.yellow);
      fr(60, 48, 30, 4, C.yellow);
      fr(66, 52, 18, 3, C.yellow);
      tx("CHAMPION", VW / 2, 62, C.menuTitle, 9, "center");
      tx(S.tour.player.name, VW / 2, 76, C.white, 5, "center");
      tx("HIT: play again", VW / 2, VH - 8, C.yellow, 4, "center");
    } else {
      tx("ELIMINATED", VW / 2, 34, C.red, 9, "center");
      tx(["QUARTER-FINAL", "SEMI-FINAL", "FINAL"][S.tour.round], VW / 2, 50, C.orange, 5, "center");
      tx("HIT: menu", VW / 2, VH - 8, C.menuDim, 4, "center");
    }
  }

  function drawPause() {
    fr(0, 0, VW, VH, "rgba(0,0,0,0.72)");
    tx("PAUSED", VW / 2, 34, C.white, 10, "center");
    drawList(["RESUME", "RESTART", "QUIT TO MENU"], S.pauseSel, 60, 16);
  }

  /* ── master draw ──────────────────────────────────────────────────────── */
  function draw() {
    octx.clearRect(0, 0, VW, VH);

    switch (S.screen) {
      case "menu":        drawMenu(); break;
      case "setup":       drawSetup(); break;
      case "help":        drawHelp(); break;
      case "settings":    drawSettings(); break;
      case "toss":        drawToss(); break;
      case "innings":     S.innings.batting === "player" ? drawBatView() : drawBowlView(); break;
      case "field":       drawField(); break;
      case "break":       drawBreak(); break;
      case "result":      drawResult(); break;
      case "tourBracket": drawTourBracket(); break;
      case "tourWin":     drawTourEnd("win"); break;
      case "tourElim":    drawTourEnd("elim"); break;
    }

    if (S.screen === "pause") { drawPause(); }
    if (S.screen === "pause") { /* overlay drawn over the frozen frame */ }

    if (S.flash > 0) {
      octx.fillStyle = "rgba(255,255,255," + Math.min(0.55, S.flash) + ")";
      octx.fillRect(0, 0, VW, VH);
    }

    if (S.settings.scan) {
      for (var y = 0; y < VH; y += 3) fr(0, y, VW, 1, C.scan);
    }

    if (!ctx) return;
    ctx.save();
    if (S.shake > 0.2) {
      ctx.translate(ri(5) - 2, ri(5) - 2);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(oc, 0, 0, VW, VH, 0, 0, cv.width, cv.height);
    ctx.restore();
  }

  /* ── match construction ───────────────────────────────────────────────── */
  function pickOpponents(playerIdx, n) {
    var pool = [];
    for (var i = 0; i < TEAMS.length; i++) if (i !== playerIdx) pool.push(TEAMS[i]);
    for (var j = pool.length - 1; j > 0; j--) {
      var k = ri(j + 1), tmp = pool[j]; pool[j] = pool[k]; pool[k] = tmp;
    }
    return pool.slice(0, n);
  }

  function startMatchFromSetup() {
    var mode = MODES[S.mode];
    var player = TEAMS[S.setup.team];
    var opps = pickOpponents(S.setup.team, S.mode === "tour" ? 3 : 1);

    S.diff = DIFFS[DIFF_KEYS[S.setup.diff]];

    S.match = {
      mode: S.mode,
      modeDef: mode,
      overs: mode.overs,
      wkts: mode.wkts,
      solo: mode.solo,
      noWkts: mode.noWkts,
      playerTeam: player,
      oppTeam: opps[0],
      innings: 1,
      first: null,
      second: null,
      playerScore: { runs: 0, wkts: 0, balls: 0, fours: 0, sixes: 0 },
      oppScore: null,
      target: 0,
      result: null,
      margin: "",
      bestNew: false
    };

    if (S.mode === "tour") {
      S.tour = { round: 0, player: player, opponents: opps };
      S.match.oppTeam = opps[0];
      S.match.tourRound = 0;
    } else {
      S.tour = null;
    }

    if (mode.solo) {
      beginInnings("player", 0);
      return;
    }
    openToss();
  }

  function openToss() {
    S.toss = { phase: "call", sel: 0, timer: 0, result: null, won: false, aiChoice: null };
    S.screen = "toss";
  }

  function resolveToss() {
    var T = S.toss;
    T.result = Math.random() < 0.5 ? "heads" : "tails";
    T.won = (T.sel === 0 ? "heads" : "tails") === T.result;
    if (!T.won) {
      T.aiChoice = Math.random() < 0.6 ? "bat" : "bowl";
      T.phase = "lost";
    } else {
      T.phase = "choice";
    }
  }

  function startAfterToss() {
    var T = S.toss;
    var choice = T.won ? (T.sel === 0 ? "bat" : "bowl") : T.aiChoice;
    if (choice === "bat") {
      beginInnings("player", 0);
    } else {
      beginInnings("ai", 0);
    }
  }

  /* ── innings ──────────────────────────────────────────────────────────── */
  function newInnings(batting, target) {
    var m = S.match;
    return {
      batting: batting,
      runs: 0, wkts: 0, balls: 0, fours: 0, sixes: 0, dots: 0,
      maxBalls: m.overs * BPO,
      maxWkts: m.wkts,
      target: target || 0,
      phase: "flight",
      t: 0,
      timPos: 0.2, timDir: 1,
      accPos: 0.05, accDir: 1,
      aim: 2, loft: false,
      line: 1, length: 1,
      deliveryLine: 1,
      shotFired: false, swingT: 0,
      bowlerPhase: 0,
      fielders: [],
      field: null,
      message: ""
    };
  }

  function pickFielders(n) {
    var idx = [0, 1, 2, 3, 4, 5];
    for (var i = idx.length - 1; i > 0; i--) {
      var j = ri(i + 1), t = idx[i]; idx[i] = idx[j]; idx[j] = t;
    }
    return idx.slice(0, n).sort(function (a, b) { return a - b; });
  }

  function beginInnings(batting, target) {
    var m = S.match;
    S.innings = newInnings(batting, target);
    S.innings.fielders = pickFielders(S.diff.fielders);
    S.screen = "innings";
    S.innings.phase = batting === "player" ? "flight" : "aim";
    nextBall(true);
  }

  function nextBall(first) {
    var I = S.innings, m = S.match;
    if (!I) return;

    if (!first) {
      if (I.balls >= I.maxBalls) return endInnings("overs");
      if (!m.noWkts && I.wkts >= I.maxWkts) return endInnings("all out");
      if (I.target && I.runs >= I.target) return endInnings("target");
    }

    I.t = 0;
    I.shotFired = false;
    I.swingT = 0;
    I.field = null;
    I.message = "";
    I.deliveryLine = [0, 1, 1, 1, 2][ri(5)];
    I.timPos = rf(0.15, 0.85);
    I.timDir = Math.random() < 0.5 ? 1 : -1;
    I.accPos = 0.05; I.accDir = 1;
    I.bowlerPhase = 0;
    I.phase = I.batting === "player" ? "flight" : "aim";
    S.screen = "innings";
  }

  function endInnings(why) {
    var I = S.innings, m = S.match;
    var summary = {
      runs: I.runs, wkts: I.wkts, balls: I.balls,
      fours: I.fours, sixes: I.sixes, why: why
    };

    if (m.innings === 1 && !m.solo) {
      m.first = summary;
      m.innings = 2;
      m.target = I.runs + 1;
      S.screen = "break";
      SFX.select();
      return;
    }

    if (m.solo) {
      m.playerScore = summary;
      finishSolo(summary);
      return;
    }

    m.second = summary;
    if (m.playerBattedFirst === undefined) {
      m.playerBattedFirst = (m.first === m.playerScore);
    }
    finishMatch(summary);
  }

  function finishSolo(sum) {
    var m = S.match;
    m.playerScore = sum;
    m.oppScore = null;

    var best = readBest();
    m.bestNew = sum.runs > best;
    if (m.bestNew) { writeBest(sum.runs); mirrorBest(sum.runs); }

    writeLast(sum.runs + "/" + sum.wkts);
    m.margin = "BEST " + readBest();
    m.result = "solo";
    S.screen = "result";
    SFX.select();
  }

  function finishMatch(second) {
    var m = S.match;
    var playerFirst = m.playerBattedFirst;
    var ps, os;

    if (playerFirst) {
      ps = m.first; os = second;
      m.playerScore = ps; m.oppScore = os;
      if (os.runs < m.target) {
        m.result = "win";
        m.margin = "WON BY " + (m.target - 1 - os.runs) + " RUNS";
      } else if (os.runs === m.target - 1) {
        m.result = "tie";
        m.margin = "SCORES LEVEL";
      } else {
        m.result = "lose";
        m.margin = "LOST BY " + (m.wkts - os.wkts) + " WICKETS";
      }
    } else {
      ps = second; os = m.first;
      m.playerScore = ps; m.oppScore = os;
      if (ps.runs >= m.target) {
        m.result = "win";
        m.margin = "WON BY " + (m.wkts - ps.wkts) + " WICKETS";
      } else if (ps.runs === m.target - 1) {
        m.result = "tie";
        m.margin = "SCORES LEVEL";
      } else {
        m.result = "lose";
        m.margin = "LOST BY " + (m.target - 1 - ps.runs) + " RUNS";
      }
    }

    var best = readBest();
    m.bestNew = ps.runs > best;
    if (m.bestNew) { writeBest(ps.runs); mirrorBest(ps.runs); }

    writeLast(ps.runs + "/" + ps.wkts + " v " + m.oppTeam.id);

    if (m.result === "win") SFX.win(); else if (m.result === "lose") SFX.lose();

    if (S.mode === "tour") {
      if (m.result === "win") {
        if (S.tour.round < 2) {
          S.tour.round++;
          S.match.tourRound = S.tour.round;
          S.match.oppTeam = S.tour.opponents[S.tour.round];
          S.screen = "tourBracket";
        } else {
          S.screen = "tourWin";
          SFX.win();
        }
      } else {
        S.screen = "tourElim";
      }
      return;
    }

    S.screen = "result";
  }

  /* ── batting resolution ───────────────────────────────────────────────── */
  function playerSwing() {
    var I = S.innings;
    if (!I || I.phase !== "flight" || I.shotFired) return;

    I.shotFired = true;
    I.swingT = 0.01;

    var d = Math.abs(I.timPos - 0.5);
    var w = S.diff.win;
    var timing = d <= w * 0.30 ? "perfect"
               : d <= w * 0.65 ? "good"
               : d <= w        ? "ok"
               : "miss";

    resolveBat(timing);
  }

  function resolveBat(timing) {
    var I = S.innings, m = S.match;
    var zone = I.aim;
    var fielderThere = I.fielders.indexOf(zone) >= 0;
    var loft = I.loft;
    var res;

    if (timing === "miss") {
      if (m.noWkts) {
        res = { runs: 0, label: "MISSED" };
      } else if (I.deliveryLine === 1 && Math.random() < 0.40) {
        res = { runs: 0, wicket: "BOWLED" };
      } else if (I.deliveryLine === 0 && Math.random() < 0.26) {
        res = { runs: 0, wicket: "LBW" };
      } else if (Math.random() < 0.09) {
        res = { runs: 0, wicket: "CAUGHT BEHIND" };
      } else {
        res = { runs: 0, label: "DOT BALL" };
      }
      SFX.miss();
    } else if (timing === "ok") {
      if (loft && fielderThere && !m.noWkts && Math.random() < 0.32) {
        res = { runs: 0, wicket: "CAUGHT" };
      } else {
        res = { runs: fielderThere ? 1 : 2, label: fielderThere ? "FIELDED" : "TWO RUNS" };
      }
      SFX.bat();
    } else if (timing === "good") {
      if (loft) {
        if (fielderThere && !m.noWkts && Math.random() < 0.28) {
          res = { runs: 0, wicket: "CAUGHT" };
        } else {
          res = { runs: fielderThere ? 2 : 4, label: fielderThere ? "TWO RUNS" : "FOUR!" };
        }
      } else {
        res = { runs: fielderThere ? 1 : (Math.random() < 0.5 ? 2 : 4),
                label: fielderThere ? "FIELDED" : (Math.random() < 0.5 ? "TWO RUNS" : "FOUR!") };
      }
      if (res.runs === 4) SFX.four(); else SFX.bat();
    } else {
      if (loft) {
        if (fielderThere && !m.noWkts && Math.random() < 0.16) {
          res = { runs: 0, wicket: "CAUGHT" };
        } else {
          res = { runs: 6, label: "SIX!" };
        }
      } else {
        res = { runs: fielderThere ? 2 : 4, label: fielderThere ? "TWO RUNS" : "FOUR!" };
      }
      if (res.runs === 6) SFX.six(); else SFX.four();
    }

    startField(res, zone, loft);
  }

  /* ── bowling resolution ───────────────────────────────────────────────── */
  function releaseBall() {
    var I = S.innings;
    var acc = 1 - Math.abs(I.accPos - 0.5) * 2;
    acc = clamp(acc, 0, 1);

    I.phase = "flight";
    I.t = 0;
    I.swingT = 0;
    I.pendingBowl = acc;
    SFX.bowl();
  }

  function resolveBowl() {
    var I = S.innings, m = S.match;
    var acc = I.pendingBowl || 0.4;
    var lenScore = [0.55, 1.00, 0.78, 0.92][I.length];
    var q = clamp(acc * 0.70 + lenScore * 0.30, 0, 1);
    var skill = S.diff.skill;

    var aggr = 1;
    if (I.target) {
      var need = I.target - I.runs;
      var left = I.maxBalls - I.balls;
      if (need > 0 && left > 0) aggr = clamp((need / left) / 1.3, 0.85, 1.9);
    }

    var wicketP = (0.06 + q * 0.30) * (1 - skill * 0.30) * (0.85 + aggr * 0.22);
    var boundP  = (0.30 - q * 0.16) * (0.60 + skill * 0.70) * aggr;

    var r = Math.random();
    var res, zone;

    if (r < wicketP && !m.noWkts) {
      var kinds = ["BOWLED", "CAUGHT", "LBW", "STUMPED"];
      res = { runs: 0, wicket: pick(kinds) };
      zone = res.wicket === "CAUGHT" ? I.fielders[ri(Math.max(1, I.fielders.length))] : 2;
      SFX.out();
    } else if (r < wicketP + boundP) {
      var six = Math.random() < 0.30;
      res = { runs: six ? 6 : 4, label: six ? "SIX!" : "FOUR!" };
      zone = [0, 2, 3, 4, 5][ri(5)];
      if (six) SFX.six(); else SFX.four();
    } else {
      var rr = Math.random();
      var runs = rr < 0.42 ? 0 : rr < 0.82 ? 1 : 2;
      res = { runs: runs, label: runs === 0 ? "DOT BALL" : runs === 1 ? "SINGLE" : "TWO RUNS" };
      zone = [1, 2, 4][ri(3)];
      SFX.bat();
    }

    startField(res, zone, false);
  }

  /* ── shared field animation ───────────────────────────────────────────── */
  function startField(res, zone, loft) {
    var I = S.innings;
    I.phase = "field";
    I.t = 0;
    I.field = {
      res: res, zone: zone, loft: !!loft,
      t: 0,
      dur: res.runs === 6 ? 1.35 : res.wicket ? 1.25 : 1.0,
      applied: false
    };
    I.message = res.wicket || res.label || "";
    S.screen = "field";

    if (res.wicket) { S.shake = 3; }
    else if (res.runs >= 4) { S.flash = 0.35; }
  }

  function applyBall() {
    var I = S.innings, m = S.match, f = I.field;
    if (!f || f.applied) return;
    f.applied = true;

    I.balls++;
    I.runs += f.res.runs;
    if (f.res.runs === 4) I.fours++;
    if (f.res.runs === 6) I.sixes++;
    if (f.res.runs === 0 && !f.res.wicket) I.dots++;
    if (f.res.wicket) I.wkts++;

    /* live DOM mirror */
    if (I.batting === "player") {
      var el = document.getElementById("ck-score-disp");
      if (el) el.textContent = I.runs + "/" + I.wkts;
    }
  }

  /* ── update loop ──────────────────────────────────────────────────────── */
  function update(dt) {
    S.time += dt;
    if (S.flash > 0) S.flash = Math.max(0, S.flash - dt * 1.6);
    if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 14);

    if (S.screen === "toss" && S.toss && S.toss.phase === "flip") {
      S.toss.timer += dt;
      if (S.toss.timer > 1.15 && !S.toss.resolved) {
        S.toss.resolved = true;
        resolveToss();
      }
    }

    if (S.screen === "innings" || S.screen === "field") updateBall(dt);
  }

  function updateBall(dt) {
    var I = S.innings, m = S.match;
    if (!I) return;

    I.t += dt;
    if (I.swingT > 0) I.swingT = Math.min(1, I.swingT + dt * 5);

    if (S.screen === "field") {
      var f = I.field;
      if (!f) return;
      f.t += dt;
      if (f.t >= f.dur) {
        applyBall();
        if (f.t >= f.dur + 0.55) {
          S.screen = "innings";
          nextBall(false);
        }
      }
      return;
    }

    if (I.phase === "flight") {
      I.bowlerPhase = clamp(I.t / 0.5, 0, 1);

      if (I.batting === "player") {
        var sp = S.diff.bar * (S.settings.assist ? 0.82 : 1);
        I.timPos += I.timDir * dt * sp;
        if (I.timPos >= 1) { I.timPos = 1; I.timDir = -1; }
        if (I.timPos <= 0) { I.timPos = 0; I.timDir = 1; }

        if (I.t >= 0.95 && !I.shotFired) {
          I.shotFired = true;
          I.swingT = 0.01;
          resolveBat("miss");
        }
      } else {
        /* you are bowling: AI swings at the contact point */
        if (I.t > 0.62 && I.swingT === 0) I.swingT = 0.01;
        if (I.t >= 0.86) {
          I.phase = "done";
          resolveBowl();
        }
      }
    }

    if (I.phase === "aim" || I.phase === "release") {
      I.bowlerPhase = 0.55;
    }

    if (I.phase === "release") {
      I.accPos += I.accDir * dt * 2.4;
      if (I.accPos >= 1) { I.accPos = 1; I.accDir = -1; }
      if (I.accPos <= 0) { I.accPos = 0; I.accDir = 1; }
    }
  }

  /* ── input routing ────────────────────────────────────────────────────── */
  function press(a) {
    if (a === "mute") { toggleSound(); return; }

    if (S.screen === "pause") { pausePress(a); return; }

    if (a === "pause") {
      if (S.screen === "innings" || S.screen === "field" || S.screen === "break") {
        S.screen = "pause"; S.pauseSel = 0; SFX.menu();
      }
      return;
    }

    switch (S.screen) {
      case "menu":
        if (a === "up") { S.menuSel = (S.menuSel + 6) % 7; SFX.menu(); }
        if (a === "down") { S.menuSel = (S.menuSel + 1) % 7; SFX.menu(); }
        if (a === "hit") menuChoose();
        break;

      case "setup":
        setupPress(a);
        break;

      case "help":
        if (a === "hit" || a === "pause") { S.screen = "menu"; SFX.menu(); }
        break;

      case "settings":
        if (a === "up") { S.menuSel = (S.menuSel + 4) % 5; SFX.menu(); }
        if (a === "down") { S.menuSel = (S.menuSel + 1) % 5; SFX.menu(); }
        if (a === "hit") settingsToggle();
        if (a === "pause") { S.screen = "menu"; SFX.menu(); }
        break;

      case "toss":
        tossPress(a);
        break;

      case "innings":
        inningsPress(a);
        break;

      case "field":
        if (a === "hit") {
          var f = S.innings.field;
          if (f) { f.t = f.dur; }
        }
        break;

      case "break":
        if (a === "hit") {
          beginInnings(S.innings.batting === "player" ? "ai" : "player", S.match.target);
        }
        break;

      case "result":
        if (a === "hit") { S.screen = "setup"; SFX.menu(); }
        break;

      case "tourBracket":
        if (a === "hit") { S.match.oppTeam = S.tour.opponents[S.tour.round]; openToss(); }
        break;

      case "tourWin":
      case "tourElim":
        if (a === "hit") { S.screen = "menu"; S.tour = null; SFX.menu(); }
        break;
    }
  }

  function menuChoose() {
    SFX.select();
    switch (S.menuSel) {
      case 0: S.mode = "quick";    S.screen = "setup"; S.setup.row = 0; break;
      case 1: S.mode = "tour";     S.screen = "setup"; S.setup.row = 0; break;
      case 2: S.mode = "super";    S.screen = "setup"; S.setup.row = 0; break;
      case 3: S.mode = "endless";  S.screen = "setup"; S.setup.row = 0; break;
      case 4: S.mode = "practice"; S.screen = "setup"; S.setup.row = 0; break;
      case 5: S.screen = "help"; break;
      case 6: S.screen = "settings"; S.menuSel = 0; break;
    }
  }

  function setupPress(a) {
    if (a === "up" || a === "down") { S.setup.row = 1 - S.setup.row; SFX.menu(); }
    if (a === "left" || a === "right") {
      var d = a === "right" ? 1 : -1;
      if (S.setup.row === 0) S.setup.team = (S.setup.team + d + TEAMS.length) % TEAMS.length;
      else S.setup.diff = (S.setup.diff + d + DIFF_KEYS.length) % DIFF_KEYS.length;
      SFX.tick();
    }
    if (a === "hit") { SFX.select(); startMatchFromSetup(); }
    if (a === "pause") { S.screen = "menu"; SFX.menu(); }
  }

  function settingsToggle() {
    var s = S.settings;
    SFX.select();
    if (S.menuSel === 0) { s.sound = !s.sound; }
    else if (S.menuSel === 1) {
      var order = ["color", "lcd", "amber"];
      s.palette = order[(order.indexOf(s.palette) + 1) % order.length];
      applyPalette();
    }
    else if (S.menuSel === 2) { s.scan = !s.scan; }
    else if (S.menuSel === 3) { s.assist = !s.assist; }
    else if (S.menuSel === 4) { S.screen = "menu"; S.menuSel = 6; }

    saveSettings();
    updateSoundButton();
  }

  function tossPress(a) {
    var T = S.toss;

    if (T.phase === "call") {
      if (a === "left" || a === "right") { T.sel = 1 - T.sel; SFX.tick(); }
      if (a === "hit") { T.phase = "flip"; T.timer = 0; SFX.select(); }
      return;
    }

    if (T.phase === "choice") {
      if (a === "left" || a === "right" || a === "up" || a === "down") { T.sel = 1 - T.sel; SFX.tick(); }
      if (a === "hit") { startAfterToss(); }
      return;
    }

    if (T.phase === "lost" && a === "hit") { startAfterToss(); }
  }

  function inningsPress(a) {
    var I = S.innings;
    if (!I) return;

    if (I.batting === "player") {
      if (I.phase !== "flight") return;
      if (a === "left")  { I.aim = (I.aim + 5) % 6; SFX.tick(); }
      if (a === "right") { I.aim = (I.aim + 1) % 6; SFX.tick(); }
      if (a === "up")    { I.loft = true;  SFX.tick(); }
      if (a === "down")  { I.loft = false; SFX.tick(); }
      if (a === "hit")   { playerSwing(); }
      return;
    }

    /* bowling */
    if (I.phase === "aim") {
      if (a === "left")  { I.line = (I.line + 2) % 3; SFX.tick(); }
      if (a === "right") { I.line = (I.line + 1) % 3; SFX.tick(); }
      if (a === "up")    { I.length = (I.length + 1) % 4; SFX.tick(); }
      if (a === "down")  { I.length = (I.length + 3) % 4; SFX.tick(); }
      if (a === "hit")   { I.phase = "release"; I.accPos = 0.05; I.accDir = 1; SFX.tick(); }
      return;
    }
    if (I.phase === "release" && a === "hit") { releaseBall(); }
  }

  function pausePress(a) {
    if (a === "up")   { S.pauseSel = (S.pauseSel + 2) % 3; SFX.menu(); }
    if (a === "down") { S.pauseSel = (S.pauseSel + 1) % 3; SFX.menu(); }
    if (a === "pause") { S.screen = S.innings ? "innings" : "menu"; return; }
    if (a === "hit") {
      SFX.select();
      if (S.pauseSel === 0) { S.screen = "innings"; }
      else if (S.pauseSel === 1) { S.screen = "setup"; }
      else { S.screen = "menu"; }
    }
  }

  function toggleSound() {
    S.settings.sound = !S.settings.sound;
    saveSettings();
    updateSoundButton();
    SFX.tick();
  }

  function updateSoundButton() {
    var b = document.getElementById("ck-sound");
    if (!b) return;
    b.textContent = S.settings.sound ? "🔊 Sound on" : "🔇 Sound off";
    b.setAttribute("aria-pressed", S.settings.sound ? "false" : "true");
  }

  /* ── bindings ─────────────────────────────────────────────────────────── */
  var KEYMAP = {
    ArrowLeft: "left", KeyA: "left",
    ArrowRight: "right", KeyD: "right",
    ArrowUp: "up", KeyW: "up",
    ArrowDown: "down", KeyS: "down",
    Space: "hit", Enter: "hit",
    KeyP: "pause", Escape: "pause",
    KeyM: "mute",
    KeyR: "restart"
  };

  var held = {};

  function bindInput() {
    document.addEventListener("keydown", function (e) {
      var act = KEYMAP[e.code];
      if (!act) return;
      if (e.code === "Space" || e.code.indexOf("Arrow") === 0) e.preventDefault();
      if (held[e.code]) return;
      held[e.code] = true;
      if (act === "restart") { if (S.screen === "pause") { S.screen = "setup"; } return; }
      press(act);
    }, { passive: false });

    document.addEventListener("keyup", function (e) { held[e.code] = false; });

    function tap(el, act) {
      if (!el) return;
      var fire = function (ev) { ev.preventDefault(); press(act); };
      el.addEventListener("pointerdown", fire);
      el.addEventListener("click", function (ev) { ev.preventDefault(); });
    }

    tap(document.getElementById("ck-left"),  "left");
    tap(document.getElementById("ck-right"), "right");
    tap(document.getElementById("ck-up"),    "up");
    tap(document.getElementById("ck-down"),  "down");
    tap(document.getElementById("ck-hit"),   "hit");

    var pauseBtn = document.getElementById("ck-pause");
    if (pauseBtn) tap(pauseBtn, "pause");

    var soundBtn = document.getElementById("ck-sound");
    if (soundBtn) tap(soundBtn, "mute");

    if (cv) {
      cv.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        if (S.screen === "innings" || S.screen === "field" || S.screen === "menu" ||
            S.screen === "setup" || S.screen === "toss") press("hit");
      });
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden && (S.screen === "innings" || S.screen === "field")) {
        S.screen = "pause"; S.pauseSel = 0;
      }
    });
  }

  /* ── boot ─────────────────────────────────────────────────────────────── */
  function boot() {
    applyPalette();
    updateSoundButton();
    mirrorBest(readBest());
    bindInput();

    var last = 0;
    function frame(t) {
      if (!last) last = t;
      var dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      update(dt);
      draw();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  /* exposed for cricket-init.js and debugging */
  window.CNKCricket = {
    state: S,
    toggleSound: toggleSound
  };
})();

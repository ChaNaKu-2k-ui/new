/* Cricket Cup — Nokia LCD style, two-innings game. */
(function () {
  "use strict";

  /* ---- canvas size ---- */
  var W = 272, H = 272;

  /* ---- Nokia green palette ---- */
  var C = {
    bg:    "#8BC34A",   /* screen background */
    dark:  "#1C3008",   /* darkest — outlines, figures, text */
    mid:   "#3D6B18",   /* mid green — ground fill */
    scbg:  "#0F1E06",   /* scoreboard bg */
    sctxt: "#7BC33A",   /* scoreboard text */
    light: "#A8D44E",   /* lighter — pitch, highlights */
    white: "#D4F07A",   /* near-white — zone, stumps */
  };

  /* ---- ground perspective anchors ---- */
  var GBL = { x: 8,    y: H - 30 };
  var GBR = { x: W - 8, y: H - 30 };
  var GTL = { x: 60,   y: 72 };
  var GTR = { x: W - 60, y: 72 };
  var PBL = { x: W/2 - 18, y: H - 30 };
  var PBR = { x: W/2 + 18, y: H - 30 };
  var PTL = { x: W/2 - 10, y: 72 };
  var PTR = { x: W/2 + 10, y: 72 };

  /* ---- settings / persistence ---- */
  var SETTINGS_KEY = "cnk-cricket-s";
  var BEST_KEY     = "cnk-cricket-best";
  var SPEED_MAP    = { slow: 0.008, normal: 0.013, fast: 0.019 };
  var settings = CNKGame.load(SETTINGS_KEY, { speed: "normal", sound: true });
  var best = 0;
  try { best = parseInt(localStorage.getItem(BEST_KEY)) || 0; } catch (e) {}
  function saveBest(v) { try { localStorage.setItem(BEST_KEY, v); } catch (e) {} }

  /* ---- DOM ---- */
  var $ = function (id) { return document.getElementById(id); };
  var $all = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var canvas = $("board");
  var ctx    = canvas.getContext("2d");
  var panel  = $("game");
  var settingsBtn = $("settings-toggle");
  var settingsBox = $("settings");
  var soundBtn    = $("sound");
  var fsBtn       = $("fullscreen");

  /* ---- game state ---- */
  /* States: MENU | BATTING | SHOT | BOWLING | INNINGS | RESULT */
  var S;
  var menuSel;    /* 0-2 for menu items */
  var overs;      /* selected overs (5/10/20) */

  /* player batting */
  var pScore, pWkt, pBalls;
  var curOver, curBall;
  /* cpu batting */
  var cScore, cWkt, cBalls;
  var target;

  /* ball approach */
  var ballProgress; /* 0..1 */
  var ballApproach;
  var shotDir;      /* -1, 0, 1 */
  var lastMsg;

  /* shot animation */
  var arcProgress;
  var arcType;   /* 0=miss 1=dot 2=single 3=boundary 4=six */
  var arcDir;    /* -1 or 1 */
  var runProgress;
  var showResult;
  var resultMsg;

  /* cpu bowling anim */
  var bowlTimer;
  var cpuDelay;

  /* ---- helpers ---- */
  function lerp(a, b, t) { return a + (b - a) * t; }

  function getBallPos(progress) {
    return {
      x: lerp(W/2 + shotDir * 5, W/2, 1 - progress),
      y: lerp(82, H - 52, progress)
    };
  }

  function resetAll() {
    pScore = 0; pWkt = 0; pBalls = 0;
    cScore = 0; cWkt = 0; cBalls = 0;
    curOver = 0; curBall = 0;
    target = 0; lastMsg = "";
    ballApproach = false; ballProgress = 0;
    arcProgress = 0; arcType = 0; arcDir = 1;
    runProgress = 0; showResult = false; resultMsg = "";
    bowlTimer = 0; shotDir = 0;
  }

  function advBall() {
    pBalls++;
    curBall++;
    if (curBall >= 6) { curBall = 0; curOver++; }
  }

  function checkInningsEnd() {
    if (curOver >= overs || pWkt >= TOTAL_WICKETS) {
      target = pScore + 1;
      var self = this;
      setTimeout(function () { S = "INNINGS"; }, 1800);
      return true;
    }
    return false;
  }
  var TOTAL_WICKETS = 10;

  function startDelivery() {
    ballApproach = true;
    ballProgress = 0;
    shotDir = 0;
    lastMsg = "";
    S = "BATTING";
  }

  /* ---- shot logic ---- */
  function doHit() {
    if (S !== "BATTING" || !ballApproach) return;
    var p = ballProgress;
    ballApproach = false;
    var z1 = 0.60, z2 = 0.82;
    var inZone = p >= z1 && p <= z2;
    var rand = Math.random();
    var runs = 0, wkt = false;

    if (p < 0.25) {
      wkt = rand < 0.65;
    } else if (p < 0.5) {
      wkt = rand < 0.28;
      if (!wkt) { runs = rand < 0.55 ? 0 : 1; }
    } else if (inZone) {
      if      (rand < 0.05) { runs = 0; }
      else if (rand < 0.22) { runs = 6; }
      else if (rand < 0.52) { runs = 4; }
      else if (rand < 0.72) { runs = 2; }
      else                  { runs = 1; }
    } else if (p > z2) {
      wkt = rand < 0.32;
      if (!wkt) { runs = rand < 0.62 ? 0 : 1; }
    } else {
      if      (rand < 0.12) { wkt = true; }
      else if (rand < 0.38) { runs = 4; }
      else if (rand < 0.65) { runs = 2; }
      else                  { runs = 1; }
    }

    arcDir = shotDir !== 0 ? shotDir : (Math.random() < 0.5 ? 1 : -1);
    arcType = wkt ? 0 : (runs === 0 ? 1 : (runs <= 2 ? 2 : (runs === 4 ? 3 : 4)));

    if (wkt) {
      pWkt++;
      lastMsg = "OUT!"; resultMsg = "OUT!";
      CNKGame.beep(settings.sound, 180, 300, "sawtooth");
    } else {
      pScore += runs;
      lastMsg = runs === 6 ? "SIX!" : runs === 4 ? "FOUR!" : runs === 0 ? "DOT" : runs + " RUN" + (runs !== 1 ? "S" : "");
      resultMsg = lastMsg;
      if (runs >= 4) CNKGame.beep(settings.sound, runs === 6 ? 900 : 740, 200, "square");
      else if (runs > 0) CNKGame.beep(settings.sound, 580, 100, "square");
      else CNKGame.beep(settings.sound, 280, 80, "square");
    }
    if (pScore > best) { best = pScore; saveBest(best); }

    advBall();
    arcProgress = 0; runProgress = 0; showResult = false;
    S = "SHOT";
    checkInningsEnd();
  }

  /* ---- CPU bowling ---- */
  function doCpuBall() {
    if (S !== "BOWLING") return;
    var rand = Math.random();
    var runs = 0, wkt = false;
    /* CPU is slightly weaker than player potential */
    if      (rand < 0.18) { wkt = true; }
    else if (rand < 0.30) { runs = 6; }
    else if (rand < 0.50) { runs = 4; }
    else if (rand < 0.65) { runs = 2; }
    else if (rand < 0.82) { runs = 1; }

    if (wkt) {
      cWkt++;
      lastMsg = "WICKET!";
      CNKGame.beep(settings.sound, 200, 200, "sawtooth");
    } else {
      cScore += runs;
      lastMsg = runs === 6 ? "SIX!" : runs === 4 ? "FOUR!" : runs === 0 ? "DOT" : "" + runs;
      if (runs > 0) CNKGame.beep(settings.sound, 480, 80, "square");
    }

    cBalls++;
    bowlTimer = 0;
    curBall++;
    if (curBall >= 6) { curBall = 0; curOver++; }

    /* check end */
    var done = curOver >= overs || cWkt >= TOTAL_WICKETS || cScore >= target;
    if (done) {
      setTimeout(function () { S = "RESULT"; }, 1500);
    } else {
      cpuDelay = 1200 + Math.random() * 600;
    }
  }

  /* ---- menu key handler ---- */
  function handleKey(k) {
    CNKGame.unlockAudio();

    if (S === "MENU") {
      if (k === "U") menuSel = (menuSel + 2) % 3;
      if (k === "D") menuSel = (menuSel + 1) % 3;
      if (k === "H" || k === "N") {
        var ovrMap = [5, 10, 20];
        overs = ovrMap[menuSel];
        resetAll();
        S = "BATTING";
        setTimeout(startDelivery, 500);
      }
      return;
    }

    if (S === "INNINGS") {
      if (k === "H" || k === "N") {
        /* start CPU innings */
        curOver = 0; curBall = 0; lastMsg = "";
        bowlTimer = 0; cpuDelay = 1200;
        S = "BOWLING";
      }
      return;
    }

    if (S === "RESULT") {
      resetAll();
      menuSel = 0;
      S = "MENU";
      return;
    }

    if (k === "M") {
      resetAll();
      menuSel = 0;
      S = "MENU";
      return;
    }

    if (S === "BATTING") {
      if (k === "L") shotDir = -1;
      if (k === "R") shotDir =  1;
      if (k === "H" || k === "N") doHit();
    }
  }

  /* ---- settings panel ---- */
  function applySettings() {
    $all("[data-speed]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-speed") === settings.speed));
    });
    soundBtn.textContent = settings.sound ? "On" : "Off";
    soundBtn.setAttribute("aria-pressed", String(settings.sound));
  }
  function openSettings(open) {
    settingsBox.hidden = !open;
    settingsBtn.setAttribute("aria-expanded", String(open));
    settingsBtn.textContent = open ? "Close settings" : "Settings";
  }

  $all("[data-speed]").forEach(function (b) {
    b.addEventListener("click", function () {
      settings.speed = b.getAttribute("data-speed");
      CNKGame.save(SETTINGS_KEY, settings);
      applySettings();
    });
  });
  soundBtn.addEventListener("click", function () {
    settings.sound = !settings.sound;
    CNKGame.save(SETTINGS_KEY, settings);
    applySettings();
    if (settings.sound) CNKGame.beep(true, 660, 80, "square");
  });
  settingsBtn.addEventListener("click", function () { openSettings(settingsBox.hidden); });
  $("restart").addEventListener("click", function () { resetAll(); menuSel = 0; S = "MENU"; });

  /* keypad buttons */
  $all(".ckt-key").forEach(function (el) {
    el.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      el.classList.add("pressed");
      handleKey(el.dataset.k);
    });
    el.addEventListener("pointerup",    function () { el.classList.remove("pressed"); });
    el.addEventListener("pointerleave", function () { el.classList.remove("pressed"); });
  });

  /* keyboard */
  window.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var map = {
      ArrowLeft: "L", ArrowRight: "R", ArrowUp: "U", ArrowDown: "D",
      " ": "H", Enter: "H", z: "H", x: "N",
      Escape: "M", m: "M", r: "M"
    };
    if (map[e.key]) {
      if (e.target && e.target.closest && e.target.closest("button, a, input, select")) return;
      e.preventDefault();
      handleKey(map[e.key]);
    }
  });

  /* canvas tap */
  canvas.addEventListener("click", function () { handleKey("H"); });
  canvas.addEventListener("touchstart", function (e) { e.preventDefault(); handleKey("H"); }, { passive: false });

  CNKGame.fullscreen(panel, fsBtn);

  /* ================================================================
     DRAWING
  ================================================================ */

  function setupCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---- shared draw helpers ---- */
  function drawStumps(x, y, h) {
    ctx.strokeStyle = C.dark;
    ctx.lineWidth = 1.5;
    for (var i = -1; i <= 1; i++) {
      var sx = x + i * h * 0.85;
      ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx, y - h); ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x - h * 0.85, y - h);
    ctx.lineTo(x + h * 0.85, y - h);
    ctx.stroke();
  }

  function drawBatsman(x, y, sc) {
    sc = sc || 1;
    ctx.fillStyle = C.dark;
    ctx.fillRect(x - 3*sc, y - 16*sc, 6*sc, 10*sc); /* body */
    ctx.fillRect(x - 3*sc, y - 24*sc, 6*sc,  7*sc); /* head+helmet */
    ctx.fillRect(x + 2*sc, y - 24*sc, 4*sc,  3*sc); /* peak */
    ctx.fillRect(x - 4*sc, y -  6*sc, 3*sc,  7*sc); /* leg L */
    ctx.fillRect(x + 1*sc, y -  6*sc, 3*sc,  7*sc); /* leg R */
    ctx.save();
    ctx.translate(x + 4*sc, y - 10*sc);
    ctx.rotate(-0.5);
    ctx.fillRect(0, 0, 10*sc, 2.5*sc); /* bat */
    ctx.restore();
  }

  function drawBowler(x, y) {
    ctx.fillStyle = C.dark;
    ctx.fillRect(x - 3, y - 12, 6, 8);  /* body */
    ctx.fillRect(x - 2, y - 18, 5, 5);  /* head */
    ctx.fillRect(x - 3, y -  4, 2, 5);  /* leg L */
    ctx.fillRect(x + 1, y -  4, 2, 5);  /* leg R */
  }

  function drawFielder(x, y) {
    ctx.fillStyle = C.dark;
    ctx.fillRect(x - 2, y - 8, 4, 6);
    ctx.fillRect(x - 2, y - 12, 4, 4);
  }

  function drawBall(x, y, r) {
    ctx.fillStyle = C.dark;
    ctx.beginPath(); ctx.arc(x, y, r || 3, 0, Math.PI * 2); ctx.fill();
  }

  /* ---- scoreboard (top-left bar) ---- */
  function drawScoreboard(score, wkt, over, ball) {
    ctx.fillStyle = C.scbg;
    ctx.fillRect(0, 0, 90, 52);
    ctx.strokeStyle = C.dark;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 90, 52);
    /* icons row */
    ctx.fillStyle = C.sctxt;
    for (var i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.arc(8 + i * 10, 8, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.scbg;
      ctx.beginPath(); ctx.arc(8 + i * 10, 8, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.sctxt;
    }
    for (var j = 0; j < 3; j++) {
      ctx.fillRect(50 + j * 12, 5, 8, 2);
    }
    /* score */
    ctx.font = "bold 17px monospace";
    ctx.fillText(score + "/" + wkt, 6, 33);
    /* over */
    ctx.font = "bold 12px monospace";
    ctx.fillText(over + "·" + ball, 6, 48);
    /* separator */
    ctx.fillStyle = C.mid;
    ctx.fillRect(0, 52, 90, 1);
  }

  /* last event bubble top-right */
  function drawLastMsg() {
    if (!lastMsg) return;
    ctx.font = "bold 10px monospace";
    var tw = ctx.measureText(lastMsg).width + 8;
    ctx.fillStyle = C.dark;
    ctx.fillRect(W - tw - 2, 2, tw, 18);
    ctx.fillStyle = C.bg;
    ctx.fillText(lastMsg, W - tw + 2, 15);
  }

  /* ---- MENU screen ---- */
  function drawMenu() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    /* title bar */
    ctx.fillStyle = C.scbg;
    ctx.fillRect(0, 0, W, 38);
    ctx.fillStyle = C.sctxt;
    ctx.font = "bold 19px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Cricket Cup", 16, 26);
    ctx.font = "14px monospace";
    ctx.textAlign = "right";
    ctx.fillText("1", W - 14, 26);

    /* stumps + bat illustration */
    drawStumps(W/2, 104, 18);
    ctx.save();
    ctx.translate(W/2 - 12, 98);
    ctx.rotate(-0.75);
    ctx.fillStyle = C.dark;
    ctx.fillRect(0, 0, 44, 9);
    ctx.restore();
    drawBall(W/2 + 52, 78, 7);

    /* nav arrows */
    ctx.fillStyle = C.dark;
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";
    ctx.fillText("◄", 18, 112);
    ctx.textAlign = "right";
    ctx.fillText("►", W - 18, 112);

    /* menu items */
    var items = ["5 overs", "10 overs", "20 overs"];
    for (var i = 0; i < 3; i++) {
      if (i === menuSel) {
        ctx.fillStyle = C.dark;
        ctx.fillRect(4, 126 + i * 28 - 18, W - 8, 24);
        ctx.fillStyle = C.bg;
      } else {
        ctx.fillStyle = C.dark;
      }
      ctx.font = (i === menuSel ? "bold " : "") + "16px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(items[i], 14, 126 + i * 28);
    }

    /* bottom bar */
    ctx.fillStyle = C.scbg;
    ctx.fillRect(0, H - 28, W, 28);
    ctx.fillStyle = C.sctxt;
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Select", 18, H - 10);
    ctx.textAlign = "right";
    ctx.fillText("Best: " + best, W - 14, H - 10);
    ctx.textAlign = "left";
  }

  /* ---- BATTING main field ---- */
  function drawField() {
    /* ground trapezoid */
    ctx.fillStyle = C.mid;
    ctx.beginPath();
    ctx.moveTo(GBL.x, GBL.y); ctx.lineTo(GBR.x, GBR.y);
    ctx.lineTo(GTR.x, GTR.y); ctx.lineTo(GTL.x, GTL.y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.dark; ctx.lineWidth = 2; ctx.stroke();

    /* pitch strip */
    ctx.fillStyle = C.light;
    ctx.beginPath();
    ctx.moveTo(PBL.x, PBL.y); ctx.lineTo(PBR.x, PBR.y);
    ctx.lineTo(PTR.x, PTR.y); ctx.lineTo(PTL.x, PTL.y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.mid; ctx.lineWidth = 1; ctx.stroke();

    /* crease lines */
    ctx.strokeStyle = C.dark; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PBL.x - 6, H - 44); ctx.lineTo(PBR.x + 6, H - 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PTL.x - 4,       86); ctx.lineTo(PTR.x + 4,       86); ctx.stroke();

    drawStumps(W/2, H - 44, 6);   /* batting end */
    drawStumps(W/2,       82, 3.5); /* bowling end */
  }

  function drawBattingScreen() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    drawField();

    /* fielders */
    var fp = [
      { x: GTL.x + 18, y: GTL.y + 22 },
      { x: GTR.x - 18, y: GTR.y + 22 },
      { x: GBL.x + 28, y: GBL.y - 16 },
      { x: GBR.x - 28, y: GBR.y - 16 },
      { x: W/2 - 58,   y: H / 2 },
      { x: W/2 + 58,   y: H / 2 },
    ];
    fp.forEach(function (f) { drawFielder(f.x, f.y); });

    drawBowler(W/2, 96);

    /* ball */
    if (ballApproach && ballProgress < 1) {
      var bp = getBallPos(ballProgress);
      drawBall(bp.x, bp.y, lerp(2, 3.5, ballProgress));
    }

    drawBatsman(W/2, H - 38);
    drawScoreboard(pScore, pWkt, curOver, curBall);
    drawLastMsg();

    /* timing bar */
    if (ballApproach) {
      var bx = 6, by = H - 18, bw = W - 12, bh = 10;
      ctx.fillStyle = C.mid;
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = C.dark; ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);
      /* progress fill */
      ctx.fillStyle = C.dark;
      ctx.fillRect(bx + 1, by + 1, (bw - 2) * ballProgress, bh - 2);
      /* sweet zone */
      var z1 = 0.60, z2 = 0.82;
      ctx.fillStyle = C.white;
      ctx.fillRect(bx + 1 + (bw - 2) * z1, by + 1, (bw - 2) * (z2 - z1), bh - 2);
      /* cursor */
      ctx.fillStyle = C.light;
      ctx.fillRect(bx + bw * ballProgress - 1, by, 3, bh);
    }
  }

  /* ---- SHOT split-screen view ---- */
  function drawShotView() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    drawScoreboard(pScore, pWkt, curOver, curBall);

    /* divider */
    ctx.strokeStyle = C.dark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W/2, 54); ctx.lineTo(W/2, H - 10); ctx.stroke();

    /* === LEFT: top-down arc view === */
    var lx = 4, ly = 56, lw = W/2 - 8, lh = H - 64;

    ctx.strokeStyle = C.dark; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(lx + lw/2, ly + lh/2, lw/2 - 4, lh/2 - 2, 0, 0, Math.PI * 2);
    ctx.stroke();

    /* pitch center line */
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lx + lw/2, ly + 10);
    ctx.lineTo(lx + lw/2, ly + lh - 10);
    ctx.stroke();

    /* stumps top/bottom of pitch */
    for (var i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(lx + lw/2 + i*4, ly + 12);   ctx.lineTo(lx + lw/2 + i*4, ly + 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx + lw/2 + i*4, ly + lh-18); ctx.lineTo(lx + lw/2 + i*4, ly + lh-12); ctx.stroke();
    }

    /* batsman dot */
    var batX = lx + lw/2, batY = ly + lh - 20;
    ctx.fillStyle = C.dark;
    ctx.fillRect(batX - 3, batY - 12, 6, 8);
    ctx.fillRect(batX - 3, batY - 18, 5, 5);

    /* arc */
    if (arcType > 0 && arcProgress > 0) {
      var arcStartX = batX, arcStartY = batY - 8;
      var arcLen   = (lw/2 - 10) * Math.min(arcProgress, 1);
      var arcEndX  = batX + arcDir * arcLen;
      var arcH     = arcType >= 4 ? lh * 0.7 : (arcType >= 3 ? lh * 0.55 : lh * 0.33);
      var arcEndY  = arcStartY - arcH * Math.min(arcProgress, 1);
      var midX     = (arcStartX + arcEndX) / 2;
      var midY     = Math.min(arcStartY, arcEndY) - arcH * 0.3;

      ctx.strokeStyle = C.dark; ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      var steps = 20;
      ctx.moveTo(arcStartX, arcStartY);
      for (var s = 1; s <= steps; s++) {
        var t = s / steps * Math.min(arcProgress, 1);
        var qx = (1-t)*(1-t)*arcStartX + 2*(1-t)*t*midX + t*t*arcEndX;
        var qy = (1-t)*(1-t)*arcStartY + 2*(1-t)*t*midY + t*t*arcEndY;
        ctx.lineTo(qx, qy);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      if (arcProgress >= 0.5) {
        var t2 = Math.min(arcProgress, 1);
        var bx2 = (1-t2)*(1-t2)*arcStartX + 2*(1-t2)*t2*midX + t2*t2*arcEndX;
        var by2 = (1-t2)*(1-t2)*arcStartY + 2*(1-t2)*t2*midY + t2*t2*arcEndY;
        drawBall(bx2, by2, 3);
      }
    } else if (arcType === 0) {
      /* miss X */
      ctx.fillStyle = C.dark;
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("✕", batX, batY - 6);
    }

    /* === RIGHT: running track === */
    var rx = W/2 + 4, ry = 56, rw = W/2 - 8, rh = H - 64;
    var trackX1 = rx + rw/2 - 8, trackX2 = rx + rw/2 + 8;

    ctx.strokeStyle = C.dark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(trackX1, ry + 8); ctx.lineTo(trackX1, ry + rh - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(trackX2, ry + 8); ctx.lineTo(trackX2, ry + rh - 8); ctx.stroke();

    /* stumps top */
    for (var k = -1; k <= 1; k++) {
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(rx + rw/2 + k*4, ry + 8); ctx.lineTo(rx + rw/2 + k*4, ry + 16); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(rx+rw/2-4, ry+8); ctx.lineTo(rx+rw/2+4, ry+8); ctx.stroke();
    /* stumps bottom */
    for (var m = -1; m <= 1; m++) {
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(rx+rw/2+m*4, ry+rh-16); ctx.lineTo(rx+rw/2+m*4, ry+rh-8); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(rx+rw/2-4, ry+rh-8); ctx.lineTo(rx+rw/2+4, ry+rh-8); ctx.stroke();

    /* running batsman */
    var runY = ry + rh - 20 - runProgress * (rh - 36);
    ctx.fillStyle = C.dark;
    ctx.fillRect(rx + rw/2 - 5, runY - 14, 5, 9);
    ctx.fillRect(rx + rw/2 - 4, runY - 20, 5, 5);
    var legAnim = Math.sin(runProgress * 22) * 3;
    ctx.fillRect(rx + rw/2 - 5, runY - 5, 3, 5 + legAnim);
    ctx.fillRect(rx + rw/2 - 1, runY - 5, 3, 5 - legAnim);

    /* result popup */
    if (showResult && resultMsg) {
      ctx.font = "bold 14px monospace";
      var tw = ctx.measureText(resultMsg).width;
      var rpx = W/2 - tw/2 - 8;
      ctx.fillStyle = C.scbg;
      ctx.fillRect(rpx, H/2 - 14, tw + 16, 22);
      ctx.strokeStyle = C.mid; ctx.lineWidth = 1;
      ctx.strokeRect(rpx, H/2 - 14, tw + 16, 22);
      ctx.fillStyle = C.sctxt;
      ctx.textAlign = "left";
      ctx.fillText(resultMsg, rpx + 8, H/2 + 4);
    }
  }

  /* ---- BOWLING (CPU batting) screen ---- */
  function drawBowlingScreen() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    drawField();
    drawBatsman(W/2, H - 38, 0.9);

    /* CPU ball anim */
    if (bowlTimer > 20 && bowlTimer < 70) {
      var t = (bowlTimer - 20) / 50;
      var by3 = lerp(82, H - 52, t);
      drawBall(W/2 + (Math.random() * 2 - 1) * 0.4, by3, lerp(2, 3.5, t));
    }

    drawScoreboard(cScore, cWkt, curOver, curBall);

    /* target bar */
    ctx.fillStyle = C.scbg;
    ctx.fillRect(W/2 - 48, 56, 96, 19);
    ctx.fillStyle = C.sctxt;
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("TGT:" + target + "  NED:" + Math.max(0, target - cScore), W/2, 69);
    ctx.textAlign = "left";

    if (lastMsg) {
      ctx.fillStyle = C.scbg;
      ctx.fillRect(W/2 - 32, H/2 - 13, 64, 20);
      ctx.fillStyle = C.sctxt;
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(lastMsg, W/2, H/2 + 3);
      ctx.textAlign = "left";
    }
  }

  /* ---- INNINGS end screen ---- */
  function drawInningsScreen() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.scbg;
    ctx.fillRect(0, 0, W, 32);
    ctx.fillStyle = C.sctxt;
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";
    ctx.fillText("INNINGS OVER", 28, 21);

    ctx.fillStyle = C.dark;
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.fillText(pScore + "/" + pWkt, W/2, 90);
    ctx.font = "12px monospace";
    ctx.fillText("in " + pBalls + " balls", W/2, 110);
    ctx.font = "bold 16px monospace";
    ctx.fillText("Target: " + target, W/2, 150);
    ctx.font = "12px monospace";
    ctx.fillText("CPU needs " + target + " to win", W/2, 170);

    ctx.fillStyle = C.scbg;
    ctx.fillRect(0, H - 28, W, 28);
    ctx.fillStyle = C.sctxt;
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Press HIT to start CPU innings", W/2, H - 10);
    ctx.textAlign = "left";
  }

  /* ---- RESULT screen ---- */
  function drawResultScreen() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.scbg;
    ctx.fillRect(0, 0, W, 32);
    ctx.fillStyle = C.sctxt;
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";
    ctx.fillText("RESULT", 88, 21);

    var won  = cScore < target;
    var tied = cScore === target - 1 && (cWkt >= TOTAL_WICKETS || curOver >= overs);

    ctx.fillStyle = C.dark;
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    var msg = tied ? "TIED!" : (won ? "YOU WIN!" : "CPU WINS");
    ctx.fillText(msg, W/2, 90);

    ctx.font = "14px monospace";
    ctx.fillText("You: " + pScore + "/" + pWkt, W/2, 128);
    ctx.fillText("CPU: " + cScore + "/" + cWkt, W/2, 150);
    if (won && !tied)  ctx.fillText("Won by " + (TOTAL_WICKETS - cWkt) + " wkts", W/2, 174);
    if (!won && !tied) ctx.fillText("Lost by " + (target - 1 - cScore) + " runs", W/2, 174);

    ctx.font = "11px monospace";
    ctx.fillText("Best: " + best + " runs", W/2, 200);

    ctx.fillStyle = C.scbg;
    ctx.fillRect(0, H - 28, W, 28);
    ctx.fillStyle = C.sctxt;
    ctx.font = "12px monospace";
    ctx.fillText("HIT = new game", W/2, H - 10);
    ctx.textAlign = "left";
  }

  /* ---- main render ---- */
  function render() {
    ctx.clearRect(0, 0, W, H);
    if      (S === "MENU")    drawMenu();
    else if (S === "BATTING") drawBattingScreen();
    else if (S === "SHOT")    drawShotView();
    else if (S === "BOWLING") drawBowlingScreen();
    else if (S === "INNINGS") drawInningsScreen();
    else if (S === "RESULT")  drawResultScreen();
  }

  /* ---- game update loop ---- */
  var cpuNextTick = 0;

  function update(now) {
    if (S === "BATTING" && ballApproach) {
      ballProgress += SPEED_MAP[settings.speed];
      if (ballProgress >= 1) {
        /* auto-miss = bowled out */
        ballApproach = false;
        pWkt++;
        lastMsg = "BOWLED!"; resultMsg = "BOWLED!";
        arcType = 0; arcDir = 0; arcProgress = 0; runProgress = 0; showResult = false;
        CNKGame.beep(settings.sound, 180, 280, "sawtooth");
        advBall();
        S = "SHOT";
        checkInningsEnd();
      }
    }

    if (S === "SHOT") {
      arcProgress += 0.026;
      if (arcType > 0) runProgress = Math.min(1, runProgress + 0.018);
      if (arcProgress > 0.8 && !showResult) { showResult = true; }
      if (arcProgress > 1.8) {
        /* next ball or innings already triggered */
        if (S === "SHOT") {
          checkInningsEnd();
          if (S === "SHOT") startDelivery();
        }
      }
    }

    if (S === "BOWLING") {
      bowlTimer++;
      if (cpuNextTick === 0) cpuNextTick = now + (cpuDelay || 1200);
      if (now >= cpuNextTick) {
        cpuNextTick = 0;
        doCpuBall();
      }
    }
  }

  var lastNow = 0;
  function frame(now) {
    if (!lastNow) lastNow = now;
    lastNow = now;
    update(now);
    render();
    requestAnimationFrame(frame);
  }

  /* ---- boot ---- */
  setupCanvas();
  applySettings();
  resetAll();
  menuSel = 0;
  overs = 5;
  S = "MENU";
  requestAnimationFrame(frame);
})();

/* Tap cricket — Nokia LCD style. Watch the ball, tap at the right moment. */
(function () {
  "use strict";

  /* ---- constants ---- */
  var W = 440, H = 260;
  var PITCH_TOP = 98, PITCH_BOT = 162, PITCH_MID = 130;
  var BAT_X = 74;
  var BOWL_X = 392;
  var DEAD_X = 24;
  var EARLY_IGNORE = 158;
  var HIT_MIN = 56, HIT_MAX = 114;
  var PERFECT_MIN = 68, PERFECT_MAX = 92;
  var TOTAL_BALLS = 30;
  var TOTAL_WICKETS = 10;

  var SPEEDS = { slow: 2.0, normal: 3.2, fast: 4.8 };
  var SETTINGS_KEY = "cnk-cricket-s";
  var BEST_KEY = "cnk-cricket-best";

  /* Nokia LCD green palette */
  var C_BG    = "#9bbc0f";   /* screen background */
  var C_DARK  = "#0f380f";   /* darkest — outlines, text, figures */
  var C_MID   = "#306230";   /* mid green — field, pitch fill */
  var C_FIELD = "#8bac0f";   /* slightly darker than BG — outer field */
  var C_CREAM = "#c4cfa1";   /* off-white — stumps, zone hint */

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- DOM ---- */
  var $ = function (id) { return document.getElementById(id); };
  var $all = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  var canvas = $("board"), ctx = canvas.getContext("2d");
  var panel = $("game"), screenEl = $("screen");
  var veil = $("veil"), veilTitle = $("veil-title"), veilSub = $("veil-sub"), veilBtn = $("veil-btn");
  var runsEl = $("runs"), wicketsEl = $("wickets"), ballsEl = $("balls"), bestEl = $("best");
  var hitBtn = $("hit-btn");
  var settingsBtn = $("settings-toggle"), settingsBox = $("settings");
  var fsBtn = $("fullscreen"), soundBtn = $("sound");

  /* ---- persistence ---- */
  var settings = CNKGame.load(SETTINGS_KEY, { speed: "normal", sound: true });
  var best = 0;
  try { best = parseInt(localStorage.getItem(BEST_KEY)) || 0; } catch (e) {}
  function saveBest(v) { try { localStorage.setItem(BEST_KEY, v); } catch (e) {} }

  /* ---- game state ---- */
  var state = "ready";
  var runs, wickets, ballsBowled;
  var ballX, ballY, ballSpinAmp;
  var tapped;
  var result;
  var resultTick;
  var batAngle;
  var glowPulse;

  /* ---- helpers ---- */
  function showVeil(title, sub, label) {
    veilTitle.textContent = title;
    veilSub.textContent = sub;
    veilBtn.textContent = label;
    veil.hidden = false;
  }
  function hideVeil() { veil.hidden = true; }

  function syncStats() {
    runsEl.textContent = runs;
    wicketsEl.textContent = wickets + "/" + TOTAL_WICKETS;
    ballsEl.textContent = TOTAL_BALLS - ballsBowled;
    bestEl.textContent = best;
  }

  function syncHitBtn() {
    hitBtn.disabled = state !== "bowling" || tapped;
    hitBtn.textContent = (state === "bowling" && !tapped) ? "🏏 Hit!" : "🏏 Hit";
  }

  function reset() {
    runs = 0; wickets = 0; ballsBowled = 0;
    result = null; resultTick = 0; batAngle = 0; glowPulse = 0;
    syncStats();
    syncHitBtn();
  }

  function bowlNext() {
    ballX = BOWL_X;
    ballY = PITCH_MID + (Math.random() * 16 - 8);
    ballSpinAmp = Math.random() * 0.35 - 0.175;
    tapped = false;
    result = null;
    resultTick = 0;
    batAngle = 0;
    state = "bowling";
    syncHitBtn();
  }

  function startGame() {
    reset();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    hideVeil();
    bowlNext();
  }

  /* ---- shot result ---- */
  function computeShot(bx) {
    if (bx >= HIT_MIN && bx <= HIT_MAX) {
      if (bx >= PERFECT_MIN && bx <= PERFECT_MAX) {
        var r = Math.random() < 0.55 ? 6 : 4;
        return { runs: r, label: r === 6 ? "SIX!" : "FOUR!", out: false };
      }
      var dist = Math.min(Math.abs(bx - PERFECT_MIN), Math.abs(bx - PERFECT_MAX));
      var scored = dist < 12 ? (Math.random() < 0.5 ? 3 : 2) : 1;
      return { runs: scored, label: scored + (scored === 1 ? " RUN" : " RUNS"), out: false };
    }
    if (Math.random() < 0.5) {
      return { runs: 0, label: "MISSED", out: false };
    }
    var outs = ["CAUGHT!", "EDGED OUT!"];
    return { runs: 0, label: outs[Math.floor(Math.random() * outs.length)], out: true };
  }

  function applyResult(r) {
    if (r.out) {
      wickets++;
      CNKGame.beep(settings.sound, 200, 280, "sawtooth");
    } else if (r.runs > 0) {
      runs += r.runs;
      batAngle = 0.05;
      CNKGame.beep(settings.sound, r.runs >= 4 ? 900 : 660, r.runs >= 4 ? 220 : 110, "square");
      if (runs > best) { best = runs; saveBest(best); }
    } else {
      CNKGame.beep(settings.sound, 280, 80, "square");
    }
    ballsBowled++;
    result = r;
    resultTick = r.out ? 115 : 80;
    state = "result";
    syncStats();
    syncHitBtn();
  }

  function handleTap() {
    if (state === "ready" || state === "done") { startGame(); return; }
    if (state !== "bowling" || tapped) return;
    if (ballX > EARLY_IGNORE) return;
    tapped = true;
    applyResult(computeShot(ballX));
  }

  function onBowled() {
    if (tapped) return;
    tapped = true;
    wickets++;
    ballsBowled++;
    result = { runs: 0, label: "BOWLED!", out: true };
    resultTick = 120;
    CNKGame.beep(settings.sound, 180, 300, "sawtooth");
    syncStats();
    state = "result";
    syncHitBtn();
  }

  function afterResult() {
    if (wickets >= TOTAL_WICKETS || ballsBowled >= TOTAL_BALLS) {
      state = "done";
      var reason = wickets >= TOTAL_WICKETS ? "All out!" : "5 overs done.";
      showVeil("Innings over", reason + " You scored " + runs + " runs.", "Play again");
      return;
    }
    bowlNext();
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
    if (settings.sound) { CNKGame.unlockAudio(); CNKGame.beep(true, 660, 80, "square"); }
  });
  settingsBtn.addEventListener("click", function () { openSettings(settingsBox.hidden); });
  $("restart").addEventListener("click", startGame);
  veilBtn.addEventListener("click", startGame);
  hitBtn.addEventListener("click", handleTap);

  window.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === " " || e.key === "Enter") {
      if (e.target && e.target.closest && e.target.closest("button, a, input, select, textarea")) return;
      e.preventDefault();
      handleTap();
    } else if (e.key === "r") {
      startGame();
    } else if (e.key === "Escape" && !settingsBox.hidden) {
      openSettings(false);
    }
  });

  screenEl.addEventListener("click", handleTap);
  screenEl.addEventListener("touchstart", function (e) { e.preventDefault(); handleTap(); }, { passive: false });

  CNKGame.fullscreen(panel, fsBtn);

  /* ================================================================
     DRAWING — Nokia LCD style
     Field layout (landscape): V-shape apex at right (bowler end),
     base at left. Pitch strip horizontal center. Batsman left, bowler right.
  ================================================================ */

  function setupCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* Pixel-style rect helper */
  function pxRect(x, y, w, h, fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawField() {
    /* ---- background ---- */
    ctx.fillStyle = C_BG;
    ctx.fillRect(0, 0, W, H);

    /* ---- outer field (V-shape triangle, apex at right-center) ---- */
    ctx.fillStyle = C_FIELD;
    ctx.beginPath();
    ctx.moveTo(W - 28, H / 2);   /* right apex — bowler end */
    ctx.lineTo(14, 12);           /* top-left corner */
    ctx.lineTo(14, H - 12);       /* bottom-left corner */
    ctx.closePath();
    ctx.fill();

    /* field outline */
    ctx.strokeStyle = C_DARK;
    ctx.lineWidth = 2;
    ctx.stroke();

    /* ---- infield (smaller inner ellipse feel — second V slightly smaller) ---- */
    ctx.fillStyle = C_BG;
    ctx.beginPath();
    ctx.moveTo(W - 52, H / 2);
    ctx.lineTo(36, 34);
    ctx.lineTo(36, H - 34);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C_DARK;
    ctx.lineWidth = 1;
    ctx.stroke();

    /* ---- pitch strip ---- */
    ctx.fillStyle = C_MID;
    ctx.fillRect(BAT_X - 14, PITCH_TOP, (BOWL_X - 14) - (BAT_X - 14), PITCH_BOT - PITCH_TOP);
    ctx.strokeStyle = C_DARK;
    ctx.lineWidth = 1;
    ctx.strokeRect(BAT_X - 14, PITCH_TOP, (BOWL_X - 14) - (BAT_X - 14), PITCH_BOT - PITCH_TOP);

    /* ---- crease lines on pitch ---- */
    ctx.strokeStyle = C_CREAM;
    ctx.lineWidth = 1.5;
    /* batting crease */
    ctx.beginPath(); ctx.moveTo(BAT_X + 6, PITCH_TOP); ctx.lineTo(BAT_X + 6, PITCH_BOT); ctx.stroke();
    /* bowling crease */
    ctx.beginPath(); ctx.moveTo(BOWL_X - 20, PITCH_TOP); ctx.lineTo(BOWL_X - 20, PITCH_BOT); ctx.stroke();

    /* ---- score bar at top (Nokia black strip) ---- */
    pxRect(0, 0, W, 19, C_DARK);
    /* pixel-dots border bottom */
    ctx.fillStyle = C_MID;
    for (var px = 0; px < W; px += 4) ctx.fillRect(px, 18, 2, 1);
  }

  function drawScoreBar() {
    var over = Math.floor(ballsBowled / 6) + "." + (ballsBowled % 6);
    var ballsLeft = TOTAL_BALLS - ballsBowled;

    ctx.save();
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.fillStyle = C_BG;
    ctx.textBaseline = "middle";

    /* left: score */
    ctx.textAlign = "left";
    ctx.fillText(runs + " / " + wickets, 7, 9);

    /* center: overs */
    ctx.textAlign = "center";
    ctx.fillText(over + " ov", W / 2, 9);

    /* right: balls left */
    ctx.textAlign = "right";
    ctx.fillText(ballsLeft + "b", W - 7, 9);

    ctx.restore();
  }

  function drawStumps(x) {
    /* three vertical lines */
    ctx.strokeStyle = C_CREAM;
    ctx.lineWidth = 2;
    [-5, 0, 5].forEach(function (dx) {
      ctx.beginPath();
      ctx.moveTo(x + dx, PITCH_TOP - 2);
      ctx.lineTo(x + dx, PITCH_BOT + 14);
      ctx.stroke();
    });
    /* bails (two short horizontal pieces) */
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 6, PITCH_TOP + 2);
    ctx.lineTo(x - 1, PITCH_TOP + 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 1, PITCH_TOP + 2);
    ctx.lineTo(x + 6, PITCH_TOP + 2);
    ctx.stroke();
  }

  function drawBatsman(angle) {
    var bx = Math.round(BAT_X - 22), by = PITCH_MID;
    ctx.save();
    ctx.strokeStyle = C_DARK;
    ctx.fillStyle = C_DARK;
    ctx.lineCap = "round";

    /* head */
    ctx.beginPath(); ctx.arc(bx, by - 21, 5, 0, Math.PI * 2); ctx.fill();
    /* helmet peak */
    pxRect(bx - 6, by - 24, 4, 4, C_DARK);

    /* body */
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(bx, by - 16); ctx.lineTo(bx, by + 10); ctx.stroke();

    /* legs */
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, by + 10); ctx.lineTo(bx - 6, by + 28);
    ctx.moveTo(bx, by + 10); ctx.lineTo(bx + 5, by + 28);
    ctx.stroke();

    /* bat arm + bat */
    ctx.save();
    ctx.translate(bx, by - 4);
    ctx.rotate(-0.15 + angle * (-Math.PI * 0.62));
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, 8); ctx.stroke();
    /* bat blade */
    pxRect(16, 6, 14, 5, C_DARK);
    ctx.restore();

    ctx.restore();
  }

  function drawBowler() {
    var bx = Math.round(BOWL_X + 18), by = PITCH_MID;
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = C_DARK;
    ctx.fillStyle = C_DARK;
    ctx.lineCap = "round";

    /* head */
    ctx.beginPath(); ctx.arc(bx, by - 19, 4, 0, Math.PI * 2); ctx.fill();

    /* body */
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx, by - 15); ctx.lineTo(bx, by + 8); ctx.stroke();

    /* legs */
    ctx.beginPath();
    ctx.moveTo(bx, by + 8); ctx.lineTo(bx - 4, by + 22);
    ctx.moveTo(bx, by + 8); ctx.lineTo(bx + 4, by + 22);
    ctx.stroke();

    /* bowling arm raised */
    ctx.beginPath(); ctx.moveTo(bx, by - 6); ctx.lineTo(bx - 14, by - 16); ctx.stroke();

    ctx.restore();
  }

  function drawHitZone(alpha) {
    if (alpha <= 0) return;
    ctx.save();
    /* zone overlay on pitch */
    ctx.globalAlpha = alpha * 0.28;
    ctx.fillStyle = C_CREAM;
    ctx.fillRect(HIT_MIN, PITCH_TOP, HIT_MAX - HIT_MIN, PITCH_BOT - PITCH_TOP);
    /* sweet spot slightly brighter */
    ctx.globalAlpha = alpha * 0.38;
    ctx.fillStyle = C_CREAM;
    ctx.fillRect(PERFECT_MIN, PITCH_TOP, PERFECT_MAX - PERFECT_MIN, PITCH_BOT - PITCH_TOP);
    /* dashed border */
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = C_CREAM;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(HIT_MIN + 0.5, PITCH_TOP + 0.5, HIT_MAX - HIT_MIN - 1, PITCH_BOT - PITCH_TOP - 1);
    ctx.restore();
  }

  function drawBall(bx, by) {
    /* shadow */
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = C_DARK;
    ctx.beginPath();
    ctx.ellipse(bx, PITCH_BOT + 3, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* ball — dark filled circle on green field */
    ctx.fillStyle = C_DARK;
    ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill();

    /* seam highlight */
    ctx.strokeStyle = C_BG;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(bx, by, 4.5, -0.4, 0.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, by, 4.5, Math.PI - 0.4, Math.PI + 0.4); ctx.stroke();
  }

  function drawResult(r) {
    if (!r || resultTick <= 0) return;
    var alpha = Math.min(1, resultTick / 18);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "bold 36px 'Barlow Condensed', 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    var tw = ctx.measureText(r.label).width + 20;
    var th = 42;
    var tx = W / 2, ty = H / 2;

    /* box */
    ctx.fillStyle = C_DARK;
    ctx.fillRect(Math.round(tx - tw / 2), Math.round(ty - th / 2), Math.round(tw), th);
    /* border */
    ctx.strokeStyle = C_BG;
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(tx - tw / 2) + 3, Math.round(ty - th / 2) + 3, Math.round(tw) - 6, th - 6);
    /* text */
    ctx.fillStyle = C_BG;
    ctx.fillText(r.label, tx, ty);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawField();
    drawScoreBar();
    drawHitZone(glowPulse);
    drawStumps(BAT_X + 8);
    drawStumps(BOWL_X - 16);
    drawBowler();
    if (state === "bowling" || state === "result") {
      drawBall(ballX, ballY);
    }
    drawBatsman(batAngle);
    drawResult(result);
  }

  /* ---- game loop ---- */
  var lastTime = 0;
  var FRAME_MS = 1000 / 60;

  function tick(dt) {
    var speed = SPEEDS[settings.speed];

    if (state === "bowling") {
      ballX -= speed * dt;
      if (!reduceMotion) ballY = PITCH_MID + ballSpinAmp * Math.sin((BOWL_X - ballX) * 0.055);
      var approachDist = EARLY_IGNORE - ballX;
      glowPulse = approachDist > 0 ? Math.min(0.9, approachDist / 80) : 0;
      if (ballX <= DEAD_X) onBowled();

    } else if (state === "result") {
      ballX -= speed * 0.35 * dt;
      glowPulse = Math.max(0, glowPulse - 0.04 * dt);
      if (batAngle > 0 && batAngle < 1) batAngle = Math.min(1, batAngle + 0.08 * dt);
      else if (batAngle >= 1) batAngle = Math.max(0, batAngle - 0.05 * dt);
      resultTick -= dt;
      if (resultTick <= 0) afterResult();
    }
  }

  function frame(now) {
    var dt = Math.min((now - lastTime) / FRAME_MS, 4);
    lastTime = now;
    tick(dt);
    draw();
    requestAnimationFrame(frame);
  }

  /* ---- boot ---- */
  setupCanvas();
  applySettings();
  reset();
  syncStats();
  showVeil("Tap Cricket", "5 overs · 10 wickets. Watch for the timing zone and tap to bat.", "Start batting");
  requestAnimationFrame(function (now) { lastTime = now; requestAnimationFrame(frame); });
})();

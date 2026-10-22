/* Tap cricket. Watch the ball, tap at the right moment. Nothing leaves the browser. */
(function () {
  "use strict";

  /* ---- constants ---- */
  var W = 440, H = 260;
  var PITCH_TOP = 98, PITCH_BOT = 162, PITCH_MID = 130;
  var BAT_X = 74;             /* batsman contact x */
  var BOWL_X = 392;           /* ball starts here */
  var DEAD_X = 24;            /* ball reaches this = bowled out */
  var EARLY_IGNORE = 158;     /* taps above this x are silently ignored (too early) */
  var HIT_MIN = 56, HIT_MAX = 114;   /* hit window — gives runs */
  var PERFECT_MIN = 68, PERFECT_MAX = 92; /* sweet spot = 4 or 6 */
  var TOTAL_BALLS = 30;       /* 5 overs */
  var TOTAL_WICKETS = 10;

  var SPEEDS = { slow: 2.0, normal: 3.2, fast: 4.8 };
  var SETTINGS_KEY = "cnk-cricket-s";
  var BEST_KEY = "cnk-cricket-best";

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
  var state = "ready";   /* ready | bowling | result | done */
  var runs, wickets, ballsBowled;
  var ballX, ballY, ballSpinAmp;
  var tapped;            /* player used their shot this ball */
  var result;            /* { runs, label, color, out } or null */
  var resultTick;        /* frames until result clears */
  var batAngle;          /* 0 = ready, 1 = full swing */
  var glowPulse;         /* 0..1 oscillation for hit zone glow */

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
        return { runs: r, label: r === 6 ? "SIX!" : "FOUR!", color: r === 6 ? "#ffd600" : "#ff9800", out: false };
      }
      var dist = Math.min(Math.abs(bx - PERFECT_MIN), Math.abs(bx - PERFECT_MAX));
      var scored = dist < 12 ? (Math.random() < 0.5 ? 3 : 2) : 1;
      return { runs: scored, label: scored + (scored === 1 ? " run" : " runs"), color: "#8bc34a", out: false };
    }
    /* miss zone: 50% dot, 50% edge-out */
    if (Math.random() < 0.5) {
      return { runs: 0, label: "Missed!", color: "#90a4ae", out: false };
    }
    var outs = ["Caught!", "Edged out!"];
    return { runs: 0, label: outs[Math.floor(Math.random() * outs.length)], color: "#ef5350", out: true };
  }

  function applyResult(r) {
    if (r.out) {
      wickets++;
      CNKGame.beep(settings.sound, 200, 280, "sawtooth");
    } else if (r.runs > 0) {
      runs += r.runs;
      batAngle = 0.05;  /* trigger swing anim */
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
    if (ballX > EARLY_IGNORE) return;   /* too early — silently ignored, can tap again */
    tapped = true;
    applyResult(computeShot(ballX));
  }

  function onBowled() {
    if (tapped) return;
    tapped = true;
    wickets++;
    ballsBowled++;
    result = { runs: 0, label: "Bowled!", color: "#ef5350", out: true };
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

  /* ---- drawing ---- */
  function setupCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawField() {
    /* sky */
    var sky = ctx.createLinearGradient(0, 0, 0, H * 0.56);
    sky.addColorStop(0, "#42a5f5");
    sky.addColorStop(1, "#90caf9");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H * 0.56);
    /* grass */
    ctx.fillStyle = "#388e3c";
    ctx.fillRect(0, H * 0.56, W, H * 0.44 + 1);
    /* outfield circle */
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(W / 2, PITCH_MID + 18, 182, 82, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    /* pitch strip */
    ctx.fillStyle = "#c8a96e";
    ctx.beginPath();
    ctx.rect(42, PITCH_TOP, W - 88, PITCH_BOT - PITCH_TOP);
    ctx.fill();
    /* crease lines */
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.5;
    /* batting */
    var cr = [BAT_X - 10, BAT_X + 10, 372];
    cr.forEach(function (x) {
      ctx.beginPath(); ctx.moveTo(x, PITCH_TOP - 1); ctx.lineTo(x, PITCH_BOT + 1); ctx.stroke();
    });
  }

  function drawHitZone(alpha) {
    if (alpha <= 0) return;
    ctx.save();
    /* green zone */
    ctx.globalAlpha = alpha * 0.38;
    ctx.fillStyle = "#8bc34a";
    ctx.fillRect(HIT_MIN, PITCH_TOP, HIT_MAX - HIT_MIN, PITCH_BOT - PITCH_TOP);
    /* gold sweet spot */
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle = "#ffd600";
    ctx.fillRect(PERFECT_MIN, PITCH_TOP, PERFECT_MAX - PERFECT_MIN, PITCH_BOT - PITCH_TOP);
    ctx.restore();
  }

  function drawStumps(x) {
    ctx.strokeStyle = "#f5e6c8";
    ctx.lineWidth = 2.2;
    [-5, 0, 5].forEach(function (dx) {
      ctx.beginPath(); ctx.moveTo(x + dx, PITCH_BOT); ctx.lineTo(x + dx, PITCH_BOT + 18); ctx.stroke();
    });
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 5, PITCH_BOT + 1); ctx.lineTo(x + 5, PITCH_BOT + 1); ctx.stroke();
  }

  function drawBatsman(angle) {
    var bx = BAT_X - 18, by = PITCH_MID;
    ctx.save();
    /* helmet */
    ctx.fillStyle = "#1565c0";
    ctx.beginPath(); ctx.arc(bx, by - 22, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0d47a1";
    ctx.fillRect(bx - 7, by - 21, 4, 5); /* peak */
    /* body */
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx, by - 15); ctx.lineTo(bx, by + 12); ctx.stroke();
    /* legs */
    ctx.beginPath();
    ctx.moveTo(bx, by + 12);
    ctx.lineTo(bx - 6, by + 30);
    ctx.moveTo(bx, by + 12);
    ctx.lineTo(bx + 4, by + 30);
    ctx.stroke();
    /* bat arm + bat */
    ctx.save();
    ctx.translate(bx, by - 4);
    var readyAngle = -0.15;
    var swingDelta = -Math.PI * 0.62;
    ctx.rotate(readyAngle + angle * swingDelta);
    ctx.strokeStyle = "#8d6e63";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, 10); ctx.stroke();
    ctx.fillStyle = "#a1887f";
    ctx.strokeStyle = "#6d4c41";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(20, 7, 15, 6);
    ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  function drawBowler() {
    var bx = 382, by = PITCH_MID;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(bx, by - 22, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx, by - 16); ctx.lineTo(bx, by + 10); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, by + 10); ctx.lineTo(bx - 5, by + 28);
    ctx.moveTo(bx, by + 10); ctx.lineTo(bx + 5, by + 28);
    ctx.stroke();
    /* bowling arm */
    ctx.beginPath(); ctx.moveTo(bx, by - 6); ctx.lineTo(bx - 16, by - 2); ctx.stroke();
    ctx.restore();
  }

  function drawBall(bx, by) {
    /* shadow on pitch */
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(bx, PITCH_BOT + 2, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    /* ball */
    var g = ctx.createRadialGradient(bx - 2, by - 2, 0.5, bx, by, 8);
    g.addColorStop(0, "#ef5350");
    g.addColorStop(1, "#b71c1c");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();
    /* seam */
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(bx, by, 5.5, -0.45, 0.45); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, by, 5.5, Math.PI - 0.45, Math.PI + 0.45); ctx.stroke();
  }

  function drawResult(r) {
    if (!r || resultTick <= 0) return;
    var alpha = Math.min(1, resultTick / 18);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 10;
    ctx.font = "bold 40px 'Barlow Condensed', sans-serif";
    ctx.fillStyle = r.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(r.label, W / 2, H / 2 - 10);
    ctx.restore();
  }

  function drawOverCounter() {
    var over = Math.floor(ballsBowled / 6);
    var ball = ballsBowled % 6;
    var txt = "Over " + over + "." + ball + "  |  " + (TOTAL_BALLS - ballsBowled) + " balls left";
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    var tw = ctx.measureText(txt).width + 14;
    ctx.fillRect(W - tw - 4, 3, tw + 4, 20);
    ctx.fillStyle = "#fff";
    ctx.font = "11px 'Barlow', sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(txt, W - 8, 13);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawField();
    drawHitZone(glowPulse);
    drawStumps(BAT_X);
    drawStumps(376);
    drawBowler();
    if (ballX > 0 && (state === "bowling" || state === "result")) {
      drawBall(ballX, ballY);
    }
    drawBatsman(batAngle);
    drawResult(result);
    drawOverCounter();
  }

  /* ---- game loop ---- */
  var lastTime = 0;
  var frameAcc = 0;
  var FRAME_MS = 1000 / 60;

  function tick(dt) {
    var speed = SPEEDS[settings.speed];

    if (state === "bowling") {
      ballX -= speed * dt;
      if (!reduceMotion) ballY = PITCH_MID + ballSpinAmp * Math.sin((BOWL_X - ballX) * 0.055);
      /* glow: ramp up as ball enters approach zone */
      var approachDist = EARLY_IGNORE - ballX;
      glowPulse = approachDist > 0 ? Math.min(0.9, approachDist / 80) : 0;
      if (ballX <= DEAD_X) onBowled();

    } else if (state === "result") {
      /* ball rolls on slowly after shot or miss */
      ballX -= speed * 0.35 * dt;
      glowPulse = Math.max(0, glowPulse - 0.04 * dt);
      /* bat swing */
      if (batAngle > 0 && batAngle < 1) batAngle = Math.min(1, batAngle + 0.08 * dt);
      else if (batAngle >= 1) batAngle = Math.max(0, batAngle - 0.05 * dt);
      /* countdown */
      resultTick -= dt;
      if (resultTick <= 0) afterResult();
    }
  }

  function frame(now) {
    var dt = Math.min((now - lastTime) / FRAME_MS, 4); /* cap at 4 frames */
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
  showVeil("Tap Cricket", "5 overs · 10 wickets. Watch for the green zone and tap to bat.", "Start batting");
  requestAnimationFrame(function (now) { lastTime = now; requestAnimationFrame(frame); });
})();

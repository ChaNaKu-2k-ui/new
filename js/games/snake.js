/* Snake game. Movement runs on a timer, drawing runs every frame. Nothing leaves the browser. */
(function () {
  "use strict";

  var COLS = 20, ROWS = 20, CELL = 20;                    /* 20 x 20 grid, 400 x 400 logical pixels */
  var SPEED_STEP = 3;                                     /* ms faster for each food eaten */
  var SPEEDS = {                                          /* ms per move: at the start, and at the fastest */
    slow: { start: 190, min: 95 },
    normal: { start: 140, min: 60 },
    fast: { start: 100, min: 40 }
  };
  var PALETTES = {                                        /* board colours: background, pixel ink, food */
    green: { lcd: "#c2d09c", ink: "#1c2514", food: "#e0457b" },
    amber: { lcd: "#f2c15a", ink: "#2b1c04", food: "#d8432f" },
    ice: { lcd: "#bfdcec", ink: "#10283a", food: "#ff7a59" },
    night: { lcd: "#1d2228", ink: "#e6edf2", food: "#ff5c8a" }
  };
  var MODE_HINT = {
    classic: "Hitting a wall ends the game.",
    endless: "Walls wrap around, so only your own tail can end the run."
  };
  var BEST_KEY = "cnk-snake-best", SETTINGS_KEY = "cnk-snake-settings";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var touchDevice = window.matchMedia("(pointer: coarse)").matches;

  var $ = function (id) { return document.getElementById(id); };
  var $all = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  var has = function (obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); };
  var quiet = function (promise) { if (promise && promise.catch) promise.catch(function () {}); };

  var canvas = $("board");
  var ctx = canvas.getContext("2d");
  var panel = $("game"), screenEl = $("screen");
  var veil = $("veil"), veilTitle = $("veil-title"), veilSub = $("veil-sub"), veilBtn = $("veil-btn");
  var pauseBtn = $("pause"), settingsBtn = $("settings-toggle"), settingsBox = $("settings");
  var fsBtn = $("fullscreen"), soundBtn = $("sound"), padBtn = $("pad-toggle"), padSetting = $("pad-setting");
  var scoreEl = $("score"), bestEl = $("best");

  var UP = { x: 0, y: -1 }, DOWN = { x: 0, y: 1 }, LEFT = { x: -1, y: 0 }, RIGHT = { x: 1, y: 0 };
  var KEYMAP = new Map([
    ["ArrowUp", UP], ["w", UP], ["ArrowDown", DOWN], ["s", DOWN],
    ["ArrowLeft", LEFT], ["a", LEFT], ["ArrowRight", RIGHT], ["d", RIGHT]
  ]);
  var PAD = { up: UP, down: DOWN, left: LEFT, right: RIGHT };

  var settings = loadSettings();
  var bests = loadBests();
  var colours = PALETTES.green;
  var snake, dir, queue, food;
  var score = 0;
  var state = "ready";            /* ready | playing | paused | over */
  var timer = null, swipeFrom = null, audio = null;

  /* ---- saved data: all optional, all in this browser ---- */

  function loadSettings() {
    var s = { mode: "classic", speed: "normal", sound: true, palette: "green", pad: true };
    try {
      var saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
      if (has(MODE_HINT, saved.mode)) s.mode = saved.mode;
      if (has(SPEEDS, saved.speed)) s.speed = saved.speed;
      if (typeof saved.sound === "boolean") s.sound = saved.sound;
      if (has(PALETTES, saved.palette)) s.palette = saved.palette;
      if (typeof saved.pad === "boolean") s.pad = saved.pad;
    } catch (e) { /* storage blocked or corrupt: use the defaults */ }
    return s;
  }
  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* keep playing */ }
  }
  function loadBests() {
    var out = { classic: 0, endless: 0 };
    try {
      var raw = localStorage.getItem(BEST_KEY);
      if (/^\d+$/.test(raw)) {                            /* an older build kept one number: it was Classic */
        out.classic = Number(raw);
      } else if (raw) {
        var v = JSON.parse(raw);
        out.classic = Number(v.classic) || 0;
        out.endless = Number(v.endless) || 0;
      }
    } catch (e) { /* storage blocked or corrupt: start from zero */ }
    return out;
  }
  function saveBests() {
    try { localStorage.setItem(BEST_KEY, JSON.stringify(bests)); } catch (e) { /* keep playing */ }
  }

  /* ---- sound: short beeps from the Web Audio API ---- */

  function ensureAudio() {
    if (audio) return audio;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audio = new AC();
    } catch (e) { audio = null; }
    return audio;
  }
  function beep(freq, ms, type) {
    if (!settings.sound) return;
    var ac = ensureAudio();
    if (!ac) return;
    try {
      if (ac.state === "suspended") quiet(ac.resume());
      var t = ac.currentTime, osc = ac.createOscillator(), gain = ac.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + ms / 1000);
    } catch (e) { /* audio blocked: play silently */ }
  }

  /* ---- the board ---- */

  function spawnFood() {
    var taken = new Set(snake.map(function (p) { return p.y * COLS + p.x; }));
    var free = [];
    for (var i = 0; i < COLS * ROWS; i++) if (!taken.has(i)) free.push(i);
    if (free.length === 0) return null;
    var pick = free[Math.floor(Math.random() * free.length)];
    return { x: pick % COLS, y: Math.floor(pick / COLS) };
  }

  function reset() {
    var x = Math.floor(COLS / 2), y = Math.floor(ROWS / 2);
    snake = [{ x: x, y: y }, { x: x - 1, y: y }, { x: x - 2, y: y }];
    dir = RIGHT;
    queue = [];
    score = 0;
    food = spawnFood();
    showScore();
  }

  function showScore() {
    scoreEl.textContent = String(score);
    bestEl.textContent = String(Math.max(bests[settings.mode], score));
  }
  function showVeil(title, sub, label) {
    veilTitle.textContent = title;
    veilSub.textContent = sub;
    veilBtn.textContent = label;
    veil.hidden = false;
  }
  function showStartVeil() {
    var how = touchDevice ? "Swipe the board or use the arrow buttons to steer." : "Arrow keys or WASD to steer. Press Enter to start.";
    showVeil("Snake", how + " " + MODE_HINT[settings.mode], "Start");
  }
  function syncPause() {
    pauseBtn.textContent = state === "paused" ? "Resume" : "Pause";
    pauseBtn.disabled = state === "ready" || state === "over";
  }

  function start() {
    ensureAudio();
    clearTimeout(timer);
    reset();
    state = "playing";
    veil.hidden = true;
    syncPause();
    schedule();
  }
  function toReady() {                                    /* back to the start screen; the run in progress is dropped */
    clearTimeout(timer);
    reset();
    state = "ready";
    showStartVeil();
    syncPause();
  }
  function schedule() {
    clearTimeout(timer);
    var sp = SPEEDS[settings.speed];
    timer = setTimeout(step, Math.max(sp.min, sp.start - score * SPEED_STEP));
  }

  function step() {
    if (state !== "playing") return;
    if (queue.length) dir = queue.shift();
    var nx = snake[0].x + dir.x, ny = snake[0].y + dir.y;
    if (settings.mode === "endless") {                    /* Endless: the board wraps around */
      nx = (nx + COLS) % COLS;
      ny = (ny + ROWS) % ROWS;
    } else if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) {
      return finish(false);
    }

    var eats = food !== null && nx === food.x && ny === food.y;
    /* On a normal move the tail leaves its cell, so the head may enter it. */
    var body = eats ? snake : snake.slice(0, -1);
    if (body.some(function (p) { return p.x === nx && p.y === ny; })) return finish(false);

    snake.unshift({ x: nx, y: ny });
    if (eats) {
      score++;
      beep(740, 60, "square");
      food = spawnFood();
      showScore();
      if (food === null) return finish(true);
    } else {
      snake.pop();
    }
    schedule();
  }

  function finish(won) {
    clearTimeout(timer);
    state = "over";
    if (score > bests[settings.mode]) { bests[settings.mode] = score; saveBests(); }
    beep(won ? 880 : 196, won ? 240 : 360, won ? "triangle" : "sawtooth");
    showScore();
    syncPause();
    showVeil(
      won ? "You win" : "Game over",
      won ? "The board is full. Press Enter to play again." : "Score " + score + ". Press Enter to play again.",
      "Play again"
    );
  }

  function togglePause() {
    if (state === "playing") {
      clearTimeout(timer);
      state = "paused";
      showVeil("Paused", "Press P or Space to carry on.", "Resume");
    } else if (state === "paused") {
      state = "playing";
      veil.hidden = true;
      schedule();
    }
    syncPause();
  }
  function primary() {                                    /* Space or Enter */
    if (state === "playing" || state === "paused") togglePause();
    else start();
  }

  function steer(d) {
    if (state === "ready") start();
    if (state !== "playing" || queue.length >= 2) return;
    var last = queue.length ? queue[queue.length - 1] : dir;
    if (d.x === last.x && d.y === last.y) return;          /* already heading that way */
    if (d.x === -last.x && d.y === -last.y) return;        /* no instant U-turn */
    queue.push(d);
  }

  /* ---- settings panel ---- */

  function markChoices(attr, value) {
    $all("[data-" + attr + "]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-" + attr) === value));
    });
  }
  function applySettings() {
    colours = PALETTES[settings.palette];
    screenEl.style.setProperty("--snake-lcd", colours.lcd);
    screenEl.style.setProperty("--snake-ink", colours.ink);
    panel.setAttribute("data-pad", settings.pad && touchDevice ? "on" : "off");   /* arrows: touch screens, if switched on */
    markChoices("mode", settings.mode);
    markChoices("speed", settings.speed);
    markChoices("palette", settings.palette);
    soundBtn.textContent = settings.sound ? "On" : "Off";
    soundBtn.setAttribute("aria-pressed", String(settings.sound));
    padBtn.textContent = settings.pad ? "On" : "Off";
    padBtn.setAttribute("aria-pressed", String(settings.pad));
    padSetting.hidden = !touchDevice;                      /* arrow buttons exist only on touch screens */
    showScore();
  }
  function choose(key, value) {
    settings[key] = value;
    saveSettings();
    applySettings();
  }
  function openSettings(open) {
    settingsBox.hidden = !open;
    settingsBtn.setAttribute("aria-expanded", String(open));
    settingsBtn.textContent = open ? "Close settings" : "Settings";
    if (open && state === "playing") togglePause();        /* pause while adjusting */
  }

  $all("[data-mode]").forEach(function (b) {
    b.addEventListener("click", function () {
      var m = b.getAttribute("data-mode");
      if (m === settings.mode) return;
      choose("mode", m);
      toReady();                                           /* a new mode starts from the start screen */
    });
  });
  $all("[data-speed]").forEach(function (b) {
    b.addEventListener("click", function () { choose("speed", b.getAttribute("data-speed")); });
  });
  $all("[data-palette]").forEach(function (b) {
    var name = b.getAttribute("data-palette");
    b.style.setProperty("--dot", PALETTES[name].lcd);      /* the swatch on each chip */
    b.addEventListener("click", function () { choose("palette", name); });
  });
  soundBtn.addEventListener("click", function () {
    choose("sound", !settings.sound);
    if (settings.sound) { ensureAudio(); beep(660, 80, "square"); }
  });
  padBtn.addEventListener("click", function () { choose("pad", !settings.pad); });
  settingsBtn.addEventListener("click", function () { openSettings(settingsBox.hidden); });

  /* ---- full screen, where the browser allows it ---- */

  fsBtn.hidden = !(panel.requestFullscreen && document.fullscreenEnabled);
  fsBtn.addEventListener("click", function () {
    if (document.fullscreenElement) quiet(document.exitFullscreen());
    else quiet(panel.requestFullscreen());
  });
  document.addEventListener("fullscreenchange", function () {
    var on = document.fullscreenElement === panel;
    fsBtn.setAttribute("aria-label", on ? "Exit full screen" : "Full screen");
    fsBtn.title = on ? "Exit full screen" : "Full screen";
    fsBtn.querySelector(".ico-expand").hidden = on;
    fsBtn.querySelector(".ico-shrink").hidden = !on;
  });

  /* ---- input ---- */

  window.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (KEYMAP.has(key)) {
      e.preventDefault();
      steer(KEYMAP.get(key));
    } else if (key === " " || key === "Enter") {
      if (e.target && e.target.closest && e.target.closest("button, a, input, select, textarea")) return;  /* a focused button keeps its own key */
      e.preventDefault();
      primary();
    } else if (key === "p") {
      togglePause();
    } else if (key === "r") {
      start();
    } else if (key === "Escape" && !settingsBox.hidden) {
      openSettings(false);
    }
  });

  $all("[data-dir]").forEach(function (btn) {
    btn.addEventListener("click", function () { steer(PAD[btn.getAttribute("data-dir")]); });
  });
  veilBtn.addEventListener("click", function () { if (state === "paused") togglePause(); else start(); });
  pauseBtn.addEventListener("click", function () { togglePause(); });
  $("restart").addEventListener("click", function () { start(); });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && state === "playing") togglePause();
  });

  /* Swipe on the board to steer. A short tap does nothing. */
  screenEl.addEventListener("touchstart", function (e) {
    var t = e.changedTouches[0];
    swipeFrom = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  screenEl.addEventListener("touchend", function (e) {
    if (!swipeFrom) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - swipeFrom.x, dy = t.clientY - swipeFrom.y;
    swipeFrom = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? RIGHT : LEFT);
    else steer(dy > 0 ? DOWN : UP);
  }, { passive: true });
  screenEl.addEventListener("touchcancel", function () { swipeFrom = null; });

  /* ---- drawing ---- */

  function setupCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = COLS * CELL * dpr;
    canvas.height = ROWS * CELL * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(now) {
    var W = COLS * CELL, H = ROWS * CELL;
    ctx.globalAlpha = 1;
    ctx.fillStyle = colours.lcd;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = colours.ink;
    ctx.globalAlpha = 0.07;                                /* faint pixel grid */
    for (var i = 1; i < COLS; i++) ctx.fillRect(i * CELL, 0, 1, H);
    for (var j = 1; j < ROWS; j++) ctx.fillRect(0, j * CELL, W, 1);
    ctx.globalAlpha = 1;

    if (food) {                                            /* food breathes gently */
      var beat = reduceMotion ? 0.5 : (Math.sin(now / 180) + 1) / 2;
      ctx.fillStyle = colours.food;
      ctx.beginPath();
      ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * (0.26 + 0.07 * beat), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = colours.ink;                           /* body: joined solid cells */
    snake.forEach(function (p) { ctx.fillRect(p.x * CELL, p.y * CELL, CELL, CELL); });

    var h = snake[0];                                      /* head: two eyes looking ahead */
    var cx = h.x * CELL + CELL / 2, cy = h.y * CELL + CELL / 2;
    var fx = cx + dir.x * 4, fy = cy + dir.y * 4;
    var sx = -dir.y * 4, sy = dir.x * 4;
    ctx.fillStyle = colours.lcd;
    [1, -1].forEach(function (side) {
      ctx.beginPath();
      ctx.arc(fx + sx * side, fy + sy * side, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function frame(now) {
    draw(now);
    requestAnimationFrame(frame);
  }

  /* ---- start ---- */

  setupCanvas();
  applySettings();
  reset();
  showStartVeil();
  syncPause();
  requestAnimationFrame(frame);
})();

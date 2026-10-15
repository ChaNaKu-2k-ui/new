/* Snake game. Movement runs on a timer, drawing runs every frame. Nothing leaves the browser. */
(function () {
  "use strict";

  var COLS = 20, ROWS = 20, CELL = 20;                    /* 20 x 20 grid, 400 x 400 logical pixels */
  var SPEED_START = 140, SPEED_MIN = 60, SPEED_STEP = 3;  /* ms per move; faster as the snake grows */
  var BEST_KEY = "cnk-snake-best";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var touchDevice = window.matchMedia("(pointer: coarse)").matches;

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $("board");
  var ctx = canvas.getContext("2d");
  var screenEl = $("screen");
  var veil = $("veil"), veilTitle = $("veil-title"), veilSub = $("veil-sub"), veilBtn = $("veil-btn");
  var pauseBtn = $("pause");
  var scoreEl = $("score"), bestEl = $("best");

  var UP = { x: 0, y: -1 }, DOWN = { x: 0, y: 1 }, LEFT = { x: -1, y: 0 }, RIGHT = { x: 1, y: 0 };
  var KEYMAP = new Map([
    ["ArrowUp", UP], ["w", UP], ["ArrowDown", DOWN], ["s", DOWN],
    ["ArrowLeft", LEFT], ["a", LEFT], ["ArrowRight", RIGHT], ["d", RIGHT]
  ]);
  var PAD = { up: UP, down: DOWN, left: LEFT, right: RIGHT };

  /* Board colours come from the snake.css tokens, read once. */
  var css = getComputedStyle(document.documentElement);
  var token = function (name) { return css.getPropertyValue(name).trim(); };
  var LCD = token("--snake-lcd"), INK = token("--snake-ink"), FOOD = token("--snake-food");

  var snake, dir, queue, food;
  var score = 0;
  var best = loadBest();
  var state = "ready";            /* ready | playing | paused | over */
  var timer = null;
  var swipeFrom = null;

  function loadBest() {
    try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; }
  }
  function saveBest() {
    try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) { /* storage blocked: keep playing */ }
  }

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
    bestEl.textContent = String(Math.max(best, score));
  }
  function showVeil(title, sub, label) {
    veilTitle.textContent = title;
    veilSub.textContent = sub;
    veilBtn.textContent = label;
    veil.hidden = false;
  }
  function syncPause() {
    pauseBtn.textContent = state === "paused" ? "Resume" : "Pause";
    pauseBtn.disabled = state === "ready" || state === "over";
  }

  function start() {
    clearTimeout(timer);
    reset();
    state = "playing";
    veil.hidden = true;
    syncPause();
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(step, Math.max(SPEED_MIN, SPEED_START - score * SPEED_STEP));
  }

  function step() {
    if (state !== "playing") return;
    if (queue.length) dir = queue.shift();
    var nx = snake[0].x + dir.x, ny = snake[0].y + dir.y;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return finish(false);

    var eats = food !== null && nx === food.x && ny === food.y;
    /* On a normal move the tail leaves its cell, so the head may enter it. */
    var body = eats ? snake : snake.slice(0, -1);
    if (body.some(function (p) { return p.x === nx && p.y === ny; })) return finish(false);

    snake.unshift({ x: nx, y: ny });
    if (eats) {
      score++;
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
    if (score > best) { best = score; saveBest(); }
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
  function primary() {  /* Space or Enter */
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

  window.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (KEYMAP.has(key)) {
      e.preventDefault();
      steer(KEYMAP.get(key));
    } else if (key === " " || key === "Enter") {
      e.preventDefault();
      primary();
    } else if (key === "p") {
      togglePause();
    } else if (key === "r") {
      start();
    }
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-dir]"), function (btn) {
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

  function setupCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = COLS * CELL * dpr;
    canvas.height = ROWS * CELL * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(now) {
    var W = COLS * CELL, H = ROWS * CELL;
    ctx.globalAlpha = 1;
    ctx.fillStyle = LCD;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = INK;
    ctx.globalAlpha = 0.07;                                  /* faint pixel grid */
    for (var i = 1; i < COLS; i++) ctx.fillRect(i * CELL, 0, 1, H);
    for (var j = 1; j < ROWS; j++) ctx.fillRect(0, j * CELL, W, 1);
    ctx.globalAlpha = 1;

    if (food) {                                              /* food breathes gently */
      var beat = reduceMotion ? 0.5 : (Math.sin(now / 180) + 1) / 2;
      ctx.fillStyle = FOOD;
      ctx.beginPath();
      ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * (0.26 + 0.07 * beat), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = INK;                                     /* body: joined solid cells */
    snake.forEach(function (p) { ctx.fillRect(p.x * CELL, p.y * CELL, CELL, CELL); });

    var h = snake[0];                                        /* head: two eyes looking ahead */
    var cx = h.x * CELL + CELL / 2, cy = h.y * CELL + CELL / 2;
    var fx = cx + dir.x * 4, fy = cy + dir.y * 4;
    var sx = -dir.y * 4, sy = dir.x * 4;
    ctx.fillStyle = LCD;
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

  setupCanvas();
  reset();
  showVeil(
    "Snake",
    touchDevice ? "Swipe the board or use the arrow buttons to steer." : "Arrow keys or WASD to steer. Press Enter to start.",
    "Start"
  );
  syncPause();
  requestAnimationFrame(frame);
})();

/* 2048: slide and merge the tiles to reach 2048. Nothing leaves the browser. */
(function () {
  "use strict";

  var SIZE = 4;
  var BEST_KEY = "cnk-2048-best";
  var KEYS = { ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };

  var $ = function (id) { return document.getElementById(id); };
  var boardEl = $("board"), scoreEl = $("score"), bestEl = $("best");
  var veil = $("veil"), veilTitle = $("veil-title"), veilSub = $("veil-sub"), veilBtn = $("veil-btn"), newBtn = $("new-game");

  var cells = [];                    /* 16 numbers, row by row. 0 is an empty cell. */
  var cellEls = [];
  var score = 0, best = loadBest();
  var over = false, blocked = false, keptGoing = false;
  var swipeFrom = null;

  function loadBest() {
    try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; }
  }
  function saveBest() {
    try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) { /* storage blocked: keep playing */ }
  }

  for (var n = 0; n < SIZE * SIZE; n++) {
    var el = document.createElement("div");
    el.className = "t2048-cell";
    boardEl.appendChild(el);
    cellEls.push(el);
  }

  function spawn() {
    var empty = [];
    for (var i = 0; i < cells.length; i++) if (cells[i] === 0) empty.push(i);
    if (empty.length === 0) return -1;
    var at = empty[Math.floor(Math.random() * empty.length)];
    cells[at] = Math.random() < 0.9 ? 2 : 4;
    return at;
  }

  /* Slide one line toward its front (index 0). Equal neighbours merge once per move. */
  function slideLine(vals) {
    var list = vals.filter(function (v) { return v !== 0; });
    var out = [], gained = 0;
    for (var i = 0; i < list.length; i++) {
      if (i + 1 < list.length && list[i] === list[i + 1]) {
        out.push(list[i] * 2);
        gained += list[i] * 2;
        i++;
      } else {
        out.push(list[i]);
      }
    }
    while (out.length < SIZE) out.push(0);
    return { vals: out, gained: gained };
  }

  /* Cell indexes of line k, listed from the wall that the line slides toward. */
  function lineIndexes(dir, k) {
    var out = [];
    for (var j = 0; j < SIZE; j++) {
      var p = (dir === "right" || dir === "down") ? SIZE - 1 - j : j;
      out.push(dir === "left" || dir === "right" ? k * SIZE + p : p * SIZE + k);
    }
    return out;
  }

  function slide(dir) {
    var moved = false, gained = 0;
    for (var k = 0; k < SIZE; k++) {
      var idx = lineIndexes(dir, k);
      var before = idx.map(function (i) { return cells[i]; });
      var res = slideLine(before);
      for (var m = 0; m < SIZE; m++) {
        if (res.vals[m] !== before[m]) moved = true;
        cells[idx[m]] = res.vals[m];
      }
      gained += res.gained;
    }
    return { moved: moved, gained: gained };
  }

  function canMove() {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var v = cells[r * SIZE + c];
        if (v === 0) return true;
        if (c + 1 < SIZE && v === cells[r * SIZE + c + 1]) return true;
        if (r + 1 < SIZE && v === cells[(r + 1) * SIZE + c]) return true;
      }
    }
    return false;
  }

  function render(newAt) {
    for (var i = 0; i < cells.length; i++) {
      var v = cells[i];
      var cls = "t2048-cell";
      if (v) cls += v > 2048 ? " vbig" : " v" + v;
      if (i === newAt) cls += " pop";
      cellEls[i].className = cls;
      cellEls[i].textContent = v ? String(v) : "";
    }
    scoreEl.textContent = String(score);
    bestEl.textContent = String(best);
  }

  function showVeil(title, sub, label) {
    veilTitle.textContent = title;
    veilSub.textContent = sub;
    veilBtn.textContent = label;
    veil.hidden = false;
  }

  function play(dir) {
    if (over || blocked) return;
    var res = slide(dir);
    if (!res.moved) return;
    score += res.gained;
    if (score > best) { best = score; saveBest(); }
    var at = spawn();
    render(at);
    if (!keptGoing && cells.indexOf(2048) !== -1) {
      blocked = true;
      showVeil("You reached 2048!", "Keep going to see how far you can get, or start a new game.", "Keep going");
      return;
    }
    if (!canMove()) {
      over = true;
      showVeil("Game over", "Score " + score + ". Press New game to try again.", "New game");
    }
  }

  function newGame() {
    cells = [];
    for (var i = 0; i < SIZE * SIZE; i++) cells.push(0);
    score = 0; over = false; blocked = false; keptGoing = false;
    spawn();
    var at = spawn();
    veil.hidden = true;
    render(at);
  }

  veilBtn.addEventListener("click", function () {
    if (over) { newGame(); return; }
    keptGoing = true;
    blocked = false;
    veil.hidden = true;
  });
  newBtn.addEventListener("click", newGame);

  function has(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }
  window.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!has(KEYS, key)) return;
    e.preventDefault();
    play(KEYS[key]);
  });

  /* Swipe on the board. A short tap does nothing. */
  boardEl.addEventListener("touchstart", function (e) {
    var t = e.changedTouches[0];
    swipeFrom = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  boardEl.addEventListener("touchend", function (e) {
    if (!swipeFrom) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - swipeFrom.x, dy = t.clientY - swipeFrom.y;
    swipeFrom = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) play(dx > 0 ? "right" : "left");
    else play(dy > 0 ? "down" : "up");
  }, { passive: true });
  boardEl.addEventListener("touchcancel", function () { swipeFrom = null; });

  newGame();
})();

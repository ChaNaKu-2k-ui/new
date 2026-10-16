/* 2048: slide and merge the tiles to reach 2048. Nothing leaves the browser. */
(function () {
  "use strict";

  var SIZE = 4;
  var BEST_KEY = "cnk-2048-best", SETTINGS_KEY = "cnk-2048-settings";
  var KEYS = { ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };
  var has = function (obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); };

  var $ = function (id) { return document.getElementById(id); };
  var $all = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  var panel = $("game"), boardEl = $("board"), scoreEl = $("score"), bestEl = $("best"), statusEl = $("status");
  var veil = $("veil"), veilTitle = $("veil-title"), veilSub = $("veil-sub"), veilBtn = $("veil-btn"), newBtn = $("new-game");
  var fsBtn = $("fullscreen"), settingsBtn = $("settings-toggle"), settingsBox = $("settings");
  var soundBtn = $("sound"), padBtn = $("pad-toggle"), padSetting = $("pad-setting");

  var settings = CNKGame.load(SETTINGS_KEY, { sound: true, pad: true });
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
  function sound(freq, ms, type) { CNKGame.beep(settings.sound, freq, ms, type); }

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

  function showVeil(title, sub, buttonText) {
    veilTitle.textContent = title;
    veilSub.textContent = sub;
    veilBtn.textContent = buttonText;
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
      sound(880, 240, "triangle");
      showVeil("You reached 2048!", "Keep going to see how far you can get, or start a new game.", "Keep going");
      return;
    }
    if (!canMove()) {
      over = true;
      sound(196, 360, "sawtooth");
      showVeil("Game over", "Score " + score + ". Press New game to try again.", "New game");
      return;
    }
    sound(330, 45, "triangle");
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

  /* The hint under the board says how to play on this screen. */
  function hint() {
    if (!CNKGame.touch) return "Use the arrow keys or W, A, S and D, or swipe on the board.";
    return settings.pad ? "Swipe the board or use the arrow buttons." : "Swipe the board to slide the tiles.";
  }
  function markSwitch(btn, on) {
    btn.textContent = on ? "On" : "Off";
    btn.setAttribute("aria-pressed", String(on));
  }
  function applySettings() {
    panel.setAttribute("data-pad", settings.pad && CNKGame.touch ? "on" : "off");   /* arrow buttons: touch screens, if switched on */
    padSetting.hidden = !CNKGame.touch;
    markSwitch(soundBtn, settings.sound);
    markSwitch(padBtn, settings.pad);
    statusEl.textContent = hint();
  }

  veilBtn.addEventListener("click", function () {
    if (over) { newGame(); return; }
    keptGoing = true;
    blocked = false;
    veil.hidden = true;
  });
  newBtn.addEventListener("click", newGame);

  soundBtn.addEventListener("click", function () {
    settings.sound = !settings.sound;
    CNKGame.save(SETTINGS_KEY, settings);
    applySettings();
    sound(660, 80, "square");
  });
  padBtn.addEventListener("click", function () {
    settings.pad = !settings.pad;
    CNKGame.save(SETTINGS_KEY, settings);
    applySettings();
  });
  settingsBtn.addEventListener("click", function () {
    var open = settingsBox.hidden;
    settingsBox.hidden = !open;
    settingsBtn.setAttribute("aria-expanded", String(open));
    settingsBtn.textContent = open ? "Close settings" : "Settings";
  });

  CNKGame.fullscreen(panel, fsBtn);

  window.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!has(KEYS, key)) return;
    e.preventDefault();
    play(KEYS[key]);
  });

  $all("[data-dir]").forEach(function (btn) {
    btn.addEventListener("click", function () { play(btn.getAttribute("data-dir")); });
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

  applySettings();
  newGame();
})();

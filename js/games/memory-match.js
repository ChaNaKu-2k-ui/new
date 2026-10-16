/* Memory match: flip two cards at a time and find every pair. Nothing leaves the browser. */
(function () {
  "use strict";

  var LEVELS = { easy: { cols: 4, rows: 3 }, normal: { cols: 4, rows: 4 }, hard: { cols: 6, rows: 4 } };
  var ORDER = ["easy", "normal", "hard"];                 /* the order the levels are played in */
  var THEMES = {                                          /* card faces: 12 each, enough for the largest board */
    fruit: ["🍎", "🍌", "🍇", "🍓", "🍒", "🍍", "🥭", "🍉", "🍋", "🥝", "🍑", "🍐"],
    animals: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮"],
    space: ["🌍", "🌙", "⭐", "🌟", "🌠", "🌕", "🪐", "🚀", "🛸", "🌌", "🔭", "👽"]
  };
  var BEST_KEY = "cnk-memory-best", SETTINGS_KEY = "cnk-memory-settings";
  var HIDE_DELAY = 800;                                   /* ms a mismatched pair stays face up */
  var has = function (obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); };

  var $ = function (id) { return document.getElementById(id); };
  var $all = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  var panel = $("game"), fsBtn = $("fullscreen");
  var gridEl = $("grid"), statusEl = $("status"), newBtn = $("new-game");
  var movesEl = $("moves"), timeEl = $("time"), bestEl = $("best");
  var veil = $("veil"), veilTitle = $("veil-title"), veilSub = $("veil-sub"), veilBtn = $("veil-btn");
  var settingsBtn = $("settings-toggle"), settingsBox = $("settings"), soundBtn = $("sound");

  var settings = CNKGame.load(SETTINGS_KEY, { sound: true, theme: "fruit" });
  if (!has(THEMES, settings.theme)) settings.theme = "fruit";
  var level = "normal";
  var bests = loadBests();                                /* best time in seconds, per board size */
  var cards = [], buttons = [];
  var pairs = 0, matched = 0, moves = 0, first = null, lock = false, finished = false;
  var gameId = 0, startedAt = 0, elapsed = 0, ticker = null;

  function loadBests() {
    try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveBests() {
    try { localStorage.setItem(BEST_KEY, JSON.stringify(bests)); } catch (e) { /* storage blocked: keep playing */ }
  }
  function fmt(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }
  function setStatus(text) { statusEl.textContent = text; }
  function sound(freq, ms, type) { CNKGame.beep(settings.sound, freq, ms, type); }
  function showVeil(title, sub, buttonText) {
    veilTitle.textContent = title;
    veilSub.textContent = sub;
    veilBtn.textContent = buttonText;
    veil.hidden = false;
  }
  function markChoices(attr, value) {
    $all("[data-" + attr + "]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-" + attr) === value));
    });
  }
  function applySettings() {
    markChoices("faces", settings.theme);
    soundBtn.textContent = settings.sound ? "On" : "Off";
    soundBtn.setAttribute("aria-pressed", String(settings.sound));
  }

  function showStats() {
    movesEl.textContent = String(moves);
    timeEl.textContent = fmt(elapsed);
    bestEl.textContent = bests[level] == null ? "–" : fmt(bests[level]);
  }

  function startTimer() {
    startedAt = Date.now();
    ticker = setInterval(function () {
      elapsed = Math.floor((Date.now() - startedAt) / 1000);
      timeEl.textContent = fmt(elapsed);
    }, 250);
  }
  function stopTimer() {
    clearInterval(ticker);
    ticker = null;
    if (startedAt) elapsed = Math.floor((Date.now() - startedAt) / 1000);
  }

  function newGame() {
    gameId++;
    stopTimer();
    var lv = LEVELS[level];
    pairs = lv.cols * lv.rows / 2;
    matched = 0; moves = 0; first = null; lock = false; finished = false;
    startedAt = 0; elapsed = 0;
    var faces = THEMES[settings.theme].slice(0, pairs);
    cards = shuffle(faces.concat(faces)).map(function (sym) {
      return { sym: sym, open: false, matched: false };
    });
    veil.hidden = true;
    gridEl.style.setProperty("--cols", String(lv.cols));
    gridEl.innerHTML = "";
    buttons = cards.map(function (_, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mm-card";
      b.setAttribute("aria-label", "Card " + (i + 1) + ", face down");
      b.addEventListener("click", function () { flip(i); });
      gridEl.appendChild(b);
      return b;
    });
    setStatus("Find the matching pairs. The timer starts with your first flip.");
    showStats();
  }

  /* The symbol is only written into the page while the card is face up. */
  function show(i, on) {
    var c = cards[i], b = buttons[i];
    c.open = on;
    b.classList.toggle("is-open", on);
    b.textContent = on ? c.sym : "";
    b.setAttribute("aria-label", "Card " + (i + 1) + (on ? ", " + c.sym : ", face down"));
  }

  function flip(i) {
    var c = cards[i];
    if (lock || finished || c.open || c.matched) return;
    if (!startedAt) startTimer();
    show(i, true);
    if (first === null) { first = i; sound(520, 70, "triangle"); return; }

    var other = first;
    first = null;
    moves++;
    if (cards[other].sym === c.sym) {
      cards[other].matched = true;
      c.matched = true;
      buttons[other].classList.add("is-match");
      buttons[i].classList.add("is-match");
      buttons[other].disabled = true;
      buttons[i].disabled = true;
      matched++;
      showStats();
      if (matched === pairs) win();
      else sound(880, 140, "triangle");
      return;
    }

    showStats();
    sound(196, 160, "sawtooth");
    lock = true;
    var gen = gameId;
    setTimeout(function () {
      if (gen !== gameId) return;                         /* a new game started in the meantime */
      show(other, false);
      show(i, false);
      lock = false;
    }, HIDE_DELAY);
  }

  /* All pairs found: record the time, then show the result over the board. */
  function win() {
    finished = true;
    stopTimer();
    var isBest = bests[level] == null || elapsed < bests[level];
    if (isBest) { bests[level] = elapsed; saveBests(); }
    var lastLevel = ORDER[ORDER.length - 1] === level;
    var sub = "Done in " + fmt(elapsed) + " with " + moves + " moves." + (isBest ? " New best time for this board size." : "");
    setStatus("All pairs found.");
    showStats();
    if (lastLevel) showVeil("All levels cleared!", sub, "Play again");
    else showVeil("Level cleared!", sub, "Next level");
    [660, 880, 1100].forEach(function (freq, k) {
      setTimeout(function () { sound(freq, 140, "triangle"); }, k * 130);
    });
  }

  /* Next level after a win; after Hard, the same board is played again. */
  veilBtn.addEventListener("click", function () {
    var at = ORDER.indexOf(level);
    if (at < ORDER.length - 1) {
      level = ORDER[at + 1];
      markChoices("level", level);
    }
    newGame();
  });

  $all("[data-level]").forEach(function (b) {
    b.addEventListener("click", function () {
      level = b.getAttribute("data-level");
      markChoices("level", level);
      newGame();
    });
  });
  $all("[data-faces]").forEach(function (b) {
    b.addEventListener("click", function () {
      settings.theme = b.getAttribute("data-faces");
      CNKGame.save(SETTINGS_KEY, settings);
      applySettings();
      newGame();                                          /* new faces: the board starts again */
    });
  });
  soundBtn.addEventListener("click", function () {
    settings.sound = !settings.sound;
    CNKGame.save(SETTINGS_KEY, settings);
    applySettings();
    CNKGame.beep(settings.sound, 660, 80, "square");
  });
  settingsBtn.addEventListener("click", function () {
    var open = settingsBox.hidden;
    settingsBox.hidden = !open;
    settingsBtn.setAttribute("aria-expanded", String(open));
    settingsBtn.textContent = open ? "Close settings" : "Settings";
  });
  newBtn.addEventListener("click", newGame);

  CNKGame.fullscreen(panel, fsBtn);
  applySettings();
  markChoices("level", level);
  newGame();
})();

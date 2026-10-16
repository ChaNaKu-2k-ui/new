/* Memory match: flip two cards at a time and find every pair. Nothing leaves the browser. */
(function () {
  "use strict";

  var LEVELS = { easy: { cols: 4, rows: 3 }, normal: { cols: 4, rows: 4 }, hard: { cols: 6, rows: 4 } };
  var SYMBOLS = ["🍎", "🍌", "🍇", "🍓", "🍒", "🍍", "🥭", "🍉", "🍋", "🥝", "🍑", "🍐"];
  var BEST_KEY = "cnk-memory-best";
  var HIDE_DELAY = 800;                                   /* ms a mismatched pair stays face up */

  var $ = function (id) { return document.getElementById(id); };
  var gridEl = $("grid"), statusEl = $("status"), newBtn = $("new-game");
  var movesEl = $("moves"), timeEl = $("time"), bestEl = $("best");
  var levelChips = Array.prototype.slice.call(document.querySelectorAll("[data-level]"));

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
    cards = shuffle(SYMBOLS.slice(0, pairs).concat(SYMBOLS.slice(0, pairs))).map(function (sym) {
      return { sym: sym, open: false, matched: false };
    });
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
    if (first === null) { first = i; return; }

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
      return;
    }

    showStats();
    lock = true;
    var gen = gameId;
    setTimeout(function () {
      if (gen !== gameId) return;                         /* a new game started in the meantime */
      show(other, false);
      show(i, false);
      lock = false;
    }, HIDE_DELAY);
  }

  function win() {
    finished = true;
    stopTimer();
    var isBest = bests[level] == null || elapsed < bests[level];
    if (isBest) { bests[level] = elapsed; saveBests(); }
    setStatus("Done in " + fmt(elapsed) + " with " + moves + " moves." + (isBest ? " New best time for this board size." : ""));
    showStats();
  }

  function markLevel() {
    levelChips.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-level") === level));
    });
  }
  levelChips.forEach(function (b) {
    b.addEventListener("click", function () {
      level = b.getAttribute("data-level");
      markLevel();
      newGame();
    });
  });
  newBtn.addEventListener("click", newGame);

  markLevel();
  newGame();
})();

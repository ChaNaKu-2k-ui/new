/* Tic-tac-toe against the computer. Easy plays random moves; Hard looks ahead and never loses. Nothing leaves the browser. */
(function () {
  "use strict";

  var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  var RECORD_KEY = "cnk-ttt-record", SETTINGS_KEY = "cnk-ttt-settings";
  var THINK_MS = 350;                                     /* the computer's pause before each move */

  var $ = function (id) { return document.getElementById(id); };
  var $all = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  var panel = $("game"), fsBtn = $("fullscreen");
  var boardEl = $("board"), statusEl = $("status"), newBtn = $("new-round");
  var recYou = $("rec-you"), recComputer = $("rec-computer"), recDraws = $("rec-draws");
  var veil = $("veil"), veilTitle = $("veil-title"), veilSub = $("veil-sub"), veilBtn = $("veil-btn");
  var settingsBtn = $("settings-toggle"), settingsBox = $("settings"), soundBtn = $("sound");

  var settings = CNKGame.load(SETTINGS_KEY, { sound: true, first: "you" });
  if (settings.first !== "you" && settings.first !== "computer") settings.first = "you";
  var level = "hard";
  var record = loadRecord();
  var you = "X", cpu = "O";                               /* marks for this round: whoever goes first plays X */
  var board = [], cellEls = [];
  var busy = false, over = false, round = 0;

  function loadRecord() {
    try {
      var saved = JSON.parse(localStorage.getItem(RECORD_KEY)) || {};
      return { you: Number(saved.you) || 0, computer: Number(saved.computer) || 0, draws: Number(saved.draws) || 0 };
    } catch (e) { return { you: 0, computer: 0, draws: 0 }; }
  }
  function saveRecord() {
    try { localStorage.setItem(RECORD_KEY, JSON.stringify(record)); } catch (e) { /* storage blocked: keep playing */ }
  }
  function showRecord() {
    recYou.textContent = String(record.you);
    recComputer.textContent = String(record.computer);
    recDraws.textContent = String(record.draws);
  }
  function setStatus(text) { statusEl.textContent = text; }
  function sound(freq, ms, type) { CNKGame.beep(settings.sound, freq, ms, type); }
  function label(i, mark) {
    return "Row " + (Math.floor(i / 3) + 1) + ", column " + (i % 3 + 1) + (mark ? ", " + mark : ", empty");
  }
  function showVeil(title, sub) {
    veilTitle.textContent = title;
    veilSub.textContent = sub;
    veilBtn.textContent = "Next round";
    veil.hidden = false;
  }
  function markChoices(attr, value) {
    $all("[data-" + attr + "]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-" + attr) === value));
    });
  }
  function applySettings() {
    markChoices("first", settings.first);
    soundBtn.textContent = settings.sound ? "On" : "Off";
    soundBtn.setAttribute("aria-pressed", String(settings.sound));
  }

  for (var c = 0; c < 9; c++) {
    var cell = document.createElement("button");
    cell.type = "button";
    cell.className = "ttt-cell";
    cell.setAttribute("aria-label", label(c, ""));
    cell.addEventListener("click", (function (index) {
      return function () { humanMove(index); };
    })(c));
    boardEl.appendChild(cell);
    cellEls.push(cell);
  }

  function lineWinner(b) {
    for (var k = 0; k < LINES.length; k++) {
      var l = LINES[k], a = b[l[0]];
      if (a && a === b[l[1]] && a === b[l[2]]) return { mark: a, line: l };
    }
    return null;
  }

  /* Minimax: the computer maximises and the player minimises. A quicker win scores higher. */
  function minimax(b, toMove, depth) {
    var w = lineWinner(b);
    if (w) return w.mark === cpu ? 10 - depth : depth - 10;
    if (b.indexOf("") === -1) return 0;
    var best = toMove === cpu ? -Infinity : Infinity;
    for (var i = 0; i < 9; i++) {
      if (b[i] !== "") continue;
      b[i] = toMove;
      var score = minimax(b, toMove === cpu ? you : cpu, depth + 1);
      b[i] = "";
      best = toMove === cpu ? Math.max(best, score) : Math.min(best, score);
    }
    return best;
  }

  function hardMove(b) {
    if (b.join("") === "") return 4;                      /* the centre is always a strong opening */
    var bestScore = -Infinity, pick = -1;
    for (var i = 0; i < 9; i++) {
      if (b[i] !== "") continue;
      b[i] = cpu;
      var score = minimax(b, you, 1);
      b[i] = "";
      if (score > bestScore) { bestScore = score; pick = i; }
    }
    return pick;
  }

  function easyMove(b) {
    var free = [];
    for (var i = 0; i < 9; i++) if (b[i] === "") free.push(i);
    return free[Math.floor(Math.random() * free.length)];
  }

  function syncCells() {
    for (var i = 0; i < 9; i++) cellEls[i].disabled = over || busy || board[i] !== "";
  }

  function place(i, mark) {
    board[i] = mark;
    cellEls[i].textContent = mark;
    cellEls[i].className = "ttt-cell is-" + mark.toLowerCase();
    cellEls[i].setAttribute("aria-label", label(i, mark));
    sound(mark === you ? 660 : 440, 90, "square");
    syncCells();
  }

  /* Returns true when the round has ended. Records the result and shows it over the board. */
  function checkEnd() {
    var w = lineWinner(board);
    if (!w && board.indexOf("") !== -1) return false;
    over = true;
    busy = false;
    syncCells();
    var result = "draws";
    if (w) {
      result = w.mark === you ? "you" : "computer";
      w.line.forEach(function (i) { cellEls[i].classList.add("is-win"); });
    }
    record[result]++;
    saveRecord();
    showRecord();
    setStatus("Round over.");
    if (result === "you") {
      sound(880, 240, "triangle");
      showVeil("You win!", "You got three in a row.");
    } else if (result === "computer") {
      sound(196, 360, "sawtooth");
      showVeil("The computer wins", "It got three in a row first.");
    } else {
      sound(440, 200, "triangle");
      showVeil("It's a draw", "The board is full with no winner.");
    }
    return true;
  }

  function computerTurn() {
    busy = true;
    syncCells();
    setStatus("The computer is thinking…");
    var gen = round;
    setTimeout(function () {
      if (gen !== round) return;                          /* a new round started in the meantime */
      place(level === "hard" ? hardMove(board) : easyMove(board), cpu);
      if (checkEnd()) return;
      busy = false;
      syncCells();
      setStatus("Your turn. You are " + you + ".");
    }, THINK_MS);
  }

  function humanMove(i) {
    if (busy || over || board[i] !== "") return;
    place(i, you);
    if (checkEnd()) return;
    computerTurn();
  }

  /* The first player is always X. "Who goes first" in Settings applies from the next round. */
  function newRound() {
    round++;
    board = ["", "", "", "", "", "", "", "", ""];
    busy = false;
    over = false;
    you = settings.first === "computer" ? "O" : "X";
    cpu = you === "X" ? "O" : "X";
    veil.hidden = true;
    for (var i = 0; i < 9; i++) {
      cellEls[i].textContent = "";
      cellEls[i].className = "ttt-cell";
      cellEls[i].setAttribute("aria-label", label(i, ""));
    }
    syncCells();
    if (cpu === "X") computerTurn();                      /* the computer opens */
    else setStatus("Your turn. You are " + you + ".");
  }

  $all("[data-level]").forEach(function (b) {
    b.addEventListener("click", function () {
      level = b.getAttribute("data-level");
      markChoices("level", level);
      newRound();
    });
  });
  $all("[data-first]").forEach(function (b) {
    b.addEventListener("click", function () {
      settings.first = b.getAttribute("data-first");
      CNKGame.save(SETTINGS_KEY, settings);
      applySettings();
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
  veilBtn.addEventListener("click", newRound);
  newBtn.addEventListener("click", newRound);

  CNKGame.fullscreen(panel, fsBtn);
  markChoices("level", level);
  applySettings();
  showRecord();
  newRound();
})();

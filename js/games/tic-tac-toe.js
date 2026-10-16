/* Tic-tac-toe against the computer. Easy plays random moves; Hard looks ahead and never loses. Nothing leaves the browser. */
(function () {
  "use strict";

  var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  var RECORD_KEY = "cnk-ttt-record";

  var $ = function (id) { return document.getElementById(id); };
  var boardEl = $("board"), statusEl = $("status"), newBtn = $("new-round");
  var recYou = $("rec-you"), recComputer = $("rec-computer"), recDraws = $("rec-draws");
  var levelChips = Array.prototype.slice.call(document.querySelectorAll("[data-level]"));

  var level = "hard";
  var record = loadRecord();
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
  function label(i, mark) {
    return "Row " + (Math.floor(i / 3) + 1) + ", column " + (i % 3 + 1) + (mark ? ", " + mark : ", empty");
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

  /* Minimax: the computer ("O") maximises and the player ("X") minimises. A quicker win scores higher. */
  function minimax(b, toMove, depth) {
    var w = lineWinner(b);
    if (w) return w.mark === "O" ? 10 - depth : depth - 10;
    if (b.indexOf("") === -1) return 0;
    var best = toMove === "O" ? -Infinity : Infinity;
    for (var i = 0; i < 9; i++) {
      if (b[i] !== "") continue;
      b[i] = toMove;
      var score = minimax(b, toMove === "O" ? "X" : "O", depth + 1);
      b[i] = "";
      best = toMove === "O" ? Math.max(best, score) : Math.min(best, score);
    }
    return best;
  }

  function hardMove(b) {
    var bestScore = -Infinity, pick = -1;
    for (var i = 0; i < 9; i++) {
      if (b[i] !== "") continue;
      b[i] = "O";
      var score = minimax(b, "X", 1);
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
    syncCells();
  }

  /* Returns true when the round has ended, and records the result. */
  function checkEnd() {
    var w = lineWinner(board);
    if (!w && board.indexOf("") !== -1) return false;
    over = true;
    busy = false;
    syncCells();
    var result = "draws";
    if (w) {
      result = w.mark === "X" ? "you" : "computer";
      w.line.forEach(function (i) { cellEls[i].classList.add("is-win"); });
    }
    record[result]++;
    saveRecord();
    showRecord();
    if (!w) setStatus("A draw. Press New round to play again.");
    else if (w.mark === "X") setStatus("You win! Press New round to play again.");
    else setStatus("The computer wins. Press New round to try again.");
    return true;
  }

  function humanMove(i) {
    if (busy || over || board[i] !== "") return;
    place(i, "X");
    if (checkEnd()) return;
    busy = true;
    syncCells();
    setStatus("The computer is thinking…");
    var gen = round;
    setTimeout(function () {
      if (gen !== round) return;                          /* a new round started in the meantime */
      place(level === "hard" ? hardMove(board) : easyMove(board), "O");
      if (checkEnd()) return;
      busy = false;
      syncCells();
      setStatus("Your turn. You are X.");
    }, 350);
  }

  function newRound() {
    round++;
    board = ["", "", "", "", "", "", "", "", ""];
    busy = false;
    over = false;
    for (var i = 0; i < 9; i++) {
      cellEls[i].textContent = "";
      cellEls[i].className = "ttt-cell";
      cellEls[i].setAttribute("aria-label", label(i, ""));
    }
    syncCells();
    setStatus("Your turn. You are X.");
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
      newRound();
    });
  });
  newBtn.addEventListener("click", newRound);

  markLevel();
  showRecord();
  newRound();
})();

(function () {
  var $ = CNK.$, st = $("status"), list = $("winners");
  function entries() {
    var lines = $("names").value.split(/\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if ($("dedupe").checked) {
      var seen = new Set();
      lines = lines.filter(function (l) { var k = l.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    }
    return lines;
  }
  function count() { $("entries").textContent = entries().length; }
  function pick() {
    var pool = entries(), n = Math.max(1, parseInt($("n").value, 10) || 1);
    list.innerHTML = "";
    if (!pool.length) { CNK.status(st, "Add at least one entry first.", "err"); return; }
    if (n > pool.length) { n = pool.length; $("n").value = n; }
    for (var i = 0; i < n; i++) {
      var j = i + CNK.randInt(pool.length - i), t = pool[i]; pool[i] = pool[j]; pool[j] = t;
      var li = document.createElement("li"); li.textContent = (i + 1) + ". " + pool[i]; list.appendChild(li);
    }
    CNK.status(st, n + (n === 1 ? " winner" : " winners") + " drawn from " + entries().length + " entries.", "ok");
  }
  $("names").addEventListener("input", count);
  $("dedupe").addEventListener("change", count);
  $("pick").addEventListener("click", pick);
  count();
})();

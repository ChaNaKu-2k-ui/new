(function () {
  var $ = CNK.$;
  var input = $("text"), keys = $("keywords");
  var stop = new Set("the and for are but not you all can had her was one our out has have this that with from they will been were your what when which their there about would these other into than then them some more also just like very over only".split(" "));

  function update() {
    var t = input.value, trimmed = t.trim();
    var words = trimmed ? trimmed.split(/\s+/) : [];
    var sentences = trimmed ? trimmed.split(/[.!?\u0DF4]+(?:\s|$)/).filter(function (s) { return s.trim(); }).length : 0;
    var paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter(function (s) { return s.trim(); }).length : 0;
    $("w").textContent = words.length;
    $("c").textContent = t.length;
    $("cn").textContent = t.replace(/\s/g, "").length;
    $("s").textContent = sentences;
    $("p").textContent = paragraphs;
    var mins = words.length / 200;
    $("rt").textContent = words.length === 0 ? "0 min" : mins < 1 ? "<1 min" : Math.round(mins) + " min";

    var freq = {};
    words.forEach(function (w) {
      w = w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
      if (w.length < 3 || stop.has(w) || /^\d+$/.test(w)) return;
      freq[w] = (freq[w] || 0) + 1;
    });
    var top = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a] || a.localeCompare(b); }).slice(0, 8);
    keys.innerHTML = top.length
      ? top.map(function (w) { return "<li><b></b> <span class=\"muted\"></span></li>"; }).join("")
      : "";
    Array.prototype.forEach.call(keys.children, function (li, i) {
      li.firstChild.textContent = top[i];
      li.lastChild.textContent = "\u00d7 " + freq[top[i]];
    });
    $("kw-wrap").hidden = top.length === 0;
  }
  input.addEventListener("input", update);
  $("clear").addEventListener("click", function () { input.value = ""; update(); input.focus(); });
  update();
})();

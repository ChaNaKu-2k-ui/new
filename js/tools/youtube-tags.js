(function () {
  var $ = CNK.$, st = $("status"), LIMIT = 500;
  var input = $("raw"), out = $("tags"), tagsOut = [];
  function parse() {
    var seen = new Set(), res = [];
    input.value.split(/[,\n]+/).forEach(function (t) {
      t = t.trim().replace(/^#+/, "").replace(/\s+/g, " ").trim();
      if ($("lower").checked) t = t.toLowerCase();
      var k = t.toLowerCase();
      if (!t || seen.has(k)) return;
      seen.add(k); res.push(t);
    });
    return res;
  }
  /* commas between tags, plus 2 for quotes around tags that contain a space */
  function size(arr) {
    return arr.reduce(function (n, t) { return n + t.length + (t.indexOf(" ") > -1 ? 2 : 0); }, 0) + Math.max(0, arr.length - 1);
  }
  function update() {
    tagsOut = parse();
    var n = size(tagsOut);
    out.textContent = tagsOut.join(", ");
    $("count").textContent = tagsOut.length;
    $("chars").textContent = n + " / " + LIMIT;
    $("chars").style.color = n > LIMIT ? "var(--danger)" : "";
    $("trim").disabled = n <= LIMIT;
    var tags = tagsOut.map(function (t) { return "#" + t.replace(/[^\p{L}\p{N}_]+/gu, ""); }).filter(function (t) { return t.length > 1; });
    $("hash").textContent = tags.slice(0, 15).join(" ");
    CNK.status(st, n > LIMIT ? "Over the limit by " + (n - LIMIT) + " characters. Use \"Trim to fit\" to drop tags from the end." : "", n > LIMIT ? "err" : "");
  }
  input.addEventListener("input", update);
  $("lower").addEventListener("change", update);
  $("trim").addEventListener("click", function () {
    var arr = parse();
    while (arr.length && size(arr) > LIMIT) arr.pop();
    input.value = arr.join(", "); update();
  });
  $("copy-tags").addEventListener("click", function () { if (out.textContent) CNK.copy(out.textContent, st); });
  $("copy-hash").addEventListener("click", function () { if ($("hash").textContent) CNK.copy($("hash").textContent, st); });
  update();
})();

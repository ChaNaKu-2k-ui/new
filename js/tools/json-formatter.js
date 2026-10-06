(function () {
  var $ = CNK.$, input = $("json"), out = $("out"), st = $("status");
  function sortKeys(v) {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === "object") { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = sortKeys(v[k]); }); return o; }
    return v;
  }
  function describe(err, text) {
    var m = /position (\d+)/.exec(err.message), msg = err.message;
    if (m && !/line \d+/i.test(msg)) {
      var pos = +m[1], before = text.slice(0, pos), line = before.split("\n").length, col = pos - before.lastIndexOf("\n");
      msg += " (line " + line + ", column " + col + ")";
    }
    return msg;
  }
  function run(kind) {
    var text = input.value;
    if (!text.trim()) { out.textContent = ""; CNK.status(st, "Paste some JSON first."); return; }
    try {
      var data = JSON.parse(text);
      if ($("sort").checked) data = sortKeys(data);
      out.textContent = kind === "min" ? JSON.stringify(data) : JSON.stringify(data, null, +$("indent").value);
      CNK.status(st, "Valid JSON.", "ok");
    } catch (e) {
      out.textContent = "";
      CNK.status(st, "Invalid JSON: " + describe(e, text), "err");
    }
  }
  $("format").addEventListener("click", function () { run("fmt"); });
  $("minify").addEventListener("click", function () { run("min"); });
  $("copy").addEventListener("click", function () { if (out.textContent) CNK.copy(out.textContent, st); });
})();

(function () {
  var $ = CNK.$, input = $("text"), out = $("out"), st = $("status");
  function words(s) {
    return s.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  }
  var cap = function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); };
  var modes = {
    upper: function (s) { return s.toUpperCase(); },
    lower: function (s) { return s.toLowerCase(); },
    title: function (s) { return s.toLowerCase().replace(/(^|[\s\-(\["'])(\p{L})/gu, function (m, a, b) { return a + b.toUpperCase(); }); },
    sentence: function (s) { return s.toLowerCase().replace(/(^\s*|[.!?]\s+|\n\s*)(\p{L})/gu, function (m, a, b) { return a + b.toUpperCase(); }); },
    camel: function (s) { var w = words(s).map(function (x) { return x.toLowerCase(); }); return w.map(function (x, i) { return i ? cap(x) : x; }).join(""); },
    snake: function (s) { return words(s).map(function (x) { return x.toLowerCase(); }).join("_"); },
    kebab: function (s) { return words(s).map(function (x) { return x.toLowerCase(); }).join("-"); }
  };
  var last = "upper";
  function run(mode) { last = mode || last; out.textContent = modes[last](input.value); CNK.status(st, ""); }
  document.getElementById("modes").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-mode]"); if (b) run(b.dataset.mode);
  });
  input.addEventListener("input", function () { run(); });
  $("copy").addEventListener("click", function () { if (out.textContent) CNK.copy(out.textContent, st); });
  run();
})();

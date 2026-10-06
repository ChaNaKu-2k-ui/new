(function () {
  var $ = CNK.$, st = $("status");
  var sets = {
    lower: "abcdefghijklmnopqrstuvwxyz",
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    digits: "0123456789",
    symbols: "!@#$%^&*()-_=+[]{};:,.?/~"
  };
  var similar = /[O0oIl1|]/g;
  var len = $("len"), pw = $("pw"), bar = $("bar"), label = $("strength");

  function pools() {
    var chosen = [];
    ["lower", "upper", "digits", "symbols"].forEach(function (k) {
      if ($(k).checked) {
        var s = sets[k];
        if ($("clear-look").checked) s = s.replace(similar, "");
        chosen.push(s);
      }
    });
    return chosen;
  }

  function generate() {
    var chosen = pools();
    $("len-val").textContent = len.value;
    if (!chosen.length) { pw.textContent = ""; CNK.status(st, "Choose at least one type of character.", "err"); bar.style.width = "0"; label.textContent = ""; return; }
    var n = Math.max(+len.value, chosen.length), all = chosen.join(""), chars = [];
    chosen.forEach(function (s) { chars.push(s[CNK.randInt(s.length)]); });
    while (chars.length < n) chars.push(all[CNK.randInt(all.length)]);
    for (var i = chars.length - 1; i > 0; i--) { var j = CNK.randInt(i + 1); var t = chars[i]; chars[i] = chars[j]; chars[j] = t; }
    pw.textContent = chars.join("");
    CNK.status(st, "");
    var bits = n * Math.log2(all.length);
    var pct = Math.min(100, bits / 128 * 100);
    var level = bits < 45 ? ["Weak", "var(--danger)"] : bits < 70 ? ["Fair", "var(--gold)"] : bits < 100 ? ["Strong", "var(--ok)"] : ["Very strong", "var(--ok)"];
    bar.style.width = pct + "%"; bar.style.background = level[1];
    label.textContent = level[0] + " (about " + Math.round(bits) + " bits)";
  }
  ["len", "lower", "upper", "digits", "symbols", "clear-look"].forEach(function (id) { $(id).addEventListener("input", generate); });
  $("gen").addEventListener("click", generate);
  $("copy").addEventListener("click", function () { if (pw.textContent) CNK.copy(pw.textContent, st); });
  generate();
})();

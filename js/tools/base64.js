(function () {
  var $ = CNK.$, input = $("text"), out = $("out"), st = $("status");
  function enc(s) {
    var bytes = new TextEncoder().encode(s), bin = "";
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    var b = btoa(bin);
    return $("urlsafe").checked ? b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : b;
  }
  function dec(s) {
    s = s.trim().replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    var bin = atob(s), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  }
  function run(mode) {
    if (!input.value) { out.textContent = ""; CNK.status(st, "Type or paste some text first."); return; }
    try {
      out.textContent = mode === "enc" ? enc(input.value) : dec(input.value);
      CNK.status(st, mode === "enc" ? "Encoded." : "Decoded.", "ok");
    } catch (e) {
      out.textContent = "";
      CNK.status(st, mode === "dec" ? "This is not valid Base64 text, or it does not decode to readable text." : "Could not encode this text.", "err");
    }
  }
  $("encode").addEventListener("click", function () { run("enc"); });
  $("decode").addEventListener("click", function () { run("dec"); });
  $("copy").addEventListener("click", function () { if (out.textContent) CNK.copy(out.textContent, st); });
})();

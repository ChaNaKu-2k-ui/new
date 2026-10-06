(function () {
  var $ = CNK.$, st = $("status"), file = null, objUrl = null, outUrl = null;
  var q = $("quality"), maxw = $("maxw"), fmt = $("format");

  function reset() {
    if (outUrl) URL.revokeObjectURL(outUrl);
    outUrl = null; $("result").hidden = true;
  }
  function load(f) {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { CNK.status(st, "Use a JPG, PNG or WebP image.", "err"); return; }
    file = f;
    if (objUrl) URL.revokeObjectURL(objUrl);
    objUrl = URL.createObjectURL(f);
    $("orig-img").src = objUrl;
    $("orig-size").textContent = CNK.bytes(f.size);
    $("name").textContent = f.name;
    reset(); compress();
  }
  function compress() {
    if (!file) return;
    $("q-val").textContent = Math.round(q.value * 100) + "%";
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth, h = img.naturalHeight, lim = parseInt(maxw.value, 10);
      if (lim > 0 && w > lim) { h = Math.round(h * lim / w); w = lim; }
      var c = document.createElement("canvas"); c.width = w; c.height = h;
      var ctx = c.getContext("2d");
      var type = fmt.value === "same" ? file.type : fmt.value;
      if (type === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); }
      ctx.drawImage(img, 0, 0, w, h);
      c.toBlob(function (blob) {
        if (!blob) { CNK.status(st, "This browser cannot save that format. Try JPEG.", "err"); return; }
        reset();
        outUrl = URL.createObjectURL(blob);
        $("new-img").src = outUrl;
        $("new-size").textContent = CNK.bytes(blob.size);
        $("dims").textContent = w + " \u00d7 " + h + " px";
        var saved = Math.round((1 - blob.size / file.size) * 100);
        CNK.status(st, saved > 0 ? "Saved " + saved + "% of the file size." : "The new file is not smaller. Lower the quality or the width, or use WebP.", saved > 0 ? "ok" : "err");
        var ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[blob.type] || "jpg";
        var dl = $("download"); dl.href = outUrl; dl.download = file.name.replace(/\.[^.]+$/, "") + "-compressed." + ext;
        $("result").hidden = false;
      }, type, +q.value);
    };
    img.onerror = function () { CNK.status(st, "That image could not be read.", "err"); };
    img.src = objUrl;
  }
  $("file").addEventListener("change", function (e) { load(e.target.files[0]); });
  var drop = $("drop");
  ["dragover", "dragenter"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.style.borderColor = "var(--gold)"; }); });
  ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function () { drop.style.borderColor = ""; }); });
  drop.addEventListener("drop", function (e) { e.preventDefault(); load(e.dataTransfer.files[0]); });
  [q, maxw, fmt].forEach(function (el) { el.addEventListener("input", compress); });
})();

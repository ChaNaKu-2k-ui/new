(function () {
  var $ = CNK.$, st = $("status"), list = $("thumbs");
  var sizes = [
    ["maxresdefault", "Full HD, 1280 \u00d7 720"],
    ["sddefault", "Standard, 640 \u00d7 480"],
    ["hqdefault", "High, 480 \u00d7 360"],
    ["mqdefault", "Medium, 320 \u00d7 180"]
  ];
  function getId(v) {
    v = v.trim();
    if (/^[\w-]{11}$/.test(v)) return v;
    try {
      var u = new URL(/^https?:\/\//i.test(v) ? v : "https://" + v);
      var h = u.hostname.replace(/^www\.|^m\./, "");
      if (h === "youtu.be") return u.pathname.slice(1, 12);
      if (h.endsWith("youtube.com") || h.endsWith("youtube-nocookie.com")) {
        if (u.searchParams.get("v")) return u.searchParams.get("v").slice(0, 11);
        var m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/);
        if (m) return m[1];
      }
    } catch (e) {}
    return null;
  }
  function show() {
    var id = getId($("url").value);
    list.innerHTML = "";
    if (!$("url").value.trim()) { CNK.status(st, ""); return; }
    if (!id) { CNK.status(st, "That does not look like a YouTube link. Paste the video address or its 11 character ID.", "err"); return; }
    CNK.status(st, "Video ID: " + id, "ok");
    sizes.forEach(function (s) {
      var src = "https://i.ytimg.com/vi/" + id + "/" + s[0] + ".jpg";
      var fig = document.createElement("figure");
      var img = new Image(); img.alt = "Thumbnail, " + s[1]; img.loading = "lazy"; img.src = src;
      var cap = document.createElement("figcaption");
      var label = document.createElement("span"); label.textContent = s[1];
      var a = document.createElement("a"); a.href = src; a.target = "_blank"; a.rel = "noopener"; a.className = "btn"; a.textContent = "Open full size";
      cap.appendChild(label); cap.appendChild(a);
      img.addEventListener("error", function () { fig.remove(); });
      fig.appendChild(img); fig.appendChild(cap); list.appendChild(fig);
    });
  }
  $("go").addEventListener("click", show);
  $("url").addEventListener("keydown", function (e) { if (e.key === "Enter") show(); });
  $("url").addEventListener("paste", function () { setTimeout(show, 0); });
})();

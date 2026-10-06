/* Shared header, footer and helpers. Edit the nav here and every page updates. */
(function () {
  var script = document.currentScript;
  var root = (script && script.dataset.root) || "";
  var page = location.pathname.split("/").pop().replace(/\.html$/, "") || "index";
  var inTools = location.pathname.indexOf("/tools/") !== -1;

  var links = [
    ["Tools", root + "index.html#tools", inTools],
    ["Socials", root + "socials.html", page === "socials"],
    ["Partners", root + "partners.html", page === "partners"],
    ["About", root + "about.html", page === "about"]
  ];

  var header = document.getElementById("site-header");
  if (header) {
    header.innerHTML =
      '<div class="wrap nav"><a class="brand" href="' + root + 'index.html">' +
      '<img src="' + root + 'assets/logo.webp" alt="" width="38" height="38"><span>ChaNaKu</span></a>' +
      '<nav class="nav-links" aria-label="Main">' +
      links.map(function (l) {
        return '<a href="' + l[1] + '"' + (l[2] ? ' aria-current="page"' : "") + ">" + l[0] + "</a>";
      }).join("") + "</nav></div>";
  }

  var footer = document.getElementById("site-footer");
  if (footer) {
    footer.innerHTML =
      '<div class="wrap foot"><div>&copy; ' + new Date().getFullYear() + " ChaNaKu. Text, passwords and images you use in the tools stay in your browser.</div>" +
      '<nav aria-label="Footer"><a href="' + root + 'socials.html">Socials</a><a href="' + root + 'partners.html">Partners</a><a href="' + root + 'about.html">About</a></nav></div>';
  }

  /* "More tools" block on tool pages */
  var related = document.getElementById("related");
  if (related && window.TOOLS) {
    var cur = page;
    var me = window.TOOLS.filter(function (t) { return t.slug === cur; })[0];
    var others = window.TOOLS.filter(function (t) { return t.slug !== cur; });
    others.sort(function (a, b) { return (b.cat === (me && me.cat)) - (a.cat === (me && me.cat)); });
    related.innerHTML = "<h2>More tools</h2><ul class=\"tool-grid\">" + others.slice(0, 3).map(function (t) {
      return '<li><a class="tool cat-' + t.cat + '" href="' + t.slug + '.html"><h3>' + t.name + "</h3><p>" + t.desc + "</p></a></li>";
    }).join("") + "</ul>";
  }

  /* Helpers shared by tools */
  window.CNK = {
    $: function (id) { return document.getElementById(id); },
    status: function (el, msg, kind) { el.textContent = msg || ""; el.className = "status" + (kind ? " " + kind : ""); },
    copy: function (text, statusEl) {
      var done = function () { window.CNK.status(statusEl, "Copied to clipboard.", "ok"); };
      var fail = function () { window.CNK.status(statusEl, "Copy failed. Select the text and copy it manually.", "err"); };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, fail);
      } else {
        var t = document.createElement("textarea");
        t.value = text; t.style.position = "fixed"; t.style.opacity = "0";
        document.body.appendChild(t); t.select();
        try { document.execCommand("copy") ? done() : fail(); } catch (e) { fail(); }
        document.body.removeChild(t);
      }
    },
    /* Unbiased random integer in [0, max) using the browser's secure generator */
    randInt: function (max) {
      var lim = Math.floor(4294967296 / max) * max, buf = new Uint32Array(1);
      do { crypto.getRandomValues(buf); } while (buf[0] >= lim);
      return buf[0] % max;
    },
    bytes: function (n) {
      if (n < 1024) return n + " B";
      if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
      return (n / 1048576).toFixed(2) + " MB";
    }
  };
})();

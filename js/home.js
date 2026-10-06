(function () {
  var grid = document.getElementById("tool-grid");
  if (!grid || !window.TOOLS) return;
  var input = document.getElementById("tool-search");
  var chips = document.getElementById("chips");
  var empty = document.getElementById("empty");
  var active = "all";

  var catCount = {};
  window.TOOLS.forEach(function (t) { catCount[t.cat] = 1; });
  var chipHtml = '<button class="chip" type="button" data-cat="all" aria-pressed="true">All tools</button>';
  Object.keys(window.CATEGORIES).forEach(function (k) {
    if (catCount[k]) chipHtml += '<button class="chip" type="button" data-cat="' + k + '" aria-pressed="false" style="--dot:var(--c-' + k + ')"><i></i>' + window.CATEGORIES[k] + "</button>";
  });
  chips.innerHTML = chipHtml;

  function render() {
    var q = input.value.trim().toLowerCase();
    var shown = window.TOOLS.filter(function (t) {
      var hit = !q || (t.name + " " + t.desc + " " + window.CATEGORIES[t.cat]).toLowerCase().indexOf(q) !== -1;
      return hit && (active === "all" || t.cat === active);
    });
    grid.innerHTML = shown.map(function (t) {
      return '<li><a class="tool cat-' + t.cat + '" href="tools/' + t.slug + '.html"><h3>' + t.name + "</h3><p>" + t.desc +
        '</p><span class="cat">' + window.CATEGORIES[t.cat] + "</span></a></li>";
    }).join("");
    empty.hidden = shown.length > 0;
  }

  chips.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-cat]");
    if (!b) return;
    active = b.dataset.cat;
    Array.prototype.forEach.call(chips.children, function (c) { c.setAttribute("aria-pressed", String(c === b)); });
    render();
  });
  input.addEventListener("input", render);
  var q = new URLSearchParams(location.search).get("q");
  if (q) input.value = q;
  render();
})();

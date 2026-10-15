/* Games hub: draws one card for each entry in window.GAMES. */
(function () {
  var grid = document.getElementById("game-grid");
  if (!grid || !window.GAMES || !window.svg) return;
  grid.innerHTML = window.GAMES.map(function (g, i) {
    return '<li style="--i:' + i + '"><a class="tool cat-game" href="games/' + g.slug + '.html">' +
      '<span class="ico">' + window.svg(g.icon) + "</span><h3>" + g.name + "</h3><p>" + g.desc + "</p>" +
      '<span class="cat">' + g.tag + " " + window.svg(window.UI_ICONS.arrow) + "</span></a></li>";
  }).join("");
})();

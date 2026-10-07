/* Runs before the page paints so there is no flash. Dark is the default look; the visitor's choice is remembered. */
(function () {
  var t = "dark";
  try {
    var saved = localStorage.getItem("cnk-theme");
    if (saved === "light" || saved === "dark") t = saved;
  } catch (e) {}
  document.documentElement.setAttribute("data-theme", t);
})();

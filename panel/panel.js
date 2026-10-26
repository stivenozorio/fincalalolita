/* Vista previa de la variación mientras Dagoberto escribe el precio nuevo (el servidor la recalcula al guardar). */
(function () {
  "use strict";
  var input = document.getElementById("newPrice"), out = document.getElementById("preview");
  if (!input || !out || !window.LolitaPrice) return;
  var P = window.LolitaPrice, cur = parseInt(out.getAttribute("data-current"), 10);
  input.addEventListener("input", function () {
    var n = parseInt(input.value.replace(/[^0-9]/g, ""), 10);
    if (!n || n < 1000) { out.textContent = "Precio actual: " + P.cop(cur); return; }
    var d = n - cur;
    out.textContent = d === 0 ? "Es igual al precio actual." : (d > 0 ? "▲ Sube " : "▼ Baja ") + P.signed(d) + " (" + P.pct(d / cur * 100) + ")";
  });
})();

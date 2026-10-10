/* Sitio solo en español: textos dinámicos del catálogo y del resumen de pedido. */
(function () {
  "use strict";
  var ES = { add: "Agregar", remove: "Quitar uno", tbc: "Precio por confirmar", soldout: "No disponible por ahora", prov: "PROVISIONAL",
    total: "Total", totalTbc: "Total por confirmar con Dagoberto", empty: "Aún no hay productos",
    preview: "Modo vista previa: los productos de ejemplo marcados PROVISIONAL no son reales y no se pueden pedir de verdad.",
    noWa: "El pedido por WhatsApp se activará cuando se confirme el número del negocio.",
    fine: "Abrir WhatsApp no confirma tu pedido. Dagoberto lo confirmará contigo.", qty: "Cantidad" };
  window.LolitaI18n = {
    lang: "es",
    t: function (k) { return ES[k]; },
    onChange: function (fn) { this._fn = fn; },
    apply: function () { if (this._fn) this._fn("es"); }
  };
})();

/* Lógica pura del pedido (sin DOM): reglas de qué se puede pedir, totales y mensaje de WhatsApp.
   Funciona en el navegador (window.LolitaOrder) y en Node (para pruebas). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LolitaOrder = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MAX_QTY = 99;

  function isPriced(pres) {
    return pres && typeof pres.price === "number" && isFinite(pres.price) && pres.price >= 0;
  }

  /** Productos visibles: confirmados, o provisionales solo en modo vista previa. */
  function visibleProducts(catalog, preview) {
    return (catalog.products || []).filter(function (p) {
      return p.confirmed === true || (preview === true && p.provisional === true);
    });
  }

  /** ¿Se puede pedir esta presentación? (producto disponible y confirmado; en vista previa se permite probar). */
  function isOrderable(product, preview) {
    if (!product) return false;
    if (product.provisional && !preview) return false;
    if (!product.provisional && product.confirmed !== true) return false;
    return product.available === true || (preview === true && product.provisional === true);
  }

  function clampQty(n) {
    n = Math.floor(Number(n));
    if (!isFinite(n) || n < 0) return 0;
    return Math.min(n, MAX_QTY);
  }

  /** selection: { "productId::presId": qty } → líneas con datos resueltos del catálogo. */
  function buildLines(catalog, selection, lang, preview) {
    var lines = [];
    (catalog.products || []).forEach(function (p) {
      if (!isOrderable(p, preview)) return;
      (p.presentations || []).forEach(function (pres) {
        var qty = clampQty(selection[p.id + "::" + pres.id]);
        if (qty > 0) {
          lines.push({
            productId: p.id, presId: pres.id, qty: qty,
            name: (p.name && (p.name[lang] || p.name.es)) || p.id,
            presentation: (pres.label && (pres.label[lang] || pres.label.es)) || "",
            price: isPriced(pres) ? pres.price : null
          });
        }
      });
    });
    return lines;
  }

  /** Total solo si TODAS las líneas tienen precio confirmado; si no, null. */
  function total(lines) {
    if (!lines.length) return null;
    var sum = 0;
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].price === null) return null;
      sum += lines[i].price * lines[i].qty;
    }
    return sum;
  }

  function formatCOP(n) {
    var s = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return "$" + s + " COP";
  }

  /** Mensaje para Dagoberto (siempre en español). */
  function buildMessage(lines, notes, brandName) {
    var out = ["Hola " + (brandName || "Finca La Lolita") + ", quiero hacer un pedido:", ""];
    lines.forEach(function (l) {
      var txt = "• " + l.qty + " × " + l.name + (l.presentation ? " (" + l.presentation + ")" : "");
      if (l.price !== null) txt += " — " + formatCOP(l.price * l.qty);
      out.push(txt);
    });
    var t = total(lines);
    if (t !== null) { out.push(""); out.push("Total: " + formatCOP(t)); }
    var clean = (notes || "").replace(/\s+/g, " ").trim().slice(0, 500);
    if (clean) { out.push(""); out.push("Observaciones: " + clean); }
    out.push(""); out.push("¿Me confirmas disponibilidad y entrega? Gracias.");
    return out.join("\n");
  }

  /** Número válido: solo dígitos, 10–15 (formato internacional sin +). Si no, null. */
  function normalizeNumber(raw) {
    var d = String(raw || "").replace(/\D/g, "");
    return d.length >= 10 && d.length <= 15 ? d : null;
  }

  /** URL de WhatsApp, o null si el número no está configurado o no hay líneas. */
  function buildWhatsAppUrl(number, lines, notes, brandName) {
    var n = normalizeNumber(number);
    if (!n || !lines.length) return null;
    return "https://wa.me/" + n + "?text=" + encodeURIComponent(buildMessage(lines, notes, brandName));
  }

  return {
    MAX_QTY: MAX_QTY, isPriced: isPriced, visibleProducts: visibleProducts, isOrderable: isOrderable,
    clampQty: clampQty, buildLines: buildLines, total: total, formatCOP: formatCOP,
    buildMessage: buildMessage, normalizeNumber: normalizeNumber, buildWhatsAppUrl: buildWhatsAppUrl
  };
});

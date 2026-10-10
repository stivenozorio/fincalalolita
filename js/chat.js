/* Asistente flotante: respuestas guiadas con datos reales del sitio (config + catálogo).
   No usa IA ni servidor, no tiene campo de texto y no recoge datos personales.
   Lo no confirmado se dice como pendiente; nunca inventa precios, zonas ni medios de pago. */
(function () {
  "use strict";
  var CFG = window.LOLITA_CONFIG || {}, CAT = window.LOLITA_CATALOG || { products: [] }, O = window.LolitaOrder;
  var preview = /[?&]preview=1\b/.test(location.search) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var $ = function (id) { return document.getElementById(id); };
  var root = $("chat"), fab = $("chatFab"), panel = $("chatPanel"), log = $("chatLog"), opts = $("chatOpts"), tease = $("chatTease");
  if (!root) return;
  var greeted = false, open = false;

  function say(text, who, link) {
    var d = document.createElement("div"); d.className = "msg msg--" + who; d.textContent = text;
    if (link) { var a = document.createElement("a"); a.className = "msg__link"; a.href = link.href; a.textContent = link.label;
      if (link.external) { a.target = "_blank"; a.rel = "noopener noreferrer"; } else a.addEventListener("click", close); d.appendChild(a); }
    log.appendChild(d); log.scrollTop = log.scrollHeight;
  }
  function products() { return O.visibleProducts(CAT, false); }
  function waLink() { var n = O.normalizeNumber(CFG.whatsappNumber); return n ? "https://wa.me/" + n : null; }

  var QA = [
    { q: "¿Cómo hago un pedido?", a: function () { return ["Eliges tus huevos, indicas cantidades, agregas observaciones y pulsas “Pedir por WhatsApp”. Se abre WhatsApp con tu pedido ya escrito: solo lo envías. Enviarlo es una solicitud; Dagoberto confirma contigo la disponibilidad y la entrega.", { href: "#products", label: "Ir a los productos" }]; } },
    { q: "¿Qué productos hay?", a: function () {
        var p = products();
        if (!p.length) return ["Estamos preparando el catálogo con Dagoberto. Aparecerá en la sección de productos en cuanto esté confirmado.", { href: "#products", label: "Ver la sección" }];
        return ["Por ahora: " + p.map(function (x) { return x.name.es; }).join(", ") + ".", { href: "#products", label: "Ver los productos" }]; } },
    { q: "¿Cuánto cuestan?", a: function () {
        var priced = products().some(function (p) { return (p.presentations || []).some(O.isPriced); });
        return [priced ? "Los precios están en cada producto, en pesos colombianos. Tu total lo ves antes de enviar el pedido." : "Los precios se publicarán cuando Dagoberto los confirme. No mostramos precios que no estén confirmados.", { href: "#products", label: "Ir a los productos" }]; } },
    { q: "¿Hacen domicilios?", a: function () { return [CFG.deliveryNote || "Todavía estamos confirmando hasta dónde repartimos. Dagoberto te dirá por WhatsApp si llega a tu zona."]; } },
    { q: "¿Cómo se paga?", a: function () { return [CFG.paymentNote || "Los medios de pago aún se están confirmando. Dagoberto te los indicará al coordinar tu pedido."]; } },
    { q: "Hablar con Dagoberto", a: function () {
        var w = waLink();
        return w ? ["Con gusto. Te abro WhatsApp para que le escribas directamente.", { href: w, label: "Abrir WhatsApp", external: true }]
                 : ["El WhatsApp del negocio todavía no está habilitado en el sitio. Se activará cuando se confirme el número."]; } }
  ];

  function renderOpts() {
    opts.textContent = "";
    QA.forEach(function (item) {
      var b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = item.q;
      b.addEventListener("click", function () { var r = item.a(); say(item.q, "me"); setTimeout(function () { say(r[0], "bot", r[1]); }, 280); });
      opts.appendChild(b);
    });
  }
  function show() {
    open = true; panel.hidden = false; root.classList.add("is-open"); fab.setAttribute("aria-expanded", "true"); tease.hidden = true;
    if (!greeted) { greeted = true; renderOpts();
      say("¡Hola! Soy el asistente de Finca La Lolita. Puedo orientarte con tu pedido. No soy una persona ni guardo tus datos: para confirmar una compra hablas con Dagoberto por WhatsApp.", "bot"); }
    try { sessionStorage.setItem("lolita.chat", "1"); } catch (e) {}
  }
  function close() { open = false; panel.hidden = true; root.classList.remove("is-open"); fab.setAttribute("aria-expanded", "false"); fab.focus(); }
  fab.addEventListener("click", function () { open ? close() : show(); });
  $("chatClose").addEventListener("click", close);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) close(); });

  // Se sube sobre la barra del pedido cuando esta aparece
  var orderEl = $("order");
  function sync() { root.classList.toggle("has-order", !!orderEl && !orderEl.hidden); }
  if (orderEl && "MutationObserver" in window) new MutationObserver(sync).observe(orderEl, { attributes: true, attributeFilter: ["hidden"] });
  sync();

  // Globo de invitación, una sola vez por sesión
  var seen = false; try { seen = sessionStorage.getItem("lolita.chat") === "1"; } catch (e) {}
  if (!seen) setTimeout(function () { if (!open) { tease.hidden = false; setTimeout(function () { tease.hidden = true; }, 7000); } }, 6000);
})();

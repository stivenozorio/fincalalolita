/* Idiomas: el español (idioma principal) vive en el HTML con data-i18n; aquí el inglés y los textos dinámicos. */
(function () {
  "use strict";
  var EN = {
    skip: "Skip to content",
    "nav.story": "Our Story", "nav.products": "Products", "nav.how": "How to Order", "nav.care": "Care", "nav.community": "Community",
    "hero.title": "Every Egg Has a Story.", "hero.sub": "A family dream, growing one day at a time.",
    "hero.cta": "Discover Our Products", "hero.next": "Meet the finca", "hero.scroll": "Scroll", "hero.loading": "Loading the story…",
    "ch1.k": "Origin", "ch1.t": "Every story starts small.",
    "ch2.k": "Care", "ch2.t": "Held with care.",
    "ch3.k": "Home", "ch3.t": "Made for the family table.",
    "ch4.k": "Warmth", "ch4.t": "Unhurried, warm mornings.",
    "ch5.k": "Together", "ch5.t": "Shared with the people we love.",
    "farm.eyebrow": "The finca", "farm.l1": "The finca wakes up before anyone.", "farm.l2": "Here time moves slowly and every day counts.", "farm.l3": "A dream Dagoberto wanted for Efraín and Lucila.",
    "mq.1": "A family dream", "mq.2": "Eggs with a story",
    "story.eyebrow": "Our Story", "story.title": "A Dream Rooted in Family.",
    "story.body": "Finca La Lolita began with Dagoberto's dream of creating a finca for his parents, Efraín and Lucila. Today, that dream is becoming a family business built with care, purpose, and the ambition to grow for generations.",
    "prod.eyebrow": "Products", "prod.title": "Fresh Choices, Made Simple.",
    "prod.emptyT": "Our catalog is being prepared.",
    "prod.emptyB": "We are confirming products, presentations and prices with Dagoberto. They will appear here as soon as they are ready.",
    "order.items": "items", "order.title": "Your order", "order.notes": "Notes (optional)",
    "order.notesPh": "Address reference, delivery time, anything we should know", "order.cta": "Order on WhatsApp",
    "how.eyebrow": "How to Order", "how.title": "Four simple steps.",
    "how.1t": "Choose", "how.1b": "Pick your eggs and the presentation you prefer.",
    "how.2t": "Set quantities", "how.2b": "Review your order summary and add any notes.",
    "how.3t": "Send on WhatsApp", "how.3b": "We open WhatsApp with your order already written. You just press send.",
    "how.4t": "We confirm with you", "how.4b": "Sending the message is a request, not a purchase. Dagoberto confirms availability and delivery with you.",
    "care.eyebrow": "Care", "care.title": "Care in every order.",
    "care.body": "We believe a simple product deserves attention to detail. That starts with how each order is received, confirmed and delivered.",
    "care.1t": "A person, not a form", "care.1b": "Every order is confirmed directly with Dagoberto over WhatsApp.",
    "care.2t": "Clear prices", "care.2b": "Prices are shown in Colombian pesos, and you see your total before you send.",
    "care.3t": "Honest information", "care.3b": "We only publish what is confirmed: products, presentations and delivery areas.",
    "com.eyebrow": "Community", "com.title": "More Than a Purchase. A Growing Community.",
    "com.body": "Finca La Lolita grows with its neighbors. Over time we want to remember our customers, thank the ones who return, and make it easy to reorder.",
    soon: "Coming later", "com.1t": "Reorder reminders", "com.2t": "Rewards for loyal customers", "com.3t": "Neighbor referrals",
    "com.fine": "We will only keep customer information with your permission, and use it only for what we tell you.",
    "cta.title": "Bring a family story to your table.", "cta.btn": "See the products",
    "foot.tag": "A family dream, growing one day at a time.", "foot.by": "Website by"
  };
  var DYN = {
    es: { add: "Agregar", remove: "Quitar uno", tbc: "Precio por confirmar", soldout: "No disponible por ahora", prov: "PROVISIONAL",
          total: "Total", totalTbc: "Total por confirmar con Dagoberto", empty: "Aún no hay productos",
          preview: "Modo vista previa: los productos de ejemplo marcados PROVISIONAL no son reales y no se pueden pedir de verdad.",
          noWa: "El pedido por WhatsApp se activará cuando se confirme el número del negocio.",
          fine: "Abrir WhatsApp no confirma tu pedido. Dagoberto lo confirmará contigo.", qty: "Cantidad" },
    en: { add: "Add", remove: "Remove one", tbc: "Price to be confirmed", soldout: "Not available right now", prov: "PROVISIONAL",
          total: "Total", totalTbc: "Total to be confirmed with Dagoberto", empty: "No items yet",
          preview: "Preview mode: sample products marked PROVISIONAL are not real and cannot be ordered for real.",
          noWa: "WhatsApp ordering will be enabled once the business number is confirmed.",
          fine: "Opening WhatsApp does not confirm your order. Dagoberto will confirm it with you.", qty: "Quantity" }
  };
  var lang = "es";
  try { lang = localStorage.getItem("lolita.lang") === "en" ? "en" : "es"; } catch (e) {}
  var listeners = [];

  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      if (el.dataset.es === undefined) el.dataset.es = el.textContent;
      el.textContent = lang === "en" && EN[el.dataset.i18n] ? EN[el.dataset.i18n] : el.dataset.es;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      if (el.dataset.esPh === undefined) el.dataset.esPh = el.getAttribute("placeholder") || "";
      el.setAttribute("placeholder", lang === "en" ? EN[el.dataset.i18nPh] : el.dataset.esPh);
    });
    var btn = document.getElementById("langBtn");
    if (btn) btn.textContent = lang === "en" ? "ES" : "EN";
    listeners.forEach(function (fn) { fn(lang); });
  }
  window.LolitaI18n = {
    get lang() { return lang; },
    t: function (k) { return DYN[lang][k]; },
    onChange: function (fn) { listeners.push(fn); },
    toggle: function () { lang = lang === "en" ? "es" : "en"; try { localStorage.setItem("lolita.lang", lang); } catch (e) {} apply(); },
    apply: apply
  };
})();

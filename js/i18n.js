/* Idiomas: el inglés vive en el HTML (data-i18n); aquí solo el español y los textos dinámicos. */
(function () {
  "use strict";
  var ES = {
    skip: "Saltar al contenido",
    "nav.story": "Nuestra historia", "nav.products": "Productos", "nav.how": "Cómo pedir", "nav.care": "Cuidado", "nav.community": "Comunidad",
    "hero.title": "Cada huevo tiene una historia.", "hero.sub": "Un sueño familiar que crece un día a la vez.",
    "hero.cta": "Descubre nuestros productos", "hero.scroll": "Desliza", "hero.loading": "Cargando la historia…",
    "ch1.k": "Origen", "ch1.t": "Toda historia empieza pequeña.",
    "ch2.k": "Cuidado", "ch2.t": "Sostenido con cuidado.",
    "ch3.k": "Hogar", "ch3.t": "Hecho para la mesa familiar.",
    "ch4.k": "Calidez", "ch4.t": "Mañanas cálidas, sin prisa.",
    "ch5.k": "Juntos", "ch5.t": "Compartido con quienes queremos.",
    "story.eyebrow": "Nuestra historia", "story.title": "Un sueño con raíces familiares.",
    "story.body": "Finca La Lolita nació del sueño de Dagoberto de crear una finca para sus padres, Efraín y Lucila. Hoy, ese sueño se está convirtiendo en un negocio familiar hecho con cuidado, propósito y la ambición de crecer por generaciones.",
    "prod.eyebrow": "Productos", "prod.title": "Opciones frescas, hechas simples.",
    "prod.emptyT": "Estamos preparando el catálogo.",
    "prod.emptyB": "Estamos confirmando con Dagoberto los productos, presentaciones y precios. Aparecerán aquí en cuanto estén listos.",
    "order.items": "productos", "order.title": "Tu pedido", "order.notes": "Observaciones (opcional)",
    "order.notesPh": "Referencia de dirección, hora de entrega, lo que debamos saber", "order.cta": "Pedir por WhatsApp",
    "how.eyebrow": "Cómo pedir", "how.title": "Cuatro pasos simples.",
    "how.1t": "Elige", "how.1b": "Escoge tus huevos y la presentación que prefieras.",
    "how.2t": "Indica cantidades", "how.2b": "Revisa el resumen de tu pedido y agrega observaciones.",
    "how.3t": "Envía por WhatsApp", "how.3b": "Abrimos WhatsApp con tu pedido ya escrito. Solo debes enviarlo.",
    "how.4t": "Confirmamos contigo", "how.4b": "Enviar el mensaje es una solicitud, no una compra. Dagoberto confirma contigo la disponibilidad y la entrega.",
    "care.eyebrow": "Cuidado", "care.title": "Cuidado en cada pedido.",
    "care.body": "Creemos que un producto sencillo merece atención al detalle. Eso empieza por cómo se recibe, confirma y entrega cada pedido.",
    "care.1t": "Una persona, no un formulario", "care.1b": "Cada pedido se confirma directamente con Dagoberto por WhatsApp.",
    "care.2t": "Precios claros", "care.2b": "Los precios se muestran en pesos colombianos y ves tu total antes de enviar.",
    "care.3t": "Información honesta", "care.3b": "Solo publicamos lo que está confirmado: productos, presentaciones y zonas de entrega.",
    "com.eyebrow": "Comunidad", "com.title": "Más que una compra. Una comunidad que crece.",
    "com.body": "Finca La Lolita crece con sus vecinos. Con el tiempo queremos recordar a nuestros clientes, agradecer a quienes regresan y facilitar volver a pedir.",
    soon: "Próximamente", "com.1t": "Recordatorios para volver a pedir", "com.2t": "Recompensas para clientes fieles", "com.3t": "Referidos entre vecinos",
    "com.fine": "Solo guardaremos información de clientes con tu permiso y la usaremos únicamente para lo que te informemos.",
    "cta.title": "Lleva una historia familiar a tu mesa.", "cta.btn": "Ver los productos",
    "foot.tag": "Un sueño familiar que crece un día a la vez.", "foot.by": "Sitio web por"
  };
  var DYN = {
    en: { add: "Add", remove: "Remove one", tbc: "Price to be confirmed", soldout: "Not available right now", prov: "PROVISIONAL",
          each: "per", total: "Total", totalTbc: "Total to be confirmed with Dagoberto", empty: "No items yet",
          preview: "Preview mode: sample products marked PROVISIONAL are not real and cannot be ordered for real.",
          noWa: "WhatsApp ordering will be enabled once the business number is confirmed.",
          fine: "Opening WhatsApp does not confirm your order. Dagoberto will confirm it with you.", qty: "Quantity", of: "of" },
    es: { add: "Agregar", remove: "Quitar uno", tbc: "Precio por confirmar", soldout: "No disponible por ahora", prov: "PROVISIONAL",
          each: "por", total: "Total", totalTbc: "Total por confirmar con Dagoberto", empty: "Aún no hay productos",
          preview: "Modo vista previa: los productos de ejemplo marcados PROVISIONAL no son reales y no se pueden pedir de verdad.",
          noWa: "El pedido por WhatsApp se activará cuando se confirme el número del negocio.",
          fine: "Abrir WhatsApp no confirma tu pedido. Dagoberto lo confirmará contigo.", qty: "Cantidad", of: "de" }
  };
  var lang = "en";
  try { lang = localStorage.getItem("lolita.lang") === "es" ? "es" : "en"; } catch (e) {}
  var listeners = [];

  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      if (el.dataset.en === undefined) el.dataset.en = el.textContent;
      el.textContent = lang === "es" && ES[el.dataset.i18n] ? ES[el.dataset.i18n] : el.dataset.en;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      if (el.dataset.enPh === undefined) el.dataset.enPh = el.getAttribute("placeholder") || "";
      el.setAttribute("placeholder", lang === "es" ? ES[el.dataset.i18nPh] : el.dataset.enPh);
    });
    var btn = document.getElementById("langBtn");
    if (btn) btn.textContent = lang === "es" ? "EN" : "ES";
    listeners.forEach(function (fn) { fn(lang); });
  }
  window.LolitaI18n = {
    get lang() { return lang; },
    t: function (k) { return DYN[lang][k]; },
    onChange: function (fn) { listeners.push(fn); },
    toggle: function () { lang = lang === "es" ? "en" : "es"; try { localStorage.setItem("lolita.lang", lang); } catch (e) {} apply(); },
    apply: apply
  };
})();

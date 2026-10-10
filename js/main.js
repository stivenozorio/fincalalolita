/* Interfaz: navegación, revelados, catálogo y resumen de pedido (WhatsApp). */
(function () {
  "use strict";
  var O = window.LolitaOrder, I = window.LolitaI18n, CFG = window.LOLITA_CONFIG, CAT = window.LOLITA_CATALOG;
  var $ = function (id) { return document.getElementById(id); };
  var preview = /[?&]preview=1\b/.test(location.search) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var selection = {};            // "productId::presId" -> cantidad
  var openPanel = false;

  /* ---------- Navegación ---------- */
  var nav = $("nav"), toggle = $("navToggle");
  function setMenu(open) { nav.classList.toggle("is-open", open); toggle.setAttribute("aria-expanded", String(open)); document.body.classList.toggle("no-scroll", open); }
  toggle.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
  $("navLinks").addEventListener("click", function (e) { if (e.target.tagName === "A") setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  var heroEl = $("top");
  function navState() { nav.classList.toggle("is-solid", heroEl.getBoundingClientRect().bottom < window.innerHeight * 0.6); }
  window.addEventListener("scroll", navState, { passive: true }); navState();
  $("langBtn").addEventListener("click", function () { I.toggle(); });
  $("year").textContent = new Date().getFullYear();

  /* ---------- Revelados reversibles ---------- */
  var els = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle("is-in", e.isIntersecting); }); }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });
  } else els.forEach(function (el) { el.classList.add("is-in"); });

  /* ---------- Catálogo ---------- */
  function L(obj) { return (obj && (obj[I.lang] || obj.es || obj.en)) || ""; }
  function key(p, pres) { return p.id + "::" + pres.id; }

  function renderCatalog() {
    var list = O.visibleProducts(CAT, preview);
    var box = $("catalog");
    box.textContent = "";
    $("catalogEmpty").hidden = list.length > 0;
    var banner = $("previewBanner");
    banner.hidden = !(preview && list.some(function (p) { return p.provisional; }));
    banner.textContent = I.t("preview");

    list.forEach(function (p) {
      var orderable = O.isOrderable(p, preview);
      var card = document.createElement("article");
      card.className = "prod" + (orderable ? "" : " is-off");
      var media = document.createElement("div"); media.className = "prod__media";
      if (p.image) { var img = document.createElement("img"); img.src = p.image; img.alt = ""; img.loading = "lazy"; media.appendChild(img); }
      else media.innerHTML = '<svg viewBox="0 0 40 52" aria-hidden="true"><path d="M20 2C10 2 2 18 2 31a18 18 0 0 0 36 0C38 18 30 2 20 2z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
      if (p.provisional) { var b = document.createElement("span"); b.className = "badge"; b.textContent = I.t("prov"); media.appendChild(b); }
      card.appendChild(media);
      var body = document.createElement("div"); body.className = "prod__body";
      var h = document.createElement("h3"); h.textContent = L(p.name); body.appendChild(h);
      if (p.description) { var d = document.createElement("p"); d.className = "prod__desc"; d.textContent = L(p.description); body.appendChild(d); }

      (p.presentations || []).forEach(function (pres) {
        var k = key(p, pres), row = document.createElement("div"); row.className = "pres";
        var info = document.createElement("div"); info.className = "pres__info";
        var lab = document.createElement("span"); lab.textContent = L(pres.label);
        var pr = document.createElement("b"); pr.textContent = O.isPriced(pres) ? O.formatCOP(pres.price) : I.t("tbc");
        if (!O.isPriced(pres)) pr.className = "tbc";
        info.appendChild(lab); info.appendChild(pr); row.appendChild(info);
        if (orderable) {
          var q = document.createElement("div"); q.className = "qty"; q.setAttribute("role", "group"); q.setAttribute("aria-label", I.t("qty") + ": " + L(p.name));
          var minus = document.createElement("button"); minus.type = "button"; minus.textContent = "−"; minus.setAttribute("aria-label", I.t("remove"));
          var out = document.createElement("output"); out.textContent = selection[k] || 0;
          var plus = document.createElement("button"); plus.type = "button"; plus.textContent = "+"; plus.setAttribute("aria-label", I.t("add"));
          function set(n) { n = O.clampQty(n); if (n) selection[k] = n; else delete selection[k]; out.textContent = n; renderOrder(); }
          minus.onclick = function () { set((selection[k] || 0) - 1); };
          plus.onclick = function () { set((selection[k] || 0) + 1); };
          q.appendChild(minus); q.appendChild(out); q.appendChild(plus); row.appendChild(q);
        } else { var s = document.createElement("span"); s.className = "soldout"; s.textContent = I.t("soldout"); row.appendChild(s); }
        body.appendChild(row);
      });
      card.appendChild(body); box.appendChild(card);
    });
    renderOrder();
  }

  /* ---------- Resumen y WhatsApp ---------- */
  function renderOrder() {
    var lines = O.buildLines(CAT, selection, I.lang, preview);
    var panel = $("order");
    panel.hidden = O.visibleProducts(CAT, preview).filter(function (p) { return O.isOrderable(p, preview); }).length === 0;
    var count = lines.reduce(function (s, l) { return s + l.qty; }, 0);
    $("orderCount").textContent = count;
    var t = O.total(lines);
    $("orderTotalBar").textContent = t !== null ? O.formatCOP(t) : "";
    var ul = $("orderLines"); ul.textContent = "";
    if (!lines.length) { var li = document.createElement("li"); li.className = "empty"; li.textContent = I.t("empty"); ul.appendChild(li); }
    lines.forEach(function (l) {
      var li = document.createElement("li");
      var a = document.createElement("span"); a.textContent = l.qty + " × " + l.name + (l.presentation ? " · " + l.presentation : "");
      var b = document.createElement("b"); b.textContent = l.price !== null ? O.formatCOP(l.price * l.qty) : I.t("tbc");
      li.appendChild(a); li.appendChild(b); ul.appendChild(li);
    });
    $("orderTotal").textContent = !lines.length ? "" : t !== null ? I.t("total") + ": " + O.formatCOP(t) : I.t("totalTbc");

    var numberOk = O.normalizeNumber(CFG.whatsappNumber) !== null;
    var url = O.buildWhatsAppUrl(CFG.whatsappNumber, lines, $("orderNotes").value, CFG.brandName);
    // Datos provisionales nunca generan un enlace real
    if (lines.some(function (l) { return CAT.products.some(function (p) { return p.id === l.productId && p.provisional; }); })) url = null;
    var wa = $("waLink"), off = $("waDisabled");
    if (url) { wa.href = url; wa.hidden = false; off.hidden = true; } else { wa.removeAttribute("href"); wa.hidden = true; off.hidden = false; }
    $("orderFine").textContent = !numberOk ? I.t("noWa") : I.t("fine");
    if (numberOk && url) $("orderFine").textContent = I.t("fine");
  }

  $("orderBar").addEventListener("click", function () {
    openPanel = !openPanel;
    $("order").classList.toggle("is-open", openPanel);
    $("orderBar").setAttribute("aria-expanded", String(openPanel));
  });
  $("orderNotes").addEventListener("input", renderOrder);
  I.onChange(renderCatalog);
  I.apply();
})();

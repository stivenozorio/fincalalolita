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
  function navState() {
    nav.classList.toggle("is-solid", heroEl.getBoundingClientRect().bottom < window.innerHeight * 0.6);
    nav.classList.toggle("is-small", window.scrollY > 60);
  }
  window.addEventListener("scroll", navState, { passive: true }); navState();
  $("year").textContent = new Date().getFullYear();
  var waNum = O.normalizeNumber(CFG.whatsappNumber);
  document.querySelectorAll(".js-wa").forEach(function (a) { if (waNum) { a.href = "https://wa.me/" + waNum; a.hidden = false; } });

  /* ---------- Revelados reversibles ---------- */
  var els = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle("is-in", e.isIntersecting); }); }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });
  } else els.forEach(function (el) { el.classList.add("is-in"); });

  /* ---------- Catálogo ---------- */
  function L(obj) { return (obj && (obj[I.lang] || obj.es || obj.en)) || ""; }
  function key(p, pres) { return p.id + "::" + pres.id; }

  var CATS = ["huevos", "artesanias"];
  var PLACEHOLDER = '<svg viewBox="0 0 40 52" aria-hidden="true"><path d="M20 2C10 2 2 18 2 31a18 18 0 0 0 36 0C38 18 30 2 20 2z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';

  /* Foto ampliada */
  var lb = $("lightbox"), lbImg = $("lightboxImg"), lbCap = $("lightboxCap"), lbLast = null;
  function openLightbox(src, alt, cap, from) {
    lbLast = from || null; lbImg.src = src; lbImg.alt = alt || ""; lbCap.textContent = cap || "";
    lb.hidden = false; document.body.classList.add("no-scroll"); $("lightboxClose").focus();
  }
  function closeLightbox() { lb.hidden = true; lbImg.removeAttribute("src"); document.body.classList.remove("no-scroll"); if (lbLast) lbLast.focus(); }
  $("lightboxClose").addEventListener("click", closeLightbox);
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLightbox(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !lb.hidden) closeLightbox(); });

  function normImgs(p) { return (p.images || (p.image ? [p.image] : [])).map(function (i) { return typeof i === "string" ? { src: i } : i; }); }
  function imgEl(i, alt, eager) {
    var img = document.createElement("img"); img.src = i.src; img.alt = alt; img.decoding = "async"; if (!eager) img.loading = "lazy";
    if (i.w && i.h) { img.width = i.w; img.height = i.h; } return img;
  }

  function buildMedia(p) {
    var imgs = normImgs(p), name = L(p.name), media = document.createElement("div"); media.className = "prod__media";
    if (!imgs.length) { media.innerHTML = PLACEHOLDER; }
    else if (imgs.length === 1) {
      var z = document.createElement("button"); z.type = "button"; z.className = "prod__zoom"; z.setAttribute("aria-label", "Ver foto grande: " + name);
      z.appendChild(imgEl(imgs[0], name, false));
      z.onclick = function () { openLightbox(imgs[0].src, name, name, z); }; media.appendChild(z);
    } else {                                                   // carrusel con varias fotos
      media.classList.add("prod__media--carousel");
      var car = document.createElement("div"); car.className = "carousel";
      var track = document.createElement("div"); track.className = "carousel__track"; track.tabIndex = 0;
      track.setAttribute("role", "region"); track.setAttribute("aria-label", "Fotos de " + name);
      var dots = document.createElement("div"); dots.className = "carousel__dots";
      imgs.forEach(function (i, k) {
        var s = document.createElement("button"); s.type = "button"; s.className = "carousel__slide"; s.setAttribute("aria-label", "Ampliar foto " + (k + 1) + " de " + imgs.length + ": " + name);
        s.appendChild(imgEl(i, name + " (foto " + (k + 1) + ")", k === 0)); s.onclick = function () { openLightbox(i.src, name, name + " · foto " + (k + 1) + " de " + imgs.length, s); };
        track.appendChild(s);
        var d = document.createElement("button"); d.type = "button"; d.className = "carousel__dot"; d.setAttribute("aria-label", "Ir a la foto " + (k + 1));
        d.onclick = function () { track.scrollTo({ left: track.clientWidth * k, behavior: "smooth" }); }; dots.appendChild(d);
      });
      function sync() { var k = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1)); Array.prototype.forEach.call(dots.children, function (d, j) { d.classList.toggle("is-on", j === k); }); }
      track.addEventListener("scroll", function () { requestAnimationFrame(sync); }, { passive: true }); sync();
      function nav(dir, label, txt) { var b = document.createElement("button"); b.type = "button"; b.className = "carousel__nav carousel__nav--" + (dir < 0 ? "prev" : "next"); b.setAttribute("aria-label", label); b.textContent = txt; b.onclick = function () { track.scrollBy({ left: dir * track.clientWidth, behavior: "smooth" }); }; return b; }
      car.appendChild(track); car.appendChild(nav(-1, "Foto anterior", "‹")); car.appendChild(nav(1, "Foto siguiente", "›")); car.appendChild(dots); media.appendChild(car);
    }
    if (p.provisional) { var bd = document.createElement("span"); bd.className = "badge"; bd.textContent = I.t("prov"); media.appendChild(bd); }
    return media;
  }

  function buildCard(p, orderable) {
    var card = document.createElement("article");
    card.className = "prod" + (orderable ? "" : " is-off");
    card.appendChild(buildMedia(p));
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
        var set = function (n) { n = O.clampQty(n); if (n) selection[k] = n; else delete selection[k]; out.textContent = n; renderOrder(); };
        minus.onclick = function () { set((selection[k] || 0) - 1); };
        plus.onclick = function () { set((selection[k] || 0) + 1); };
        q.appendChild(minus); q.appendChild(out); q.appendChild(plus); row.appendChild(q);
      } else { var s = document.createElement("span"); s.className = "soldout"; s.textContent = I.t("soldout"); row.appendChild(s); }
      body.appendChild(row);
    });
    card.appendChild(body); return card;
  }

  function renderCatalog() {
    var visible = O.visibleProducts(CAT, preview);
    var banner = $("previewBanner");
    banner.hidden = !(preview && visible.some(function (p) { return p.provisional; }));
    banner.textContent = I.t("preview");
    CATS.forEach(function (cat) {
      var box = $("catalog-" + cat), empty = $("empty-" + cat); if (!box) return;
      box.textContent = "";
      var list = visible.filter(function (p) { return (p.category || "huevos") === cat; });
      if (empty) empty.hidden = list.length > 0;
      list.forEach(function (p) { box.appendChild(buildCard(p, O.isOrderable(p, preview))); });
    });
    renderOrder();
  }

  /* ---------- Resumen y WhatsApp ---------- */
  function renderOrder() {
    var lines = O.buildLines(CAT, selection, I.lang, preview);
    var panel = $("order");
    var count0 = lines.reduce(function (s, l) { return s + l.qty; }, 0);
    panel.hidden = count0 === 0;
    if (count0 === 0 && openPanel) { openPanel = false; panel.classList.remove("is-open"); document.body.classList.remove("order-open"); $("orderBar").setAttribute("aria-expanded", "false"); }
    var count = lines.reduce(function (s, l) { return s + l.qty; }, 0);
    $("orderCount").textContent = count;
    var t = O.total(lines);
    $("orderTotalBar").textContent = t !== null ? O.formatCOP(t) : "";
    var ul = $("orderLines"); ul.textContent = "";
    if (!lines.length) { var li = document.createElement("li"); li.className = "empty"; li.textContent = I.t("empty"); ul.appendChild(li); }
    lines.forEach(function (l) {
      var li = document.createElement("li");
      var a = document.createElement("span"); a.textContent = l.qty + " × " + l.name + (l.presentation && !/por confirmar/i.test(l.presentation) ? " · " + l.presentation : "");
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
    var quick = $("quick");
    if (quick) {
      quick.hidden = count === 0;
      if (count > 0) {
        var sum = $("quickSum"); sum.textContent = "";
        var what = document.createElement("span"); what.textContent = "Tu pedido: " + lines.map(function (l) { return l.qty + " × " + l.name + (l.presentation && !/por confirmar/i.test(l.presentation) ? " (" + l.presentation + ")" : ""); }).join(" · ");
        var tot = document.createElement("b"); tot.textContent = t !== null ? "Total: " + O.formatCOP(t) : "Total: lo confirma Dagoberto";
        sum.appendChild(what); sum.appendChild(tot);
        var qa = $("quickWa"); if (url) { qa.href = url; qa.hidden = false; } else { qa.removeAttribute("href"); qa.hidden = true; }
      }
    }
    $("orderFine").textContent = !numberOk ? I.t("noWa") : I.t("fine");
    if (numberOk && url) $("orderFine").textContent = I.t("fine");
  }

  $("orderBar").addEventListener("click", function () {
    openPanel = !openPanel;
    $("order").classList.toggle("is-open", openPanel);
    document.body.classList.toggle("order-open", openPanel);
    $("orderBar").setAttribute("aria-expanded", String(openPanel));
  });
  $("orderNotes").addEventListener("input", renderOrder);
  I.onChange(renderCatalog);
  window.LolitaApp = { refresh: renderCatalog };
  I.apply();
})();

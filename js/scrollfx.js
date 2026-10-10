/* Efectos ligados al scroll para las secciones de después del inicio.
   Un solo bucle rAF para todo; usa `translate` (no `transform`) para no chocar con otras animaciones.
   - [data-words]   las palabras se iluminan una a una al avanzar
   - [data-parallax] desplazamiento vertical según la posición (factor)
   - .steps         la línea de la cronología se llena
   - [data-walk]    una gallina cruza la pantalla caminando
   - [data-rise]    el sol del cierre sube */
(function () {
  "use strict";
  var vh = window.innerHeight, ticking = false;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  // Titular del inicio: entra palabra por palabra
  var h1 = document.querySelector(".hero h1");
  if (h1 && !h1.dataset.split) {
    h1.dataset.split = "1";
    var words = h1.textContent.trim().split(/\s+/);
    h1.setAttribute("aria-label", h1.textContent.trim());
    h1.innerHTML = words.map(function (w, i) { return '<span class="wd" aria-hidden="true" style="animation-delay:' + (0.15 + i * 0.12).toFixed(2) + 's">' + w + "</span>"; }).join(" ");
  }

  // Palabras que se iluminan
  var wordEls = $$("[data-words]").map(function (el) {
    var txt = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = txt.map(function (w) { return '<span class="wl" aria-hidden="true">' + w + "</span>"; }).join(" ");
    return { el: el, spans: el.querySelectorAll(".wl"), lit: -1 };
  });
  var par = $$("[data-parallax]").map(function (el) { return { el: el, f: parseFloat(el.dataset.parallax) || 0.1 }; });
  var steps = $$(".steps");
  var walks = $$("[data-walk]").map(function (el) { return { el: el, hen: el.firstElementChild }; });
  var rises = $$("[data-rise]");

  function update() {
    ticking = false;
    vh = window.innerHeight;
    wordEls.forEach(function (w) {
      var r = w.el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      var p = clamp((vh * 0.86 - r.top) / (r.height + vh * 0.3), 0, 1), n = Math.round(p * w.spans.length);
      if (n === w.lit) return;
      for (var i = 0; i < w.spans.length; i++) w.spans[i].classList.toggle("on", i < n);
      w.lit = n;
    });
    par.forEach(function (p) {
      var r = p.el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      p.el.style.translate = "0 " + ((r.top + r.height / 2 - vh / 2) * -p.f).toFixed(1) + "px";
    });
    steps.forEach(function (s) {
      var r = s.getBoundingClientRect();
      s.style.setProperty("--fill", clamp((vh * 0.7 - r.top) / (r.height + vh * 0.1), 0, 1).toFixed(3));
    });
    walks.forEach(function (w) {
      var r = w.el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50 || !w.hen) return;
      var p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      w.hen.style.translate = ((r.width - w.hen.offsetWidth) * p).toFixed(1) + "px 0";
    });
    rises.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      el.style.setProperty("--rise", clamp((vh - r.top) / (vh * 0.9), 0, 1).toFixed(3));
    });
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener("scroll", req, { passive: true });
  window.addEventListener("resize", req, { passive: true });
  update();
})();

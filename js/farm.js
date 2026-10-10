/* Atmósfera de finca: gallinas ilustradas (SVG), partículas de polvo/paja y la escena del amanecer
   controlada por scroll (--p de 0 a 1). Todo se desactiva con prefers-reduced-motion. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var uid = 0;

  // Gallina en silueta, a contraluz, mirando a la derecha. La cabeza (.hen__head) pica con CSS.
  function henSVG() {
    var g = "hg" + (++uid);
    return '<svg viewBox="0 0 160 134" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="var(--hen-top,#4b2c16)"/><stop offset=".45" stop-color="var(--hen-mid,#1c110a)"/><stop offset="1" stop-color="var(--hen-bot,#0b0604)"/></linearGradient></defs>' +
      '<g stroke="var(--hen-leg,#0d0704)" stroke-width="2.6" stroke-linecap="round" fill="none">' +
        '<path d="M72 104 L70 126 M70 126 l-9 4 M70 126 l8 4 M70 126 l1 6"/><path d="M90 102 L90 126 M90 126 l-9 4 M90 126 l8 4 M90 126 l1 6"/></g>' +
      '<g fill="url(#' + g + ')">' +
        '<path d="M36 66 C24 58 14 40 12 20 C20 30 26 28 30 40 C28 26 35 20 41 29 C39 40 45 48 50 56Z"/>' +
        '<path d="M32 72 C16 70 6 56 4 42 C14 50 22 52 35 58Z"/>' +
        '<path d="M30 74 C28 60 40 52 58 52 C78 50 100 52 112 60 C124 66 124 82 114 94 C104 108 84 110 64 106 C44 102 32 92 30 74Z"/>' +
        '<g transform="translate(-3 17)"><g class="hen__head">' +
          '<path d="M104 60 C108 46 112 36 116 28 C120 17 133 15 137 24 C139 30 135 34 131 40 C127 50 125 58 121 66Z"/>' +
          '<circle cx="129" cy="22" r="8.5"/>' +
          '<path d="M122 15 c-1 -6 5 -8 6 -3 c2 -5 8 -3 6 3 c3 -2 6 1 3 5Z"/>' +
          '<path d="M136 22 L149 27 L136 30Z"/>' +
          '<path d="M132 31 c-1 7 5 7 4 0Z"/>' +
        '</g></g></g></svg>';
  }
  function mountHens() {
    document.querySelectorAll("[data-hen]").forEach(function (el) { if (!el.firstChild) el.innerHTML = henSVG(); });
  }

  function mountMotes() {
    if (reduce) return;
    document.querySelectorAll("[data-motes]").forEach(function (box) {
      var n = parseInt(box.getAttribute("data-motes"), 10) || 12;
      var html = "";
      for (var i = 0; i < n; i++) {
        var big = Math.random() < .22, left = Math.random() * 100, size = (big ? 7 : 2) + Math.random() * (big ? 6 : 3), dur = 9 + Math.random() * 12, delay = -Math.random() * 20, drift = (Math.random() - .5) * 120;
        html += '<i' + (big ? ' class="bokeh"' : '') + ' style="left:' + left.toFixed(1) + '%;width:' + size.toFixed(1) + 'px;height:' + size.toFixed(1) + 'px;animation-duration:' + dur.toFixed(1) + 's;animation-delay:' + delay.toFixed(1) + 's;--dx:' + drift.toFixed(0) + 'px"></i>';
      }
      box.innerHTML = html;
    });
  }

  // Escena del amanecer: progreso 0..1 → variable CSS --p y línea de texto activa
  function farmScroll() {
    var farm = document.getElementById("farm");
    if (!farm) return;
    var lines = farm.querySelectorAll(".farm__lines .h2");
    var ticking = false, inView = true, last = -1, lastLine = -1;
    function update() {
      ticking = false;
      var r = farm.getBoundingClientRect(), span = farm.offsetHeight - window.innerHeight;
      var p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 1;
      if (reduce) p = 0.7;
      if (Math.abs(p - last) > 0.0006) { last = p; farm.style.setProperty("--p", p.toFixed(4)); }
      var li = p < 0.34 ? 0 : p < 0.67 ? 1 : 2;
      if (li !== lastLine) { lastLine = li; for (var i = 0; i < lines.length; i++) lines[i].classList.toggle("is-on", i === li); }
    }
    function req() { if (!ticking && inView) { ticking = true; requestAnimationFrame(update); } }
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { inView = e[0].isIntersecting; if (inView) req(); }, { rootMargin: "200px 0px" }).observe(farm);
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("resize", req, { passive: true });
    update();
  }

  function init() { mountHens(); mountMotes(); farmScroll(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();

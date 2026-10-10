/* Atmósfera de finca: gallinas ilustradas (SVG), partículas de polvo/paja y la escena del amanecer
   controlada por scroll (--p de 0 a 1). Todo se desactiva con prefers-reduced-motion. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var uid = 0;

  // Gallina mirando a la derecha. La cabeza (.hen__head) pica con CSS.
  function henSVG() {
    var g = "hg" + (++uid);
    return '<svg viewBox="0 0 130 112" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="var(--hen-top,#c98a46)"/><stop offset=".55" stop-color="var(--hen-mid,#8a4f27)"/><stop offset="1" stop-color="var(--hen-bot,#4a2916)"/></linearGradient></defs>' +
      '<g class="hen__legs" stroke="var(--hen-leg,#d9a441)" stroke-width="3.2" stroke-linecap="round" fill="none">' +
        '<path d="M58 86 L56 106 M56 106 l-8 3 M56 106 l6 4 M56 106 l1 5"/><path d="M72 86 L72 106 M72 106 l-8 3 M72 106 l6 4 M72 106 l1 5"/></g>' +
      '<path d="M24 50 C8 44 4 24 10 10 C18 20 24 24 36 32Z" fill="url(#' + g + ')"/>' +
      '<path d="M22 58 C6 56 0 40 2 30 C12 38 20 42 30 46Z" fill="url(#' + g + ')" opacity=".9"/>' +
      '<path d="M20 52 C20 34 44 26 68 32 C86 36 96 50 93 64 C90 80 70 90 50 88 C30 86 20 72 20 52Z" fill="url(#' + g + ')"/>' +
      '<path d="M38 56 C48 46 68 46 80 56 C72 72 50 76 38 56Z" fill="#fff" opacity=".14"/>' +
      '<g class="hen__head">' +
        '<path d="M76 44 C82 32 88 22 90 16 C94 11 105 13 105 22 C105 28 100 34 96 42 C92 52 84 54 76 52Z" fill="url(#' + g + ')"/>' +
        '<circle cx="98" cy="19" r="9.5" fill="var(--hen-head,#a9622f)"/>' +
        '<g fill="#d8362b"><circle cx="93" cy="8.5" r="4.2"/><circle cx="99" cy="6.5" r="4.6"/><circle cx="105" cy="9.5" r="3.8"/></g>' +
        '<path d="M107 17 L121 22 L107 26Z" fill="#e6b94f"/>' +
        '<path d="M101 27 C100 35 106 35 105 27Z" fill="#d8362b"/>' +
        '<circle cx="101" cy="17" r="1.8" fill="#1a0f08"/>' +
      '</g></svg>';
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
        var left = Math.random() * 100, size = 2 + Math.random() * 4, dur = 9 + Math.random() * 12, delay = -Math.random() * 20, drift = (Math.random() - .5) * 120;
        html += '<i style="left:' + left.toFixed(1) + '%;width:' + size.toFixed(1) + 'px;height:' + size.toFixed(1) + 'px;animation-duration:' + dur.toFixed(1) + 's;animation-delay:' + delay.toFixed(1) + 's;--dx:' + drift.toFixed(0) + 'px"></i>';
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

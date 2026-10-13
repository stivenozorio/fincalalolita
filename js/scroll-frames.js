/* Hero cinematográfico: el scroll controla una secuencia de fotogramas dibujada en <canvas>.
   Por qué fotogramas y no <video>: Safari/iOS limita y retrasa los seeks de currentTime
   (y no carga video sin gesto del usuario). Un canvas con imágenes WebP responde igual de
   bien en Safari, Chrome, Firefox y celulares de gama media, en ambos sentidos del scroll.
   - Carga progresiva: primero fotogramas espaciados (ya se puede navegar), luego se rellenan.
   - Mezcla suave entre fotogramas vecinos, salvo en los cortes duros del material original.
   - Un solo bucle rAF activo solo mientras hay scroll o suavizado pendiente.
   - Sin WebP/errores/ahorro de datos → fotos fijas de las 5 escenas. El scroll siempre mueve el video: es movimiento que controla la persona, no uno automático
   (con "Reducir movimiento" solo se apagan las animaciones que corren solas). */
(function () {
  "use strict";
  /* Videos disponibles. Por defecto se usa DEFAULT_VARIANT (hoy "b"); para ver el otro: añadir ?video=a (o ?video=b) al enlace.
     Para cambiar el video de todos los visitantes basta con cambiar DEFAULT_VARIANT (y el póster/fotos/textos del HTML). */
  var VARIANTS = {
    a: { dir: "assets/frames/", n: 300, cuts: [60, 120, 180, 240],     // nido → huevo → mesa (5 clips con cortes duros) — video anterior, disponible con ?video=a
         poster: "assets/img/poster.jpg",
         stills: ["assets/img/scene-1.jpg", "assets/img/scene-2.jpg", "assets/img/scene-3.jpg", "assets/img/scene-4.jpg", "assets/img/scene-5.jpg"],
         captions: [["Origen", "Toda historia empieza pequeña."], ["Cuidado", "Sostenido con cuidado."], ["Hogar", "Hecho para la mesa familiar."], ["Calidez", "Mañanas cálidas, sin prisa."], ["Juntos", "Compartido con quienes queremos."]] },
    b: { dir: "assets/frames-b/", n: 240, cuts: [],                       // un solo plano continuo: huevo → cáscara → yema → finca
         poster: "assets/img/poster-b.jpg",
         stills: ["assets/img/scene-b-1.jpg", "assets/img/scene-b-2.jpg", "assets/img/scene-b-3.jpg", "assets/img/scene-b-4.jpg", "assets/img/scene-b-5.jpg"],
         captions: [["Origen", "Todo empieza con un huevo."], ["Cuidado", "Sostenido con cuidado."], ["Despertar", "Y de pronto, todo se abre."], ["Dentro", "Allí empieza la vida del día."], ["Finca", "Siempre se vuelve a la finca."]] }
  };
  var DEFAULT_VARIANT = "b";
  var qv = /[?&]video=(\w+)/.exec(location.search);
  var VAR = VARIANTS[(qv && qv[1]) || DEFAULT_VARIANT] || VARIANTS[DEFAULT_VARIANT];
  var N = VAR.n, DIR = VAR.dir, CUTS = VAR.cuts;   // CUTS: índices donde empieza un clip nuevo (corte duro); vacío = plano continuo
  var SCENES = 5, MAX_W = 1920, CONC = 6;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function pad(n) { return ("000" + n).slice(-4); }

  function init() {
    var hero = document.getElementById("top");
    if (!hero) return;
    var canvas = hero.querySelector(".hero__canvas");
    var ctx = canvas && canvas.getContext && canvas.getContext("2d", { alpha: false });
    var scenes = hero.querySelectorAll(".hero__scenes img");
    var chapters = hero.querySelectorAll(".hero__chapters li");
    var intro = document.getElementById("heroIntro");
    var endBtn = document.getElementById("heroEnd");
    var hint = document.getElementById("heroHint");
    var bar = document.getElementById("heroBar");
    var cutEl = hero.querySelector(".hero__cut");
    var loading = document.getElementById("heroLoading");
    var stage = hero.querySelector(".hero__stage");

    if (VAR.poster) { var po = hero.querySelector(".hero__poster"); if (po) po.src = VAR.poster; }
    if (VAR.stills) for (var si = 0; si < scenes.length && si < VAR.stills.length; si++) scenes[si].src = VAR.stills[si];
    if (VAR.captions) for (var ci = 0; ci < chapters.length && ci < VAR.captions.length; ci++) {
      var cs = chapters[ci].querySelector("span"), cb = chapters[ci].querySelector("b");
      if (cs) cs.textContent = VAR.captions[ci][0]; if (cb) cb.textContent = VAR.captions[ci][1];
    }

    var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    var conn = navigator.connection || {};
    var mode = "frames";
    var frames = new Array(N), loaded = 0, ready = false, started = false, failed = 0;
    var target = 0, current = 0, raf = 0, listening = false, inView = true, lastScene = -1;
    var cw = 0, ch = 0, lastDrawn = -1, dirty = true;

    function setMode(m) { mode = m; hero.dataset.mode = m; if (m !== "frames") loading.hidden = true; }

    /* ---------- carga progresiva ---------- */
    function order() {
      var seen = {}, out = [];
      [25, 5, 1].forEach(function (step) {
        for (var i = 0; i < N; i += step) if (!seen[i]) { seen[i] = 1; out.push(i); }
      });
      out.push(N - 1);
      return out;
    }
    function loadFrames() {
      var queue = order(), active = 0, firstBatch = 10, gotFirst = 0;
      function next() {
        while (active < CONC && queue.length) {
          (function (idx) {
            if (frames[idx]) return;
            active++;
            var img = new Image();
            img.decoding = "async";
            img.onload = function () {
              frames[idx] = img; loaded++; active--; dirty = true;
              if (!ready && ++gotFirst >= firstBatch) { ready = true; hero.classList.add("is-ready"); loading.hidden = true; }
              request(); next();
            };
            img.onerror = function () {
              active--; failed++;
              if (failed > 8 && loaded < 3) { fallbackStills(); return; }
              next();
            };
            img.src = DIR + "f" + pad(idx + 1) + ".webp";
          })(queue.shift());
        }
      }
      next();
      setTimeout(function () { if (!ready && loaded < 3) fallbackStills(); }, 12000);
    }
    function fallbackStills() { if (mode === "stills") return; setMode("stills"); hero.classList.add("is-ready"); request(); }

    /* ---------- dibujo ---------- */
    function size() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 3);   // 3× para que el celular dibuje a su resolución real y no estire la imagen
      var w = Math.round(Math.min(r.width * dpr, MAX_W)), h = Math.round(w * r.height / Math.max(r.width, 1));
      if (Math.abs(w - cw) > 2 || Math.abs(h - ch) > 120) {   // ignora la barra de URL de iOS (cambios pequeños de alto)
        cw = canvas.width = w; ch = canvas.height = h; dirty = true;
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      }
    }
    function nearest(i) {
      for (var d = 0; d < N; d++) {
        if (frames[i - d]) return frames[i - d];
        if (frames[i + d]) return frames[i + d];
      }
      return null;
    }
    if (ctx) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high"; }   // reescalado de mayor calidad
    function cover(img, alpha) {
      var iw = img.naturalWidth, ih = img.naturalHeight, s = Math.max(cw / iw, ch / ih);
      var w = iw * s, h = ih * s;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    }
    function draw(pos) {
      if (!ctx || !ready) return;
      var i = Math.min(N - 1, Math.floor(pos)), f = pos - i;
      var key = Math.round(pos * 20);
      if (!dirty && key === lastDrawn) return;
      lastDrawn = key; dirty = false;
      var a = nearest(i); if (!a) return;
      cover(a, 1);
      var blend = f > 0.02 && i + 1 < N && CUTS.indexOf(i + 1) === -1 && frames[i + 1] && frames[i]; // mezcla entre fotogramas reales
      if (blend) cover(frames[i + 1], f);
      ctx.globalAlpha = 1;
    }

    /* ---------- progreso y UI ---------- */
    function readProgress() {
      var r = hero.getBoundingClientRect();
      var span = hero.offsetHeight - window.innerHeight;
      return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
    }
    function paint(p) {
      var scene = Math.min(SCENES - 1, Math.floor(p * SCENES));
      var introOp = 1 - clamp((p - 0.04) / 0.06, 0, 1);
      intro.style.opacity = introOp;
      intro.style.transform = "translate3d(0," + (-(1 - introOp) * 24).toFixed(1) + "px,0)";
      intro.style.visibility = introOp <= 0 ? "hidden" : "visible";
      hint.style.opacity = 1 - clamp(p / 0.03, 0, 1);
      var endOp = clamp((p - 0.9) / 0.06, 0, 1);
      endBtn.style.opacity = endOp;
      endBtn.style.visibility = endOp <= 0 ? "hidden" : "visible";
      bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
      var sc = p > 0.115 ? scene : -1;
      if (sc !== lastScene) {
        for (var i = 0; i < chapters.length; i++) chapters[i].classList.toggle("is-on", i === sc);
        lastScene = sc;
      }
      var d = 1, pc;
      for (var c = 0; c < CUTS.length; c++) { pc = CUTS[c] / N; d = Math.min(d, Math.abs(p - pc)); }
      cutEl.style.opacity = d < 0.016 ? (1 - d / 0.016).toFixed(3) : 0;   // velo breve que suaviza el corte
      if (mode === "stills") { for (var k = 0; k < scenes.length; k++) scenes[k].style.opacity = k === scene ? 1 : 0; }
      else if (mode === "frames") draw(p * (N - 1));
    }
    function tick() {
      raf = 0;
      target = readProgress();
      var diff = target - current;
      current = Math.abs(diff) < 0.0003 ? target : current + diff * 0.25;   // inercia ligera; converge y se detiene
      paint(current);
      if (current !== target) raf = requestAnimationFrame(tick);
    }
    function request() { if (!raf && inView && mode !== "static") raf = requestAnimationFrame(tick); }
    function onResize() { if (mode === "frames" && ctx) size(); request(); }
    function listen() {
      if (listening) return; listening = true;
      window.addEventListener("scroll", request, { passive: true });
      window.addEventListener("resize", onResize, { passive: true });
      window.addEventListener("orientationchange", onResize);
    }
    function unlisten() {
      listening = false;
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (raf) cancelAnimationFrame(raf); raf = 0;
    }

    function start() {
      if (conn.saveData === true || (conn.effectiveType && /(^|-)2g$/.test(conn.effectiveType)) || !ctx) {
        setMode("stills"); listen(); hero.classList.add("is-ready"); request(); return;
      }
      setMode("frames"); loading.hidden = false;
      size(); listen();
      if (!started) { started = true; loadFrames(); }
      request();
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { inView = e[0].isIntersecting; if (inView) request(); }, { rootMargin: "100px 0px" }).observe(hero);
    }
    window.LolitaHero = { destroy: unlisten };
    start();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();

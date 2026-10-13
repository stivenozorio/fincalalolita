/* "Ventana del huevo" de la historia: al bajar, la cámara sale de la yema hacia la finca.
   Reutiliza los fotogramas del video del inicio (assets/frames-b, ya guardados en caché por el navegador).
   Si algo falla, queda la imagen nítida de la finca (story-finca.webp) que ya está dentro del huevo. */
(function () {
  "use strict";
  var fig = document.querySelector(".story__img--a");
  var canvas = fig && fig.querySelector(".egg__canvas");
  var ctx = canvas && canvas.getContext && canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  var DIR = "assets/frames-b/", FROM = 168, TO = 236, STEP = 2;   // yema dentro de la burbuja → la finca
  var idx = []; for (var i = FROM; i <= TO; i += STEP) idx.push(i);
  var N = idx.length, frames = new Array(N), started = false, active = false, ticking = false, cw = 0, ch = 0, lastKey = -1;
  var FX_START = 0.5, FX_END = 0.6;                              // el recorte vertical se desplaza hacia el granero

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function pad(n) { return ("000" + n).slice(-4); }

  function load() {
    if (started) return; started = true;
    var queue = idx.map(function (v, k) { return k; }), running = 0;
    (function next() {
      while (running < 4 && queue.length) {
        (function (k) {
          running++;
          var img = new Image(); img.decoding = "async";
          img.onload = function () { frames[k] = img; running--; lastKey = -1; req(); next(); };
          img.onerror = function () { running--; next(); };
          img.src = DIR + "f" + pad(idx[k]) + ".webp";
        })(queue.shift());
      }
    })();
  }

  function size() {
    var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (w > 0 && (Math.abs(w - cw) > 2 || Math.abs(h - ch) > 2)) {
      cw = canvas.width = w; ch = canvas.height = h; lastKey = -1;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    }
  }
  function nearest(k) {
    for (var d = 0; d < N; d++) { if (frames[k - d]) return frames[k - d]; if (frames[k + d]) return frames[k + d]; }
    return null;
  }
  function cover(img, alpha, fx) {
    var s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight), w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.globalAlpha = alpha; ctx.drawImage(img, -(w - cw) * fx, (ch - h) / 2, w, h);
  }
  function progress() {
    var r = fig.getBoundingClientRect(), vh = window.innerHeight;
    return clamp((vh * 0.92 - r.top) / (r.height + vh * 0.5), 0, 1);
  }
  function draw() {
    ticking = false; if (!active) return;
    size(); if (!cw) return;
    var p = progress(), pos = p * (N - 1), k = Math.min(N - 1, Math.floor(pos)), f = pos - k, key = Math.round(pos * 24) + cw;
    if (key === lastKey) return; lastKey = key;
    var a = nearest(k); if (!a) return;
    var fx = FX_START + (FX_END - FX_START) * p;
    cover(a, 1, fx);
    if (f > 0.03 && frames[k + 1] && frames[k]) cover(frames[k + 1], f, fx);
    ctx.globalAlpha = 1;
    fig.classList.add("is-live");
  }
  function req() { if (!ticking && active) { ticking = true; requestAnimationFrame(draw); } }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { active = e[0].isIntersecting; if (active) { load(); req(); } }, { rootMargin: "700px 0px" }).observe(fig);
  } else { active = true; load(); }
  window.addEventListener("scroll", req, { passive: true });
  window.addEventListener("resize", function () { lastKey = -1; req(); }, { passive: true });
})();

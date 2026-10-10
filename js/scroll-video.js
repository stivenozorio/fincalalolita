/* Hero cinematográfico: el progreso del scroll controla el tiempo del video.
   - Bajar avanza, subir retrocede, al detenerse queda en el fotograma correspondiente.
   - Un solo bucle rAF, activo solo mientras hay trabajo (scroll o suavizado en curso).
   - El video está codificado con todos los fotogramas clave (all-intra) para que el seek sea instantáneo.
   - Fallback: si el video falla / ahorro de datos → fotos fijas de las escenas fundidas por scroll.
   - prefers-reduced-motion → sin sticky ni scrub: póster estático con el texto. */
(function () {
  "use strict";

  var CUTS = [0.2, 0.4, 0.6, 0.8];       // cortes duros del material (5 clips de 5 s)
  var SCENES = 5;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function init() {
    var hero = document.getElementById("top");
    if (!hero) return;
    var video = hero.querySelector(".hero__video");
    var scenes = hero.querySelectorAll(".hero__scenes img");
    var chapters = hero.querySelectorAll(".hero__chapters li");
    var intro = document.getElementById("heroIntro");
    var endBtn = document.getElementById("heroEnd");
    var hint = document.getElementById("heroHint");
    var bar = document.getElementById("heroBar");
    var cut = hero.querySelector(".hero__cut");
    var loading = document.getElementById("heroLoading");

    var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    var conn = navigator.connection || {};
    var saveData = conn.saveData === true;

    var mode = "video";                  // "video" | "stills" | "static"
    var duration = 0, ready = false, failed = false;
    var target = 0, current = 0;         // progreso objetivo y suavizado (0..1)
    var raf = 0, listening = false, inView = true, lastScene = -1;

    function setMode(m) {
      mode = m;
      hero.dataset.mode = m;
      if (m !== "video") { loading.hidden = true; }
      if (m === "stills") for (var i = 0; i < scenes.length; i++) scenes[i].loading = "eager";
    }

    function readProgress() {
      var r = hero.getBoundingClientRect();
      var span = hero.offsetHeight - window.innerHeight;
      return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
    }

    function paint(p) {
      var scene = Math.min(SCENES - 1, Math.floor(p * SCENES));
      // Intro visible al inicio; botón final visible en la última escena
      var introOp = 1 - clamp((p - 0.04) / 0.06, 0, 1);
      intro.style.opacity = introOp;
      intro.style.transform = "translate3d(0," + (-(1 - introOp) * 24).toFixed(1) + "px,0)";
      intro.style.visibility = introOp <= 0 ? "hidden" : "visible";
      hint.style.opacity = 1 - clamp(p / 0.03, 0, 1);
      var endOp = clamp((p - 0.9) / 0.06, 0, 1);
      endBtn.style.opacity = endOp;
      endBtn.style.visibility = endOp <= 0 ? "hidden" : "visible";
      bar.style.transform = "scaleX(" + p.toFixed(4) + ")";

      if (scene !== lastScene) {
        for (var i = 0; i < chapters.length; i++) chapters[i].classList.toggle("is-on", i === scene && p > 0.08);
        lastScene = scene;
      } else if (p <= 0.08) {
        for (var j = 0; j < chapters.length; j++) chapters[j].classList.remove("is-on");
        lastScene = -1;
      }
      // Velo oscuro breve en cada corte: suaviza el salto entre clips (los cortes siguen siendo cortes)
      var d = 1;
      for (var c = 0; c < CUTS.length; c++) d = Math.min(d, Math.abs(p - CUTS[c]));
      cut.style.opacity = d < 0.018 ? (1 - d / 0.018).toFixed(3) : 0;

      if (mode === "stills") {
        for (var k = 0; k < scenes.length; k++) scenes[k].style.opacity = k === scene ? 1 : 0;
      } else if (mode === "video" && ready && duration) {
        var t = clamp(p * duration, 0, duration - 0.04);
        if (!video.seeking && Math.abs(video.currentTime - t) > 0.02) video.currentTime = t;
      }
    }

    function tick() {
      raf = 0;
      target = readProgress();
      var diff = target - current;
      // Suavizado ligero (inercia cinematográfica) que converge rápido y se detiene solo
      current = Math.abs(diff) < 0.0004 ? target : current + diff * 0.22;
      paint(current);
      if (current !== target) raf = requestAnimationFrame(tick);
    }
    function request() { if (!raf && inView && mode !== "static") raf = requestAnimationFrame(tick); }

    function listen() {
      if (listening) return; listening = true;
      window.addEventListener("scroll", request, { passive: true });
      window.addEventListener("resize", request, { passive: true });
      window.addEventListener("orientationchange", request);
    }
    function unlisten() {
      listening = false;
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      window.removeEventListener("orientationchange", request);
      if (raf) cancelAnimationFrame(raf); raf = 0;
    }

    function onReady() {
      if (ready || failed) return;
      duration = video.duration;
      if (!isFinite(duration) || duration <= 0) return;
      ready = true;
      hero.classList.add("is-ready");
      loading.hidden = true;
      current = target = readProgress();
      paint(current);
    }
    function onFail() {
      if (failed) return; failed = true;
      setMode("stills"); request();
    }

    function unlockIOS() {
      // Safari iOS no carga/busca fotogramas hasta que hay un gesto: un play()/pause() silencioso lo habilita.
      var p = video.play && video.play();
      if (p && p.then) p.then(function () { video.pause(); }).catch(function () {});
    }

    function start() {
      hero.classList.add("is-active");
      if (mqReduce.matches) { setMode("static"); unlisten(); paint(0); hero.classList.add("is-ready"); return; }
      var canPlay = video && (video.canPlayType('video/mp4; codecs="avc1.640020"') || video.canPlayType('video/webm; codecs="vp9"'));
      if (saveData || !canPlay || (conn.effectiveType && /(^|-)2g$/.test(conn.effectiveType))) {
        setMode("stills"); listen(); request(); hero.classList.add("is-ready"); return;
      }
      setMode("video");
      listen();
      loading.hidden = false;
      video.addEventListener("loadedmetadata", onReady);
      video.addEventListener("loadeddata", onReady);
      video.addEventListener("seeked", request);
      video.addEventListener("error", onFail);
      var srcs = video.querySelectorAll("source");     // el error "de verdad" llega en la última fuente
      if (srcs.length) srcs[srcs.length - 1].addEventListener("error", onFail);
      if (video.readyState >= 1) onReady();
      unlockIOS();
      var once = function () { unlockIOS(); window.removeEventListener("touchstart", once); window.removeEventListener("pointerdown", once); };
      window.addEventListener("touchstart", once, { passive: true });
      window.addEventListener("pointerdown", once, { passive: true });
      // Si tras 10 s no hay metadatos, usar fotos fijas
      setTimeout(function () { if (!ready) onFail(); }, 10000);
      request();
    }

    // Solo trabajar cuando el hero está cerca de la pantalla
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) {
        inView = e[0].isIntersecting;
        if (inView) request();
      }, { rootMargin: "100px 0px" }).observe(hero);
    }
    mqReduce.addEventListener && mqReduce.addEventListener("change", function () { start(); });

    window.LolitaHero = { destroy: unlisten };
    start();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();

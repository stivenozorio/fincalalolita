/* Indicador del precio de la cubeta: tarjeta con precio actual, flecha de sube/baja, variación y gráfico.
   Los datos vienen de api/price.php (los registra Dagoberto desde el panel). También lo usa el panel. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  function cop(n) { return "$" + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function signed(n) { return (n > 0 ? "+" : n < 0 ? "−" : "") + cop(n); }
  function pct(p) { return (p > 0 ? "+" : p < 0 ? "−" : "") + Math.abs(p).toFixed(2).replace(".", ",") + " %"; }
  function parts(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || ""); return m ? { y: +m[1], mo: +m[2] - 1, d: +m[3], h: +m[4], mi: m[5] } : null; }
  function dateLong(iso) { var p = parts(iso); if (!p) return ""; var h12 = p.h % 12 || 12; return p.d + " de " + MESES[p.mo] + " de " + p.y + ", " + h12 + ":" + p.mi + " " + (p.h < 12 ? "a. m." : "p. m."); }
  function dateShort(iso, prev) { var p = parts(iso), q = parts(prev); if (!p) return ""; if (q && q.y === p.y && q.mo === p.mo && q.d === p.d) return (p.h % 12 || 12) + ":" + p.mi + (p.h < 12 ? " a. m." : " p. m."); return p.d + " " + MESES[p.mo]; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function svg(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }

  var MESES_L = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  function dateDay(iso) { var p = parts(iso); return p ? p.d + " de " + MESES_L[p.mo] + " de " + p.y : ""; }
  function timeOf(iso) { var p = parts(iso); return p ? (p.h % 12 || 12) + ":" + p.mi + (p.h < 12 ? " a. m." : " p. m.") : ""; }

  var DIR = {
    up:    { arrow: "▲", word: "SUBIÓ",       verb: "Subió",   cls: "is-up" },
    down:  { arrow: "▼", word: "BAJÓ",        verb: "Bajó",    cls: "is-down" },
    same:  { arrow: "＝", word: "SIGUE IGUAL", verb: "Igual",   cls: "is-same" },
    first: { arrow: "●", word: "PRECIO DE HOY", verb: "Precio inicial", cls: "is-first" }
  };

  function chart(history) {
    var W = 480, H = 270, L = 74, R = 22, T = 34, B = 46;
    var pts = history.slice(-12);
    var prices = pts.map(function (e) { return e.price; });
    var lo = Math.min.apply(null, prices), hi = Math.max.apply(null, prices);
    var pad = Math.max(1000, (hi - lo) * 0.3); lo = Math.max(0, lo - pad); hi = hi + pad;
    var x = function (i) { return pts.length === 1 ? (L + W - R) / 2 : L + (W - L - R) * i / (pts.length - 1); };
    var y = function (v) { return T + (H - T - B) * (1 - (v - lo) / (hi - lo)); };
    var s = svg("svg", { viewBox: "0 0 " + W + " " + H, class: "pchart__svg", role: "img", "aria-label": "Gráfico del precio de la cubeta. Cada punto es un precio; verde sube, rojo baja." });
    for (var g = 0; g <= 2; g++) {
      var gv = lo + (hi - lo) * g / 2, gy = y(gv);
      s.appendChild(svg("line", { x1: L, x2: W - R, y1: gy, y2: gy, class: "pchart__grid" }));
      var lab = svg("text", { x: L - 10, y: gy + 5, class: "pchart__ytick", "text-anchor": "end" }); lab.textContent = cop(Math.round(gv / 500) * 500); s.appendChild(lab);
    }
    var d = pts.map(function (e, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(e.price).toFixed(1); }).join(" ");
    if (pts.length > 1) { s.appendChild(svg("path", { d: d, class: "pchart__line" })); }
    var step = Math.max(1, Math.ceil(pts.length / 4));
    pts.forEach(function (e, i) {
      var dir = DIR[e.direction] || DIR.same, last = i === pts.length - 1;
      var dot = svg("circle", { cx: x(i).toFixed(1), cy: y(e.price).toFixed(1), r: last ? 11 : 8, class: "pchart__dot " + dir.cls });
      var tip = svg("title", {}); tip.textContent = dateLong(e.at) + " · " + cop(e.price) + " · " + dir.verb; dot.appendChild(tip); s.appendChild(dot);
      if (last) {
        var v = svg("text", { x: Math.min(x(i), W - R - 30).toFixed(1), y: (y(e.price) - 20).toFixed(1), class: "pchart__now", "text-anchor": "middle" }); v.textContent = cop(e.price); s.appendChild(v);
      }
      if (i % step === 0 || last) {
        var xl = svg("text", { x: x(i).toFixed(1), y: H - 14, class: "pchart__xtick", "text-anchor": pts.length === 1 ? "middle" : (i === 0 ? "start" : last ? "end" : "middle") });
        xl.textContent = dateShort(e.at, i ? pts[i - 1].at : null); s.appendChild(xl);
      }
    });
    return s;
  }

  function historyList(history) {
    var ul = el("ul", "phist");
    history.slice().reverse().forEach(function (e) {
      var dir = DIR[e.direction] || DIR.same, li = el("li", "phist__row " + dir.cls);
      var when = el("span", "phist__when"); when.appendChild(el("b", "", dateDay(e.at))); when.appendChild(el("small", "", timeOf(e.at))); li.appendChild(when);
      li.appendChild(el("span", "phist__price", cop(e.price)));
      li.appendChild(el("span", "phist__chg", e.direction === "first" ? "Precio inicial" : e.direction === "same" ? "＝ Igual" : dir.arrow + " " + dir.verb + " " + cop(e.delta) + " (" + pct(Math.abs(e.pct)) + ")"));
      ul.appendChild(li);
    });
    return ul;
  }

  /** Dibuja la tarjeta completa dentro de `root`. */
  function render(root, data, opts) {
    opts = opts || {};
    var c = data.current, dir = DIR[c.direction] || DIR.same, moved = c.direction === "up" || c.direction === "down";
    root.textContent = "";
    root.appendChild(el("p", "pcard__label", "Precio de hoy · cubeta de huevos"));
    var big = el("p", "pcard__price"); big.appendChild(el("span", "", cop(c.price))); big.appendChild(el("small", "", "por cada cubeta")); root.appendChild(big);

    var st = el("div", "pstate " + dir.cls);
    st.appendChild(el("span", "pstate__arrow", dir.arrow));
    var tx = el("div", "pstate__text"); tx.appendChild(el("b", "", dir.word));
    if (moved) { tx.appendChild(el("span", "", "Antes costaba " + cop(c.price - c.delta) + ". Ahora cuesta " + cop(c.price) + ".")); tx.appendChild(el("span", "pstate__diff", dir.verb + " " + cop(c.delta) + " (" + pct(Math.abs(c.pct)) + ")")); }
    else if (c.direction === "same") { tx.appendChild(el("span", "", "El precio no cambió frente al anterior.")); }
    else { tx.appendChild(el("span", "", "Cuando el precio cambie, aquí verás si subió o bajó y cuánto.")); }
    st.appendChild(tx); root.appendChild(st);

    root.appendChild(el("p", "pcard__date", "Última actualización: " + dateDay(c.at) + ", " + timeOf(c.at)));

    root.appendChild(el("h3", "pcard__sub", "Así ha cambiado el precio"));
    var wrap = el("div", "pchart"); wrap.appendChild(chart(data.history)); root.appendChild(wrap);
    var leg = el("p", "pchart__legend");
    [["is-up", "▲ Subió"], ["is-down", "▼ Bajó"], ["is-same", "＝ Igual"]].forEach(function (l) { leg.appendChild(el("span", l[0], l[1])); });
    root.appendChild(leg);
    if (data.count > 1) {
      var det = el("details", "pdet"); if (opts.open) det.open = true;
      det.appendChild(el("summary", "", "Ver todos los precios anteriores (" + data.count + ")"));
      det.appendChild(historyList(data.history)); root.appendChild(det);
    }
    root.appendChild(el("p", "pcard__note", "El precio puede cambiar. Dagoberto siempre te confirma el valor final por WhatsApp."));
  }

  function load(url) {
    return fetch(url, { cache: "no-store", credentials: "same-origin" }).then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (d) { if (!d || !d.ok || !d.current) throw new Error("datos"); return d; });
  }

  /* Conecta el precio vivo con el producto "Huevos de gallina" del catálogo (el pedido por WhatsApp usa este valor). */
  function applyToCatalog(d) {
    var cat = window.LOLITA_CATALOG; if (!cat) return;
    cat.products.forEach(function (p) {
      if (p.id !== "huevos-gallina") return;
      p.description = { es: "Huevos frescos de la finca, por cubeta. El precio se actualiza según el mercado; Dagoberto lo confirma al recibir tu pedido." };
      p.presentations = [{ id: "p1", label: { es: "Cubeta" }, price: d.current.price }];
    });
    if (window.LolitaApp && window.LolitaApp.refresh) window.LolitaApp.refresh();
  }

  var api = { render: render, load: load, cop: cop, signed: signed, pct: pct, dateLong: dateLong };
  window.LolitaPrice = api;

  var root = document.getElementById("priceCard");
  if (root) {
    load(root.getAttribute("data-src") || "api/price.php").then(function (d) { render(root, d); root.removeAttribute("aria-busy"); applyToCatalog(d); })
      .catch(function () { root.removeAttribute("aria-busy"); root.textContent = ""; root.appendChild(el("p", "pcard__note", "El precio de la cubeta no está disponible por ahora. Escríbenos por WhatsApp y Dagoberto te lo confirma.")); });
  }
})();

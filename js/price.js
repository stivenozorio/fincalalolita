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

  var DIR = {
    up:    { arrow: "▲", word: "Sube",   cls: "is-up" },
    down:  { arrow: "▼", word: "Baja",   cls: "is-down" },
    same:  { arrow: "=", word: "Sin cambios", cls: "is-same" },
    first: { arrow: "●", word: "Precio de referencia", cls: "is-first" }
  };

  function variationText(c) {
    if (c.direction === "first") return "Primer registro de precio.";
    if (c.direction === "same") return "Igual que el precio anterior.";
    return signed(c.delta) + " (" + pct(c.pct) + ") frente al precio anterior";
  }

  function chart(history) {
    var W = 640, H = 240, L = 62, R = 18, T = 20, B = 40;
    var pts = history.slice(-24);
    var prices = pts.map(function (e) { return e.price; });
    var lo = Math.min.apply(null, prices), hi = Math.max.apply(null, prices);
    var pad = Math.max(500, (hi - lo) * 0.25); lo = Math.max(0, lo - pad); hi = hi + pad;
    var x = function (i) { return pts.length === 1 ? (L + (W - R)) / 2 : L + (W - L - R) * i / (pts.length - 1); };
    var y = function (v) { return T + (H - T - B) * (1 - (v - lo) / (hi - lo)); };
    var s = svg("svg", { viewBox: "0 0 " + W + " " + H, class: "pchart__svg", role: "img", "aria-label": "Gráfico del precio de la cubeta en el tiempo" });
    for (var g = 0; g <= 3; g++) {
      var gv = lo + (hi - lo) * g / 3, gy = y(gv);
      s.appendChild(svg("line", { x1: L, x2: W - R, y1: gy, y2: gy, class: "pchart__grid" }));
      var lab = svg("text", { x: L - 8, y: gy + 4, class: "pchart__ytick", "text-anchor": "end" }); lab.textContent = cop(Math.round(gv / 100) * 100); s.appendChild(lab);
    }
    var d = pts.map(function (e, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(e.price).toFixed(1); }).join(" ");
    if (pts.length > 1) {
      s.appendChild(svg("path", { d: d + " L" + x(pts.length - 1).toFixed(1) + " " + (H - B) + " L" + x(0).toFixed(1) + " " + (H - B) + " Z", class: "pchart__area" }));
      s.appendChild(svg("path", { d: d, class: "pchart__line" }));
    }
    var step = Math.max(1, Math.ceil(pts.length / 6));
    pts.forEach(function (e, i) {
      var dir = DIR[e.direction] || DIR.same;
      var dot = svg("circle", { cx: x(i).toFixed(1), cy: y(e.price).toFixed(1), r: i === pts.length - 1 ? 7 : 5, class: "pchart__dot " + dir.cls });
      var tip = svg("title", {}); tip.textContent = dateLong(e.at) + " · " + cop(e.price) + (e.direction === "first" ? "" : " · " + dir.word.toLowerCase() + " " + variationText(e)); dot.appendChild(tip);
      s.appendChild(dot);
      if (i % step === 0 || i === pts.length - 1) {
        var xl = svg("text", { x: x(i).toFixed(1), y: H - 14, class: "pchart__xtick", "text-anchor": pts.length === 1 ? "middle" : (i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle") });
        xl.textContent = dateShort(e.at, i ? pts[i - 1].at : null); s.appendChild(xl);
      }
    });
    return s;
  }

  function historyTable(history) {
    var box = el("div", "phist"); var table = el("table", "phist__table");
    table.appendChild(el("caption", "sr-only", "Historial de precios de la cubeta"));
    var head = el("tr"); ["Fecha", "Precio", "Variación", "%"].forEach(function (h) { head.appendChild(el("th", "", h)).setAttribute("scope", "col"); });
    var thead = el("thead"); thead.appendChild(head); table.appendChild(thead);
    var tb = el("tbody");
    history.slice().reverse().forEach(function (e) {
      var dir = DIR[e.direction] || DIR.same, tr = el("tr");
      tr.appendChild(el("td", "", dateLong(e.at)));
      tr.appendChild(el("td", "", cop(e.price)));
      var v = el("td", "pv " + dir.cls, e.direction === "first" ? "—" : dir.arrow + " " + signed(e.delta)); tr.appendChild(v);
      tr.appendChild(el("td", "pv " + dir.cls, e.direction === "first" ? "—" : pct(e.pct)));
      tb.appendChild(tr);
    });
    table.appendChild(tb); box.appendChild(table); return box;
  }

  /** Dibuja la tarjeta completa dentro de `root`. opts.history = mostrar la tabla del historial. */
  function render(root, data, opts) {
    opts = opts || {};
    var c = data.current, dir = DIR[c.direction] || DIR.same;
    root.textContent = "";
    var top = el("div", "pcard__top");
    var main = el("div", "pcard__main");
    main.appendChild(el("p", "pcard__label", "Precio de la cubeta de huevos"));
    var big = el("p", "pcard__price"); big.appendChild(el("span", "", cop(c.price))); big.appendChild(el("small", "", " COP · por cubeta")); main.appendChild(big);
    main.appendChild(el("p", "pcard__date", "Actualizado el " + dateLong(c.at)));
    top.appendChild(main);
    var badge = el("div", "pbadge " + dir.cls);
    badge.appendChild(el("span", "pbadge__arrow", dir.arrow)); badge.setAttribute("aria-hidden", "true");
    top.appendChild(badge);
    root.appendChild(top);
    var moved = c.direction === "up" || c.direction === "down";
    var line = el("p", "pcard__var " + dir.cls);
    line.appendChild(el("b", "", moved ? dir.word + ": " : dir.word + ". "));
    line.appendChild(document.createTextNode(variationText(c)));
    root.appendChild(line);
    var wrap = el("div", "pchart"); wrap.appendChild(chart(data.history)); root.appendChild(wrap);
    var leg = el("p", "pchart__legend");
    [["is-up", "Sube"], ["is-down", "Baja"], ["is-same", "Igual"]].forEach(function (l) { var s = el("span", l[0], l[1]); leg.appendChild(s); });
    root.appendChild(leg);
    if (data.count > 1 || opts.history) {
      var det = el("details", "pdet"); if (opts.open) det.open = true;
      det.appendChild(el("summary", "", "Ver historial de precios (" + data.count + ")"));
      det.appendChild(historyTable(data.history)); root.appendChild(det);
    }
    root.appendChild(el("p", "pcard__note", "El precio de la cubeta puede variar. Dagoberto lo actualiza cuando cambia y siempre confirma el valor final al recibir tu pedido."));
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

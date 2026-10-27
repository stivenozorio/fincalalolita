/* Cuenta del cliente: entrar con enlace al correo, perfil (nombre, dirección, localidad), historial, puntos
   y pedido rápido con fecha y horario de entrega. El pedido siempre termina confirmándose por WhatsApp. */
(function () {
  "use strict";
  var SB = window.LolitaSB, APP = window.LolitaApp, CFG = window.LOLITA_CONFIG, O = window.LolitaOrder;
  if (!SB || !SB.ok || !APP) return;                       // sin Supabase la página funciona igual, solo como invitado
  var sb = SB.client, el = SB.el, cop = SB.cop;
  var EGG_KEY = "huevos-gallina::p1";

  var S = { tab: "", session: null, profile: null, zonas: [], locs: [], franjas: [], ajustes: {}, puntos: 0, pedidos: [], lines: [], total: null, busy: false,
            entrega: "programado", fecha: "", franja: "", ok: null };
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Datos públicos ---------- */
  function loadPublic() {
    return Promise.all([
      sb.from("zonas_envio").select("*").order("id"),
      sb.from("localidades").select("*").order("nombre"),
      sb.from("franjas").select("*").eq("activa", true).order("id"),
      sb.from("ajustes").select("*")
    ]).then(function (r) {
      S.zonas = r[0].data || []; S.locs = r[1].data || []; S.franjas = r[2].data || [];
      (r[3].data || []).forEach(function (a) { S.ajustes[a.clave] = a.valor; });
    });
  }
  function zonaDe(locId) {
    var l = S.locs.filter(function (x) { return x.id === Number(locId); })[0]; if (!l || !l.zona_id) return null;
    return S.zonas.filter(function (z) { return z.id === l.zona_id; })[0] || null;
  }
  function bogota() {
    var f = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date()), o = {};
    f.forEach(function (p) { o[p.type] = p.value; });
    return { date: o.year + "-" + o.month + "-" + o.day, time: (o.hour === "24" ? "00" : o.hour) + ":" + o.minute };
  }
  function addDays(iso, n) { var d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  function fechaLarga(iso) { var p = iso.split("-"); return Number(p[2]) + " de " + MESES[Number(p[1]) - 1]; }
  function hoyDisponible() { return true; }               // se puede pedir las 24 horas

  /* Datos que entrega Google al registrarse (solo nombre, correo y foto) */
  function gdata() {
    var m = (S.session && S.session.user && S.session.user.user_metadata) || {};
    var name = String(m.full_name || m.name || "").replace(/\s+/g, " ").trim().slice(0, 80);
    var pic = String(m.avatar_url || m.picture || ""); if (!/^https:\/\//.test(pic)) pic = "";
    return { name: name, pic: pic };
  }
  function avatar(cls) { var g = gdata(); return g.pic ? el("img", { class: cls, src: g.pic, alt: "", width: "36", height: "36", referrerpolicy: "no-referrer" }) : null; }

  /* ---------- Sesión y perfil ---------- */
  function loadUser() {
    return sb.auth.getSession().then(function (r) {
      S.session = r.data.session;
      if (!S.session) { S.profile = null; S.puntos = 0; S.pedidos = []; return; }
      var uid = S.session.user.id;
      return Promise.all([
        sb.from("perfiles").select("*").eq("id", uid).maybeSingle(),
        sb.rpc("saldo_puntos"),
        sb.from("pedidos").select("*").order("creado_en", { ascending: false }).limit(30)
      ]).then(function (r2) { S.profile = r2[0].data; S.puntos = r2[1].data || 0; S.pedidos = r2[2].data || []; });
    }).catch(function () {});
  }
  function complete() { var p = S.profile; return !!(p && p.nombre && p.telefono && p.direccion && p.localidad_id && p.acepta_datos_at); }
  function refresh() { return loadUser().then(function () { paintNav(); paintRewards(); paintDelivery(); if (isOpen()) paintModal(); }); }

  /* ---------- Invitación a registrarse (sección Huevos) ---------- */
  function paintRewards() {
    var box = $("rewards"); if (!box) return;
    box.hidden = false;
    var t = $("rewardsTitle"), x = $("rewardsText"), b = $("rewardsBtn");
    if (!S.session) {
      t.textContent = "Regístrate gratis y gana puntos";
      x.textContent = ""; x.appendChild(document.createTextNode("Con tu cuenta guardamos tus datos para pedir más rápido, y "));
      x.appendChild(el("b", { text: "cada cubeta que pidas te suma 5 puntos" })); x.appendChild(document.createTextNode(". Con tus puntos podrás ganar premios de la finca."));
      b.hidden = false; b.textContent = "Crear mi cuenta gratis";
    } else if (!complete()) {
      t.textContent = "Ya casi: completa tus datos";
      x.textContent = "Llénalos una sola vez y tus próximos pedidos serán muy rápidos. Cada cubeta te suma 5 puntos para ganar premios.";
      b.hidden = false; b.textContent = "Completar mis datos";
    } else {
      t.textContent = "Tienes " + S.puntos + (S.puntos === 1 ? " punto" : " puntos");
      x.textContent = "Cada cubeta que te entregamos suma 5 puntos. Sigue pidiendo para ganar premios de la finca.";
      b.hidden = true;
    }
  }

  /* ---------- Botón del menú ---------- */
  function paintNav() {
    var b = $("acctBtn"); if (!b) return;
    b.textContent = ""; var av = S.session ? avatar("nav__avatar") : null; if (av) b.appendChild(av);
    b.appendChild(document.createTextNode(S.session ? "Mi cuenta" : "Entrar"));
    b.setAttribute("aria-label", S.session ? "Mi cuenta: mis datos, pedidos y puntos" : "Entrar o crear mi cuenta");
    var a = $("adminLink"), isAdmin = !!(S.profile && S.profile.rol === "admin");
    if (isAdmin && !a) { a = el("a", { class: "nav__admin", id: "adminLink", href: "admin/", "aria-label": "Panel de administración" }, [el("span", { class: "l-long", text: "Panel de administración" }), el("span", { class: "l-short", text: "Panel admin" })]); b.parentNode.insertBefore(a, b); }
    if (a) a.hidden = !isAdmin;
  }

  /* ---------- Ventana "Mi cuenta" ---------- */
  var modal, body;
  function isOpen() { return modal && !modal.hidden; }
  function build() {
    if (modal) return;
    body = el("div", { class: "acct__body" });
    var close = el("button", { class: "acct__close", type: "button", "aria-label": "Cerrar", text: "×", onclick: closeModal });
    modal = el("div", { class: "acct", id: "acct", role: "dialog", "aria-modal": "true", "aria-label": "Mi cuenta", hidden: true }, [
      el("div", { class: "acct__bg", onclick: closeModal }), el("div", { class: "acct__card" }, [close, body])
    ]);
    document.body.appendChild(modal);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen()) closeModal(); });
  }
  function openModal() { build(); modal.hidden = false; document.body.classList.add("no-scroll"); paintModal(); var f = modal.querySelector("input,select,button.acct__primary"); if (f) f.focus(); }
  function closeModal() { if (modal) { modal.hidden = true; document.body.classList.remove("no-scroll"); } }
  function field(label, input, hint) { return el("label", { class: "acct__field" }, [el("span", { text: label }), input, hint ? el("small", { text: hint }) : null]); }
  function note(text, cls) { return el("p", { class: "acct__msg " + (cls || ""), role: cls === "is-err" ? "alert" : "status", text: text }); }

  function paintModal() {
    if (!body) return; body.textContent = "";
    if (!S.session) return paintLogin();
    paintProfile();
  }

  function paintLogin(sentTo, error) {
    body.textContent = "";
    body.appendChild(el("h2", { text: "Entra a tu cuenta" }));
    if (sentTo) {
      body.appendChild(el("p", { class: "acct__lead", text: "Te enviamos un enlace a " + sentTo + "." }));
      body.appendChild(el("ol", { class: "acct__steps" }, [el("li", { text: "Abre tu correo." }), el("li", { text: "Busca el mensaje de Finca La Lolita (mira también en Spam)." }), el("li", { text: "Toca el botón del mensaje y volverás aquí, ya dentro de tu cuenta." })]));
      body.appendChild(el("button", { class: "acct__ghost", type: "button", text: "Usar otro correo", onclick: function () { paintLogin(); } }));
      return;
    }
    body.appendChild(el("p", { class: "acct__lead", text: "Con tu cuenta guardamos tu nombre y dirección, ves tus pedidos anteriores y juntas puntos. Entra con tu cuenta de Google o, si prefieres, con un enlace a tu correo (sin contraseña)." }));
    if (error) body.appendChild(note(error, "is-err"));
    var gerr = el("div", { "aria-live": "polite" });
    body.appendChild(SB.googleButton(function (m) { gerr.textContent = ""; gerr.appendChild(note(m, "is-err")); }));
    body.appendChild(gerr);
    body.appendChild(el("p", { class: "acct__or", text: "o con tu correo" }));
    var email = el("input", { type: "email", required: true, autocomplete: "email", inputmode: "email", placeholder: "tucorreo@ejemplo.com", autocapitalize: "none", spellcheck: "false" });
    var btn = el("button", { class: "acct__primary", type: "submit", text: "Enviarme el enlace al correo" });
    var f = el("form", { class: "acct__form", onsubmit: function (e) {
      e.preventDefault(); btn.disabled = true; btn.textContent = "Enviando…";
      var to = email.value.trim();
      sb.auth.signInWithOtp({ email: to, options: { emailRedirectTo: location.origin + location.pathname } }).then(function (r) {
        if (r.error) paintLogin(null, SB.msg(r.error)); else paintLogin(to);
      }).catch(function (er) { paintLogin(null, SB.msg(er)); });
    } }, [field("Tu correo electrónico", email), btn]);
    body.appendChild(f);
    body.appendChild(el("p", { class: "acct__fine", text: "¿Prefieres no crear cuenta? Cierra esta ventana y pide igual por WhatsApp." }));
  }

  function paintProfile() {
    var p = S.profile || {};
    if (p.rol === "admin") body.appendChild(el("a", { class: "acct__admin", href: "admin/", text: "Ir al panel de administración" }));
    var g = gdata(), shown = p.nombre || g.name, head = el("div", { class: "acct__head" });
    var av = avatar("acct__avatar"); if (av) head.appendChild(av);
    head.appendChild(el("h2", { text: complete() ? "Hola, " + shown.split(" ")[0] : (shown ? "Hola, " + shown.split(" ")[0] + ". Completa tus datos" : "Completa tus datos") }));
    body.appendChild(head);
    body.appendChild(el("p", { class: "acct__email", text: "Cuenta: " + S.session.user.email }));
    if (!complete()) body.appendChild(el("p", { class: "acct__lead", text: "Solo se llena una vez. Después pedir es tan fácil como elegir cuántas cubetas." }));
    else body.appendChild(el("div", { class: "acct__points" }, [el("b", { text: String(S.puntos) }), el("span", { text: " puntos acumulados · 5 puntos por cada cubeta entregada" })]));

    var nombre = el("input", { type: "text", required: true, autocomplete: "name", maxlength: "80", value: p.nombre || g.name || "" });
    var tel = el("input", { type: "tel", required: true, autocomplete: "tel", inputmode: "tel", maxlength: "20", value: p.telefono || "", placeholder: "3001234567" });
    var dir = el("input", { type: "text", required: true, autocomplete: "street-address", maxlength: "160", value: p.direccion || "", placeholder: "Calle 80 # 20-30, apto 301" });
    var loc = el("select", { required: true }, [el("option", { value: "", text: "Elige tu localidad" })].concat(S.locs.map(function (l) { return el("option", { value: String(l.id), text: l.nombre, selected: p.localidad_id === l.id }); })));
    var ind = el("input", { type: "text", maxlength: "300", value: p.indicaciones || "", placeholder: "Ej: portería, torre 2, timbre" });
    var ok = el("input", { type: "checkbox", id: "acctOk", checked: !!p.acepta_datos_at });
    var consent = el("label", { class: "acct__check", for: "acctOk" }, [ok, el("span", {}, ["Autorizo a Finca La Lolita a guardar estos datos solo para gestionar mis pedidos y entregas. ", el("a", { href: "privacidad/", target: "_blank", rel: "noopener", text: "Leer la política de privacidad" })])]);
    var btn = el("button", { class: "acct__primary", type: "submit", text: "Guardar mis datos" });
    var msgBox = el("div", { "aria-live": "polite" });
    var form = el("form", { class: "acct__form", onsubmit: function (e) {
      e.preventDefault(); msgBox.textContent = "";
      if (!ok.checked) { msgBox.appendChild(note("Marca la casilla de autorización para guardar tus datos.", "is-err")); return; }
      btn.disabled = true; btn.textContent = "Guardando…";
      var upd = { nombre: nombre.value.trim(), telefono: tel.value.replace(/[^0-9+]/g, ""), direccion: dir.value.trim(), localidad_id: Number(loc.value), indicaciones: ind.value.trim() || null };
      if (!p.acepta_datos_at) upd.acepta_datos_at = new Date().toISOString();
      sb.from("perfiles").update(upd).eq("id", S.session.user.id).then(function (r) {
        btn.disabled = false; btn.textContent = "Guardar mis datos";
        if (r.error) { msgBox.appendChild(note(SB.msg(r.error), "is-err")); return; }
        refresh().then(function () { if (complete()) { closeModal(); location.hash = "#huevos"; } });
      });
    } }, [field("Tu nombre completo", nombre), field("Tu celular", tel), field("Dirección de entrega", dir), field("Localidad", loc, "Si no aparece tu zona con domicilio confirmado, escríbenos por WhatsApp."), field("Indicaciones para el domicilio (opcional)", ind), consent, msgBox, btn]);
    var datos = el("div", { class: "acct__tabpane" }, [form]);
    body.appendChild(datos);

    var pedidosBox = el("div", { class: "acct__tabpane" });
    if (complete()) {
      var ESTADO = { nuevo: "Enviado, esperando confirmación", confirmado: "Confirmado", entregado: "Entregado", cancelado: "Cancelado" };
      if (!S.pedidos.length) {
        pedidosBox.appendChild(el("p", { class: "acct__lead", text: "Todavía no has hecho pedidos. Cuando hagas uno, aquí verás su estado y tus puntos." }));
        pedidosBox.appendChild(el("button", { class: "acct__primary", type: "button", text: "Hacer mi primer pedido", onclick: function () { closeModal(); location.hash = "#huevos"; } }));
      } else {
        var ul = el("ul", { class: "acct__orders" });
        S.pedidos.forEach(function (o) {
          var pts = o.estado === "entregado" ? " · +" + (o.cubetas * Number(S.ajustes.puntos_por_cubeta || 5)) + " puntos" : "";
          ul.appendChild(el("li", {}, [
            el("div", {}, [el("b", { text: "Pedido N.º " + o.id + " · " + o.cubetas + (o.cubetas === 1 ? " cubeta" : " cubetas") + " · " + cop(o.total) }),
              el("small", { text: "Para el " + fechaLarga(o.entrega_fecha) }), el("span", { class: "acct__st is-" + o.estado, text: (ESTADO[o.estado] || o.estado) + pts })]),
            el("button", { class: "acct__ghost", type: "button", text: "Pedir otra vez", onclick: function () { closeModal(); APP.setQty(EGG_KEY, o.cubetas); location.hash = "#huevos"; } })
          ]));
        });
        pedidosBox.appendChild(ul);
      }
      var tabs = el("div", { class: "acct__tabs", role: "group", "aria-label": "Secciones de mi cuenta" });
      var show = function (t) { S.tab = t; datos.hidden = t !== "datos"; pedidosBox.hidden = t !== "pedidos"; Array.prototype.forEach.call(tabs.children, function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-t") === t)); }); };
      [["pedidos", "Mis pedidos"], ["datos", "Mis datos"]].forEach(function (t) { tabs.appendChild(el("button", { type: "button", "data-t": t[0], text: t[1], onclick: function () { show(t[0]); } })); });
      body.insertBefore(tabs, datos); body.insertBefore(pedidosBox, datos);
      show(S.tab === "datos" ? "datos" : "pedidos");
    }

    var links = el("div", { class: "acct__links" });
    links.appendChild(el("button", { class: "acct__ghost", type: "button", text: "Cerrar sesión", onclick: function () { sb.auth.signOut().then(function () { closeModal(); return refresh(); }); } }));
    body.appendChild(links);
  }

  /* ---------- Pedido rápido (dentro de Huevos) ---------- */
  var box;
  function eggLine() { return S.lines.filter(function (l) { return l.productId + "::" + l.presId === EGG_KEY; })[0] || null; }
  function useProfileFlow() { return !!(S.session && complete() && eggLine() && zonaDe(S.profile.localidad_id)); }

  function paintDelivery() {
    var quick = $("quick"); if (!quick) return;
    if (!box) { box = el("div", { class: "deliv", id: "deliv", hidden: true }); quick.insertBefore(box, $("quickWa")); }
    var guestHint = $("quickGuest");
    if (!guestHint) { guestHint = el("p", { class: "quick__guest", id: "quickGuest", hidden: true }); quick.appendChild(guestHint); }
    var wa = $("quickWa");
    if (S.ok && !S.lines.length) { /* mensaje de éxito se queda visible */ }
    if (!eggLine() || !S.lines.length) { box.hidden = true; guestHint.hidden = true; wa.textContent = "Enviar mi pedido por WhatsApp"; return; }
    // Invitado o perfil incompleto: se muestra una invitación clara
    if (S.session && complete() && !zonaDe(S.profile.localidad_id)) {   // localidad sin domicilio confirmado: se pide por WhatsApp como invitado
      box.hidden = true; guestHint.hidden = false; guestHint.textContent = "";
      guestHint.appendChild(el("span", { text: "Tu localidad todavía no tiene domicilio confirmado. Envía tu pedido por WhatsApp y Dagoberto te dice cuánto cuesta el domicilio." }));
      wa.textContent = "Enviar mi pedido por WhatsApp"; return;
    }
    if (!useProfileFlow()) {
      box.hidden = true; guestHint.hidden = false; guestHint.textContent = "";
      guestHint.appendChild(el("span", { text: S.session ? "Completa tus datos para pedir más rápido y con domicilio automático." : "¿Pides seguido? Crea tu cuenta y la próxima vez solo eliges cuántas cubetas." }));
      guestHint.appendChild(el("button", { class: "btn btn--dark btn--xl", type: "button", text: S.session ? "Completar mis datos" : "Crear mi cuenta / Entrar", onclick: openModal }));
      wa.textContent = "Enviar mi pedido por WhatsApp (sin cuenta)";
      return;
    }
    guestHint.hidden = true; box.hidden = false; box.textContent = "";
    wa.textContent = "Hacer mi pedido y enviarlo por WhatsApp";
    var p = S.profile, z = zonaDe(p.localidad_id), loc = S.locs.filter(function (l) { return l.id === p.localidad_id; })[0];
    var egg = eggLine(), eggTotal = egg.price !== null ? egg.price * egg.qty : null;
    var envio = z ? z.costo : null, total = (eggTotal !== null && envio !== null) ? eggTotal + envio : null;

    box.appendChild(el("h3", { text: "¿Cuándo lo quieres recibir?" }));
    var opts = el("div", { class: "deliv__opts", role: "radiogroup", "aria-label": "Cuándo recibir el pedido" });
    var hoyOk = hoyDisponible();
    if (S.entrega === "hoy" && !hoyOk) S.entrega = "programado";
    [["hoy", "Hoy mismo", "Lo llevamos lo antes posible hoy"], ["programado", "Otro día", "Tú eliges fecha y horario"]].forEach(function (o) {
      var dis = o[0] === "hoy" && !hoyOk;
      var inp = el("input", { type: "radio", name: "entrega", value: o[0], checked: S.entrega === o[0], disabled: dis, onchange: function () { S.entrega = o[0]; paintDelivery(); } });
      opts.appendChild(el("label", { class: "deliv__opt" + (dis ? " is-off" : "") }, [inp, el("span", {}, [el("b", { text: o[1] }), el("small", { text: o[2] })])]));
    });
    box.appendChild(opts);
    if (S.entrega === "programado") {
      var min = addDays(bogota().date, 1), max = addDays(bogota().date, 30);
      if (!S.fecha || S.fecha < min) S.fecha = min;
      if (!S.franja && S.franjas[0]) S.franja = String(S.franjas[0].id);
      var fecha = el("input", { type: "date", min: min, max: max, value: S.fecha, onchange: function () { S.fecha = fecha.value; paintDelivery(); } });
      var fr = el("select", { onchange: function () { S.franja = fr.value; } }, S.franjas.map(function (f) { return el("option", { value: String(f.id), text: f.nombre, selected: String(f.id) === S.franja }); }));
      box.appendChild(el("div", { class: "deliv__when" }, [field("Día de entrega", fecha), field("Horario", fr)]));
    }
    box.appendChild(el("div", { class: "deliv__where" }, [el("span", { text: "Se entrega en:" }), el("b", { text: p.direccion + (loc ? " · " + loc.nombre : "") }), el("button", { class: "acct__ghost", type: "button", text: "Cambiar mis datos", onclick: openModal })]));
    var sum = el("dl", { class: "deliv__sum" });
    sum.appendChild(el("div", {}, [el("dt", { text: egg.qty + (egg.qty === 1 ? " cubeta" : " cubetas") }), el("dd", { text: eggTotal !== null ? cop(eggTotal) : "por confirmar" })]));
    sum.appendChild(el("div", {}, [el("dt", { text: "Domicilio" + (z ? " (" + z.nombre.split("·")[0].trim() + ")" : "") }), el("dd", { text: z ? (z.costo === 0 ? "Gratis" : cop(z.costo)) : "Lo confirma Dagoberto" })]));
    sum.appendChild(el("div", { class: "deliv__total" }, [el("dt", { text: "Total a pagar" }), el("dd", { text: total !== null ? cop(total) : "Por confirmar" })]));
    box.appendChild(sum);
    var pts = egg.qty * Number(S.ajustes.puntos_por_cubeta || 5);
    box.appendChild(el("p", { class: "deliv__pts", text: "Con este pedido ganas " + pts + " puntos cuando te lo entreguemos." }));
    if (S.error) box.appendChild(note(S.error, "is-err"));
    if (S.ok) box.appendChild(note(S.ok, ""));
  }

  function waText(o, lines) {
    var p = S.profile, loc = S.locs.filter(function (l) { return l.id === p.localidad_id; })[0], z = zonaDe(p.localidad_id);
    var fr = S.franjas.filter(function (f) { return f.id === o.franja_id; })[0];
    var t = ["Hola " + (CFG.brandName || "Finca La Lolita") + ", quiero hacer un pedido (N.º " + o.id + "):", ""];
    lines.forEach(function (l) {
      var isEgg = l.productId + "::" + l.presId === EGG_KEY;
      t.push("• " + l.qty + " × " + l.name + (l.presentation && !/por confirmar/i.test(l.presentation) ? " (" + l.presentation + ")" : "") + (isEgg ? " — " + cop(o.precio_unitario * o.cubetas) : " — precio por confirmar"));
    });
    t.push("Domicilio: " + (o.envio === 0 ? "gratis" : cop(o.envio)) + (z ? " (" + z.nombre.split("·")[0].trim() + ")" : ""));
    t.push("Total huevos + domicilio: " + cop(o.total));
    t.push("");
    t.push("Entrega: " + (o.entrega_tipo === "hoy" ? "hoy, " : "el ") + fechaLarga(o.entrega_fecha) + (fr ? ", en la " + fr.nombre.toLowerCase() : ""));
    t.push("Nombre: " + o.nombre); t.push("Celular: " + o.telefono); t.push("Dirección: " + o.direccion + (loc ? ", " + loc.nombre : ""));
    if (o.indicaciones) t.push("Indicaciones: " + o.indicaciones);
    var n = (APP.notes() || "").replace(/\s+/g, " ").trim().slice(0, 300); if (n) t.push("Observaciones: " + n);
    t.push(""); t.push("¿Me confirmas, por favor? Gracias.");
    return t.join("\n");
  }

  function submit(e) {
    if (!useProfileFlow()) return;                         // invitado: el botón abre WhatsApp como siempre
    e.preventDefault(); if (S.busy) return;
    var egg = eggLine(), wa = $("quickWa"), lines = S.lines.slice();
    S.busy = true; S.error = null; S.ok = null; wa.textContent = "Enviando tu pedido…"; wa.setAttribute("aria-disabled", "true");
    sb.rpc("crear_pedido", { p_cubetas: egg.qty, p_entrega: S.entrega, p_fecha: S.entrega === "programado" ? S.fecha : null, p_franja: S.entrega === "programado" ? Number(S.franja) : null, p_indicaciones: null }).then(function (r) {
      S.busy = false; wa.removeAttribute("aria-disabled");
      if (r.error) { S.error = SB.msg(r.error); paintDelivery(); return; }
      var o = r.data, url = O.normalizeNumber(CFG.whatsappNumber) ? "https://wa.me/" + O.normalizeNumber(CFG.whatsappNumber) + "?text=" + encodeURIComponent(waText(o, lines)) : null;
      S.ok = "¡Pedido N.º " + o.id + " guardado! Ahora toca el botón verde para enviarlo por WhatsApp.";
      APP.clear(); refresh().then(function () { showDone(url); });
      if (url) window.location.assign(url);
    }).catch(function (er) { S.busy = false; wa.removeAttribute("aria-disabled"); S.error = SB.msg(er); paintDelivery(); });
  }

  function showDone(url) {
    var quick = $("quick"); quick.hidden = false;
    var done = $("quickDone"); if (done) done.remove();
    done = el("div", { class: "quick__done", id: "quickDone", role: "status" }, [el("b", { text: S.ok }), url ? el("a", { class: "btn btn--wa btn--xl", href: url, target: "_blank", rel: "noopener noreferrer", text: "Abrir WhatsApp y enviar mi pedido" }) : null]);
    quick.parentNode.insertBefore(done, quick.nextSibling); done.scrollIntoView({ behavior: "smooth", block: "center" });
    S.ok = null;
  }

  /* ---------- Arranque ---------- */
  APP.onChange = function (lines) { S.lines = lines; var d = $("quickDone"); if (d && lines.length) d.remove(); paintDelivery(); };
  var rb = $("rewardsBtn"); if (rb) rb.addEventListener("click", openModal);
  var acct = $("acctBtn"); if (acct) { acct.hidden = false; acct.addEventListener("click", openModal); }
  var wa = $("quickWa"); if (wa) wa.addEventListener("click", submit);
  sb.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_IN" || ev === "SIGNED_OUT" || ev === "TOKEN_REFRESHED") setTimeout(refresh, 0); });
  loadPublic().then(refresh).then(function () {
    paintNav(); if (/[?#&]access_token=|type=magiclink|code=/.test(location.href) && S.session) { history.replaceState(null, "", location.pathname); if (!complete()) openModal(); }
  });
})();

/* Panel de Dagoberto: precio de la cubeta, domicilios por zona, horarios y pedidos. Todo con botones grandes. */
(function () {
  "use strict";
  var SB = window.LolitaSB, app = document.getElementById("app");
  var el = SB && SB.el, cop = SB && SB.cop;
  if (!SB || !SB.ok) { app.textContent = "No se pudo conectar. Recarga la página."; return; }
  var sb = SB.client, tab = "precio", flash = null;
  var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  function fecha(iso) { var d = new Date(iso); return d.toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }); }
  function logo() { return el("img", { class: "ad__logo", src: "../assets/logo/wordmark-oscuro.webp", alt: "Finca La Lolita", width: "170" }); }
  function note(t, err) { return el("p", { class: "msg" + (err ? " is-err" : ""), role: err ? "alert" : "status", text: t }); }
  function show(nodes) { app.textContent = ""; app.appendChild(logo()); nodes.forEach(function (n) { if (n) app.appendChild(n); }); }
  function field(label, input) { return el("label", {}, [label, input]); }
  function bad(r) { return r && r.error ? SB.msg(r.error) : null; }

  /* ---------- Entrada ---------- */
  function login(sent, err) {
    if (sent) return show([el("h1", { text: "Revisa tu correo" }), el("p", { class: "ad__lead", text: "Te enviamos un enlace a " + sent + ". Ábrelo y toca el botón del mensaje (mira también en Spam)." })]);
    var email = el("input", { type: "email", required: true, autocomplete: "email", inputmode: "email", autocapitalize: "none", placeholder: "tucorreo@ejemplo.com" });
    var btn = el("button", { class: "btn", type: "submit", text: "Enviarme el enlace para entrar" });
    show([el("h1", { text: "Panel de administración" }), el("p", { class: "ad__lead", text: "Entra con Google o con un enlace a tu correo, sin contraseña." }), err ? note(err, true) : null,
      el("div", { class: "ad__card" }, [SB.googleButton(function (m) { login(null, m); }), el("p", { class: "ad__or", text: "o con tu correo" })]),
      el("form", { class: "ad__card", onsubmit: function (e) {
        e.preventDefault(); btn.disabled = true; btn.textContent = "Enviando…"; var to = email.value.trim();
        sb.auth.signInWithOtp({ email: to, options: { emailRedirectTo: location.origin + location.pathname } }).then(function (r) { r.error ? login(null, SB.msg(r.error)) : login(to); }).catch(function (x) { login(null, SB.msg(x)); });
      } }, [field("Tu correo", email), btn])]);
  }

  /* ---------- Carga inicial ---------- */
  function start() {
    sb.auth.getSession().then(function (r) {
      if (!r.data.session) return login();
      return sb.from("perfiles").select("rol").eq("id", r.data.session.user.id).maybeSingle().then(function (p) {
        if (!p.data || p.data.rol !== "admin") {
          return show([el("h1", { text: "Sin permiso" }), el("p", { class: "ad__lead", text: "Esta cuenta (" + r.data.session.user.email + ") no es de administrador." }),
            el("button", { class: "btn btn--ghost", type: "button", text: "Salir", onclick: out })]);
        }
        main();
      });
    }).catch(function () { login(null, "No se pudo conectar. Intenta de nuevo."); });
  }
  function out() { sb.auth.signOut().then(function () { location.reload(); }); }

  function main() {
    Promise.all([
      sb.from("precios_historial").select("*").order("creado_en", { ascending: false }).limit(8),
      sb.from("zonas_envio").select("*").order("id"),
      sb.from("localidades").select("*").order("nombre"),
      sb.from("franjas").select("*").order("id"),
      sb.from("ajustes").select("*"),
      sb.from("pedidos").select("*").order("creado_en", { ascending: false }).limit(30),
      sb.rpc("admin_clientes")
    ]).then(function (r) {
      var D = { precios: r[0].data || [], zonas: r[1].data || [], locs: r[2].data || [], franjas: r[3].data || [], ajustes: {}, pedidos: r[5].data || [], clientes: r[6].data || [], clientesError: r[6].error ? SB.msg(r[6].error) : null };
      (r[4].data || []).forEach(function (a) { D.ajustes[a.clave] = a.valor; });
      draw(D);
    }).catch(function () { show([note("No se pudieron cargar los datos. Recarga la página.", true)]); });
  }
  function reload(msg) { flash = msg || null; main(); }

  function draw(D) {
    var tabs = el("div", { class: "tabs", role: "group", "aria-label": "Secciones" });
    [["precio", "Precio"], ["pedidos", "Pedidos"], ["clientes", "Clientes"], ["envio", "Domicilios"], ["horarios", "Horarios"]].forEach(function (t) {
      tabs.appendChild(el("button", { class: "btn btn--ghost", type: "button", "aria-pressed": String(tab === t[0]), text: t[1], onclick: function () { tab = t[0]; flash = null; draw(D); } }));
    });
    var view = tab === "precio" ? vPrecio(D) : tab === "envio" ? vEnvio(D) : tab === "horarios" ? vHorarios(D) : tab === "clientes" ? vClientes(D) : vPedidos(D);
    show([el("div", { class: "ad__top" }, [el("h1", { text: "Hola, Dagoberto" }), el("button", { class: "btn btn--ghost", type: "button", text: "Salir", onclick: out })]), flash ? note(flash) : null, tabs, view]);
  }

  /* ---------- Precio ---------- */
  function vPrecio(D) {
    var cur = D.precios[0], price = el("input", { inputmode: "numeric", required: true, placeholder: "Ej: 20000", autocomplete: "off" });
    var nota = el("input", { maxlength: "140", placeholder: "Ej: subió el alimento", autocomplete: "off" });
    var prev = el("p", { class: "pv", "aria-live": "polite" });
    price.addEventListener("input", function () {
      var n = parseInt(price.value.replace(/[^0-9]/g, ""), 10); if (!n || !cur) { prev.textContent = ""; return; }
      var d = n - cur.precio; prev.textContent = d === 0 ? "Es igual al precio actual." : (d > 0 ? "▲ Sube " : "▼ Baja ") + cop(Math.abs(d)) + " (" + (Math.abs(d) / cur.precio * 100).toFixed(2).replace(".", ",") + " %)";
    });
    var btn = el("button", { class: "btn", type: "submit", text: "Guardar precio nuevo" });
    var form = el("form", { class: "ad__card", onsubmit: function (e) {
      e.preventDefault(); var n = parseInt(price.value.replace(/[^0-9]/g, ""), 10);
      if (!n || n < 1000 || n > 1000000) { flash = null; return alert("Escribe un precio válido, por ejemplo 20000."); }
      btn.disabled = true; btn.textContent = "Guardando…";
      sb.from("precios_cubeta").insert({ precio: n, nota: nota.value.trim() || null }).then(function (r) { bad(r) ? (alert(bad(r)), btn.disabled = false, btn.textContent = "Guardar precio nuevo") : reload("Listo: el precio quedó en " + cop(n) + ". Ya se ve en la página."); });
    } }, [el("h2", { text: "Precio de la cubeta" }), cur ? el("p", { class: "now" }, [cop(cur.precio), el("small", { text: " precio actual" })]) : null,
      field("Precio nuevo (en pesos)", price), prev, field("Nota (opcional)", nota), btn]);
    var rows = el("ul", { class: "rows" });
    D.precios.forEach(function (p) {
      var cls = p.direccion === "up" ? "up" : p.direccion === "down" ? "down" : "";
      var chg = p.direccion === "first" ? "Precio inicial" : p.direccion === "same" ? "＝ Igual" : (p.direccion === "up" ? "▲ Subió " : "▼ Bajó ") + cop(Math.abs(p.variacion)) + " (" + Math.abs(p.variacion_pct).toFixed(2).replace(".", ",") + " %)";
      rows.appendChild(el("li", {}, [el("span", {}, [el("b", { text: cop(p.precio) }), el("span", { class: "pv", text: fecha(p.creado_en) })]), el("span", { class: cls, text: chg })]));
    });
    return el("div", {}, [form, el("div", { class: "ad__card" }, [el("h2", { text: "Últimos precios" }), rows])]);
  }

  /* ---------- Domicilios ---------- */
  function vEnvio(D) {
    var nodes = [el("div", { class: "ad__card" }, [el("h2", { text: "Costo del domicilio por zona" }), el("p", { class: "ad__lead", text: "Pon 0 si la zona no paga domicilio." })].concat(D.zonas.map(function (z) {
      var nom = el("input", { value: z.nombre, maxlength: "60" }), cost = el("input", { inputmode: "numeric", value: String(z.costo) });
      var btn = el("button", { class: "btn", type: "button", text: "Guardar esta zona", onclick: function () {
        var c = parseInt(cost.value.replace(/[^0-9]/g, ""), 10); if (isNaN(c) || c > 100000) return alert("Escribe el costo en pesos, por ejemplo 5000.");
        btn.disabled = true; sb.from("zonas_envio").update({ nombre: nom.value.trim() || z.nombre, costo: c }).eq("id", z.id).then(function (r) { bad(r) ? (alert(bad(r)), btn.disabled = false) : reload("Zona guardada."); });
      } });
      return el("div", { class: "zone" }, [field("Nombre de la zona", nom), field("Costo del domicilio (pesos)", cost), btn]);
    })))];
    var opts = [["", "Sin definir"]].concat(D.zonas.map(function (z) { return [String(z.id), z.nombre]; }));
    var list = el("div", { class: "ad__card" }, [el("h2", { text: "¿Qué zona es cada localidad?" }), el("p", { class: "ad__lead", text: "Elige la zona de cada localidad. Se guarda sola. Las que digan “Sin definir” no tienen domicilio y el cliente deberá escribirte." })]);
    D.locs.forEach(function (l) {
      var sel = el("select", { "aria-label": "Zona de " + l.nombre, onchange: function () { sel.disabled = true; sb.from("localidades").update({ zona_id: sel.value ? Number(sel.value) : null }).eq("id", l.id).then(function (r) { sel.disabled = false; if (bad(r)) alert(bad(r)); }); } },
        opts.map(function (o) { return el("option", { value: o[0], text: o[1], selected: String(l.zona_id || "") === o[0] }); }));
      list.appendChild(el("div", { class: "loc" }, [el("b", { text: l.nombre }), sel]));
    });
    nodes.push(list); return el("div", {}, nodes);
  }

  /* ---------- Horarios ---------- */
  function vHorarios(D) {
    var nodes = [];
    var pts = el("input", { inputmode: "numeric", value: D.ajustes.puntos_por_cubeta || "5" });
    var b1 = el("button", { class: "btn", type: "button", text: "Guardar", onclick: function () {
      var n = parseInt(pts.value.replace(/[^0-9]/g, ""), 10); if (isNaN(n) || n > 1000) return alert("Los puntos deben ser un número, por ejemplo 5.");
      b1.disabled = true;
      sb.from("ajustes").update({ valor: String(n) }).eq("clave", "puntos_por_cubeta").then(function (r) { bad(r) ? (alert(bad(r)), b1.disabled = false) : reload("Guardado."); });
    } });
    nodes.push(el("div", { class: "ad__card" }, [el("h2", { text: "Puntos" }), el("p", { class: "ad__lead", text: "Los clientes pueden pedir las 24 horas." }), field("Puntos por cada cubeta entregada", pts), b1]));
    var fr = el("div", { class: "ad__card" }, [el("h2", { text: "Horarios de entrega" }), el("p", { class: "ad__lead", text: "El cliente elige uno de estos horarios cuando pide para otro día." })]);
    D.franjas.forEach(function (f) {
      var nom = el("input", { value: f.nombre, maxlength: "60" }), act = el("input", { type: "checkbox", checked: f.activa, id: "fr" + f.id });
      var btn = el("button", { class: "btn", type: "button", text: "Guardar horario", onclick: function () { btn.disabled = true; sb.from("franjas").update({ nombre: nom.value.trim() || f.nombre, activa: act.checked }).eq("id", f.id).then(function (r) { bad(r) ? (alert(bad(r)), btn.disabled = false) : reload("Horario guardado."); }); } });
      fr.appendChild(el("div", { class: "zone" }, [field("Nombre (ej: Mañana, 8 a 12)", nom), el("label", { for: "fr" + f.id }, [act, "Disponible para los clientes"]), btn]));
    });
    var nn = el("input", { maxlength: "60", placeholder: "Ej: Noche, 6 a 8 p. m." });
    var add = el("button", { class: "btn btn--ghost", type: "button", text: "Agregar horario nuevo", onclick: function () {
      if (!nn.value.trim()) return alert("Escribe el nombre del horario."); var id = D.franjas.reduce(function (m, f) { return Math.max(m, f.id); }, 0) + 1;
      add.disabled = true; sb.from("franjas").insert({ id: id, nombre: nn.value.trim(), activa: true }).then(function (r) { bad(r) ? (alert(bad(r)), add.disabled = false) : reload("Horario agregado."); });
    } });
    fr.appendChild(el("div", { class: "zone" }, [field("Horario nuevo", nn), add]));
    nodes.push(fr); return el("div", {}, nodes);
  }

  /* ---------- Clientes ---------- */
  function csvCell(v) { v = v === null || v === undefined ? "" : String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function vClientes(D) {
    var card = el("div", { class: "ad__card" }, [el("h2", { text: "Clientes registrados (" + D.clientes.length + ")" })]);
    if (D.clientesError) { card.appendChild(note("No se pudo cargar la lista. Falta correr el SQL actualizado en Supabase. (" + D.clientesError + ")", true)); return card; }
    var q = el("input", { type: "search", placeholder: "Buscar por nombre, correo o celular", "aria-label": "Buscar cliente", autocomplete: "off" });
    var dl = el("button", { class: "btn btn--ghost", type: "button", text: "Descargar lista (Excel)", onclick: function () {
      var head = ["Nombre", "Correo", "Celular", "Dirección", "Localidad", "Pedidos", "Puntos", "Registro"];
      var rows = D.clientes.map(function (c) { return [c.nombre, c.email, c.telefono, c.direccion, c.localidad, c.pedidos, c.puntos, c.creado_en ? c.creado_en.slice(0, 10) : ""]; });
      var csv = "\ufeff" + [head].concat(rows).map(function (r) { return r.map(csvCell).join(";"); }).join("\r\n");
      var a = el("a", { href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })), download: "clientes-finca-la-lolita.csv" }); document.body.appendChild(a); a.click(); a.remove();
    } });
    var list = el("div", {});
    function paint() {
      var t = q.value.trim().toLowerCase(); list.textContent = "";
      var rows = D.clientes.filter(function (c) { return !t || [c.nombre, c.email, c.telefono].join(" ").toLowerCase().indexOf(t) !== -1; });
      if (!rows.length) list.appendChild(el("p", { text: D.clientes.length ? "No hay clientes con esa búsqueda." : "Todavía no hay clientes registrados." }));
      rows.forEach(function (c) {
        list.appendChild(el("div", { class: "ord" }, [
          el("b", { text: (c.nombre || "Sin nombre todavía") + (c.rol === "admin" ? " · administrador" : "") }),
          el("small", { text: c.email }), el("small", { text: c.telefono ? "Celular: " + c.telefono : "Sin celular todavía" }),
          el("small", { text: c.direccion ? c.direccion + (c.localidad ? ", " + c.localidad : "") : "Sin dirección todavía" }),
          el("small", { text: c.pedidos + (Number(c.pedidos) === 1 ? " pedido" : " pedidos") + " · " + c.puntos + " puntos · registrado el " + (c.creado_en ? fecha(c.creado_en) : "") })]));
      });
    }
    q.addEventListener("input", paint); paint();
    card.appendChild(el("div", { class: "row2" }, [el("label", {}, ["Buscar", q]), el("div", { style: "align-self:end;margin-bottom:14px" }, [dl])]));
    card.appendChild(list); return card;
  }

  /* ---------- Pedidos ---------- */
  function vPedidos(D) {
    var card = el("div", { class: "ad__card" }, [el("h2", { text: "Pedidos recientes" }), el("p", { class: "ad__lead", text: "Cuando entregues un pedido, márcalo “Entregado”: así el cliente recibe sus puntos." })]);
    if (!D.pedidos.length) card.appendChild(el("p", { text: "Todavía no hay pedidos." }));
    var ES = [["nuevo", "Nuevo"], ["confirmado", "Confirmado"], ["entregado", "Entregado"], ["cancelado", "Cancelado"]], loc = {}; D.locs.forEach(function (l) { loc[l.id] = l.nombre; });
    var fr = {}; D.franjas.forEach(function (f) { fr[f.id] = f.nombre; });
    D.pedidos.forEach(function (o) {
      var sel = el("select", { "aria-label": "Estado del pedido " + o.id, onchange: function () { sel.disabled = true; sb.from("pedidos").update({ estado: sel.value }).eq("id", o.id).then(function (r) { bad(r) ? (alert(bad(r)), sel.disabled = false) : reload("Pedido " + o.id + " actualizado."); }); } },
        ES.map(function (e) { return el("option", { value: e[0], text: e[1], selected: o.estado === e[0] }); }));
      card.appendChild(el("div", { class: "ord" }, [
        el("b", { text: "N.º " + o.id + " · " + o.cubetas + (o.cubetas === 1 ? " cubeta" : " cubetas") + " · " + cop(o.total) }),
        el("small", { text: o.nombre + " · " + o.telefono }), el("small", { text: o.direccion + (loc[o.localidad_id] ? ", " + loc[o.localidad_id] : "") }),
        el("small", { text: "Entrega: " + o.entrega_fecha + (o.entrega_tipo === "hoy" ? " (hoy)" : fr[o.franja_id] ? " · " + fr[o.franja_id] : "") + " · Domicilio " + (o.envio ? cop(o.envio) : "gratis") }),
        o.indicaciones ? el("small", { text: "Indicaciones: " + o.indicaciones }) : null, el("small", { text: "Pedido el " + fecha(o.creado_en) }), sel]));
    });
    return card;
  }

  sb.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_IN" && /access_token|type=|code=/.test(location.hash + location.search)) { history.replaceState(null, "", location.pathname); start(); } });
  start();
})();

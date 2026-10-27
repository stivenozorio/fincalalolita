/* Conexión con Supabase (perfiles, pedidos, precio, zonas). Las llaves de config.js son públicas por diseño:
   la seguridad la dan las reglas de supabase/schema.sql. Si algo falla, la página sigue funcionando sin cuenta. */
(function () {
  "use strict";
  var CFG = window.LOLITA_CONFIG || {};
  var api = { client: null, ok: false };
  if (window.supabase && window.supabase.createClient && CFG.supabaseUrl && CFG.supabaseKey) {
    try {
      api.client = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      api.ok = true;
    } catch (e) { api.client = null; }
  }

  function cop(n) { return "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "class") e.className = attrs[k]; else if (k === "text") e.textContent = attrs[k];
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  /** Traduce errores técnicos a frases claras. */
  function msg(err) {
    var m = (err && (err.message || err.error_description)) || "";
    if (/rate limit|too many/i.test(m)) return "Se enviaron muchos correos seguidos. Espera unos minutos e intenta de nuevo.";
    if (/invalid.*email|email.*invalid|valid email/i.test(m)) return "Revisa el correo: parece que está mal escrito.";
    if (/Failed to fetch|NetworkError|network/i.test(m)) return "No hay conexión. Revisa tu internet e intenta de nuevo.";
    return m || "No se pudo completar. Intenta de nuevo.";
  }
  /** Botón "Continuar con Google" (letra "G" a color, sin imágenes externas). */
  function googleButton(onError) {
    var b = el("button", { class: "gbtn", type: "button", onclick: function () {
      b.disabled = true;
      api.client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } }).then(function (r) {
        if (r.error) { b.disabled = false; onError(msg(r.error)); }
      }).catch(function (e) { b.disabled = false; onError(msg(e)); });
    } }, [el("span", { class: "gbtn__g", "aria-hidden": "true", text: "G" }), el("span", { text: "Continuar con Google" })]);
    return b;
  }
  api.cop = cop; api.el = el; api.msg = msg; api.googleButton = googleButton;
  window.LolitaSB = api;
})();

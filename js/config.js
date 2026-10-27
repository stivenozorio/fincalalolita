/* Configuración del negocio. Editar SOLO este archivo para datos de contacto.
   Todo lo que está en null / "" es información PENDIENTE de confirmar con Dagoberto. */
window.LOLITA_CONFIG = {
  brandName: "Finca La Lolita",       // Nombre final por decidir (la propuesta plantea dos opciones)
  whatsappNumber: "573203796190",   // +57 320 379 6190 (confirmado por el cliente). Formato internacional sin "+"
  currency: "COP",
  deliveryNote: null,                 // PENDIENTE: zonas de reparto confirmadas (texto corto)
  paymentNote: null,                  // PENDIENTE: medios de pago confirmados (texto corto)
  instagramUrl: null,                 // PENDIENTE
  facebookUrl: null,                  // PENDIENTE
  // Supabase: estos dos datos son PÚBLICOS por diseño (la seguridad la dan las reglas RLS de supabase/schema.sql).
  // La llave "secret"/"service_role" NUNCA va aquí ni en el repositorio.
  supabaseUrl: "https://fubrfxmgtugrtuckcucf.supabase.co",
  supabaseKey: "sb_publishable_I7s5h9B3LCvkmT9D56hoyw_vwAvr5u7"
};

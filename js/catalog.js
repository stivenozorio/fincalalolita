/* Catálogo centralizado. Es la ÚNICA fuente de productos de la página.
   Cuando Dagoberto confirme sus productos: reemplazar `products` (o conectar un backend que
   entregue este mismo formato) — ningún componente necesita cambiarse.

   Reglas:
   - Un producto solo se publica si confirmed === true.
   - Solo se puede pedir si available === true y la presentación tiene price numérico (COP).
   - Los productos con provisional:true son EJEMPLOS DE ESTRUCTURA: solo se ven en modo
     vista previa (localhost o ?preview=1) y nunca llevan precios inventados.
   - category: "huevos" hoy; "artesanias" queda reservado para una fase posterior. */
window.LOLITA_CATALOG = {
  version: 0,
  categories: [
    { id: "huevos", label: { en: "Eggs", es: "Huevos" } }
    // { id: "artesanias", label: { en: "Family crafts", es: "Artesanías familiares" } }  // Fase 4, solo cuando se confirme
  ],
  products: [
    {
      id: "ejemplo-huevos-1",
      provisional: true,        // quitar al confirmar
      confirmed: false,         // true = publicado
      available: false,         // true = se puede pedir
      category: "huevos",
      name: { en: "Sample egg product", es: "Producto de ejemplo" },
      description: { en: "Placeholder — real product pending.", es: "Marcador — producto real por confirmar." },
      image: null,              // ruta a foto autorizada, ej. "assets/img/products/huevos-1.jpg"
      presentations: [
        { id: "p1", label: { en: "Presentation to confirm", es: "Presentación por confirmar" }, price: null }
      ]
    },
    {
      id: "ejemplo-huevos-2",
      provisional: true,
      confirmed: false,
      available: false,
      category: "huevos",
      name: { en: "Sample egg product", es: "Producto de ejemplo" },
      description: { en: "Placeholder — real product pending.", es: "Marcador — producto real por confirmar." },
      image: null,
      presentations: [
        { id: "p1", label: { en: "Presentation to confirm", es: "Presentación por confirmar" }, price: null }
      ]
    }
  ]
};

/* Catálogo centralizado. Es la ÚNICA fuente de productos de la página.
   Para cambiar productos, precios o fotos: editar solo este archivo.

   Reglas:
   - Un producto solo se publica si confirmed === true.
   - Solo se puede pedir si available === true. Si price es null, el pedido se envía SIN precio
     y el mensaje dice que Dagoberto lo confirma (nunca se inventan precios).
   - price: número en pesos colombianos (COP), por ejemplo 18500. Mientras sea null aparece "Precio por confirmar".
   - images: fotos (src, w, h). Con varias fotos se muestra un carrusel.
   - category: "huevos" o "artesanias". Cada una tiene su propia sección en la página.
   - provisional:true es solo para ejemplos de estructura: se ven únicamente con ?preview=1 y no se pueden pedir de verdad. */
window.LOLITA_CATALOG = {
  version: 1,
  categories: [
    { id: "huevos", label: { es: "Huevos" } },
    { id: "artesanias", label: { es: "Artesanías" } }
  ],
  products: [
    // ---------- HUEVOS ----------
    {
      id: "huevos-gallina",
      confirmed: true, available: true, category: "huevos",
      name: { es: "Huevos de gallina" },
      description: { es: "Fotos de referencia: huevos en cubeta. La presentación y el precio los confirma Dagoberto." },
      images: [{ src: "assets/products/huevos-1.webp", w: 1100, h: 1100 }, { src: "assets/products/huevos-2.webp", w: 1100, h: 1100 }, { src: "assets/products/huevos-3.webp", w: 1100, h: 1100 }],
      presentations: [ { id: "p1", label: { es: "Presentación por confirmar" }, price: null } ]
    },
    // ---------- ARTESANÍAS ----------
    {
      id: "art-guacamayas",
      confirmed: true, available: true, category: "artesanias",
      name: { es: "Guacamayas" },
      description: { es: "Dos piezas redondas decoradas con guacamayas y hojas tropicales." },
      images: [{ src: "assets/products/guacamayas.webp", w: 1078, h: 615 }],
      presentations: [ { id: "p1", label: { es: "Presentación por confirmar" }, price: null } ]
    },
    {
      id: "art-pinguino",
      confirmed: true, available: true, category: "artesanias",
      name: { es: "Pingüino navideño" },
      description: { es: "Una pieza grande y una pequeña a juego, con marco rojo y copos de nieve." },
      images: [{ src: "assets/products/pinguino.webp", w: 1100, h: 603 }],
      presentations: [ { id: "p1", label: { es: "Presentación por confirmar" }, price: null } ]
    },
    {
      id: "art-muneco",
      confirmed: true, available: true, category: "artesanias",
      name: { es: "Muñeco de nieve" },
      description: { es: "Una pieza grande y una pequeña a juego, con marco rojo y copos de nieve." },
      images: [{ src: "assets/products/muneco.webp", w: 1100, h: 603 }],
      presentations: [ { id: "p1", label: { es: "Presentación por confirmar" }, price: null } ]
    },
    {
      id: "art-reno",
      confirmed: true, available: true, category: "artesanias",
      name: { es: "Reno navideño" },
      description: { es: "Una pieza grande y una pequeña a juego, con marco rojo y copos de nieve." },
      images: [{ src: "assets/products/reno.webp", w: 1100, h: 603 }],
      presentations: [ { id: "p1", label: { es: "Presentación por confirmar" }, price: null } ]
    },
    {
      id: "art-personaje",
      confirmed: true, available: true, category: "artesanias",
      name: { es: "Personaje navideño" },
      description: { es: "Una pieza grande y una pequeña a juego, con gorro verde y marco rojo." },
      images: [{ src: "assets/products/personaje.webp", w: 1100, h: 603 }],
      presentations: [ { id: "p1", label: { es: "Presentación por confirmar" }, price: null } ]
    },
    {
      id: "art-reno-relieve",
      confirmed: true, available: true, category: "artesanias",
      name: { es: "Reno en relieve" },
      description: { es: "Reno con gorro verde y cuernos en relieve, sobre fondo rojo con copos de nieve." },
      images: [{ src: "assets/products/reno-caja.webp", w: 1100, h: 1079 }],
      presentations: [ { id: "p1", label: { es: "Presentación por confirmar" }, price: null } ]
    },
    {
      id: "art-colombia",
      confirmed: true, available: true, category: "artesanias",
      name: { es: "Colombia" },
      description: { es: "Cuatro piezas redondas con motivos de Colombia: sombrero vueltiao, acordeón, granos de café e iglesia." },
      images: [{ src: "assets/products/colombia.webp", w: 900, h: 870 }],
      presentations: [ { id: "p1", label: { es: "Presentación por confirmar" }, price: null } ]
    }
  ]
};

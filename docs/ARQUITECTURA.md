# Arquitectura — Finca La Lolita

## Hoy (Fase 1, sitio estático)
HTML + CSS + JS sin compilación (el repositorio estaba vacío; no se agregó framework ni dependencias).
- `js/config.js` — número de WhatsApp y textos de contacto (**pendientes**).
- `js/catalog.js` — catálogo único. Cambiar productos/precios aquí no requiere tocar componentes.
- `js/order-core.js` — reglas de pedido y mensaje de WhatsApp (probado en `tests/`).
- `js/scroll-video.js` — hero cinematográfico controlado por scroll.
- `assets/video/` — `lolita-scrub.mp4` (H.264) y `.webm` (VP9) derivados del video de referencia, con fotogramas clave densos para que el scrub sea fluido.
- `admin/index.html` — solo diseño de referencia, **sin funciones**.

## Panel de administración: qué falta
No hay backend ni base de datos. Un panel real necesita:
1. **Autenticación** (usuario único de Dagoberto, sesión segura, contraseña/enlace mágico).
2. **Base de datos** con tablas `products`, `presentations` (precio COP), `orders`, `order_items`, `payments`.
3. **API** que valide la sesión en el servidor en cada escritura (nunca claves en el navegador).
4. El sitio público leería el catálogo desde la API (mismo formato de `catalog.js`) y registraría los pedidos antes de abrir WhatsApp.

Opciones a decidir con DigiCy (no se agregó ninguna): (a) PHP + MySQL en el mismo hosting, si el plan lo incluye; (b) servicio gestionado (p. ej. Supabase/Firebase) con reglas de acceso por usuario. Requieren confirmar costo y configuración.

## Comunidad / datos personales
No se recopilan datos de clientes. Antes de registrar clientes: consentimiento explícito, finalidad informada, política de privacidad y almacenamiento seguro.

## Crecimiento
Categorías en `catalog.js` (`artesanias` reservada), zonas de reparto y promociones se añadirán como campos del mismo catálogo en fases posteriores.

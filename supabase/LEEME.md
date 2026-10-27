# Supabase · Finca La Lolita

1. Supabase → **SQL Editor → New query** → pegar todo `schema.sql` → **Run**. (Se puede correr varias veces.)
2. Supabase → **Authentication → URL Configuration**: Site URL `https://fincalalolita.digicyus.com` y en Redirect URLs `https://fincalalolita.digicyus.com/**`.
3. Crear un administrador: esa persona entra una vez en `/admin/` con su correo (enlace mágico). Luego, en el SQL Editor:
   `update public.perfiles set rol = 'admin' where id = (select id from auth.users where email = 'CORREO');`
4. Correos: el servicio gratuito de Supabase envía muy pocos correos por hora. Para uso real, configurar SMTP propio (Authentication → SMTP Settings) con un correo del dominio.
5. `test.sql` es la prueba de seguridad y lógica; se corrió en un Postgres local (no se sube al hosting).

Reglas clave: cada cliente solo ve lo suyo; precio, zonas, horarios y estados solo los cambia el rol `admin`; los pedidos se crean con `crear_pedido()` (el servidor calcula precio, domicilio y total); los 5 puntos por cubeta se suman al marcar el pedido como `entregado`.

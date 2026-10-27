# Supabase · Finca La Lolita

1. Supabase → **SQL Editor → New query** → pegar todo `schema.sql` → **Run**. (Se puede correr varias veces.)
2. Crear el administrador: entrar una vez a la página con su correo (enlace mágico) y luego, en el SQL Editor:
   `update public.perfiles set rol = 'admin' where id = (select id from auth.users where email = 'CORREO_DE_DAGOBERTO');`
3. `test.sql` es la prueba de seguridad y lógica; se corrió en un Postgres local (no se sube al hosting).

Reglas clave: cada cliente solo ve lo suyo; precio, zonas, horarios y estados solo los cambia el rol `admin`; los pedidos se crean con `crear_pedido()` (el servidor calcula precio, domicilio y total); los 5 puntos por cubeta se suman al marcar el pedido como `entregado`.

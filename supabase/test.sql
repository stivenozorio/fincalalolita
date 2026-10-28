-- Prueba de seguridad y lógica (se corre en un Postgres local con auth simulado; no se sube al hosting).
\set ON_ERROR_STOP off
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a','a@x'),('00000000-0000-0000-0000-00000000000b','b@x'),('00000000-0000-0000-0000-0000000000ad','adm@x');
update public.perfiles set rol='admin' where id='00000000-0000-0000-0000-0000000000ad';
update public.localidades set zona_id = 1 where nombre='Engativá'; update public.localidades set zona_id = 3 where nombre='Bosa';

\echo '--- anon: lee precio, no lee perfiles ni pedidos, no inserta precio'
set role anon;
select count(*) as precios_visibles from public.precios_cubeta;
select count(*) from public.perfiles;
insert into public.precios_cubeta (precio) values (1500);
select count(*) from public.pedidos;
reset role;

\echo '--- cliente A: completa perfil, no puede volverse admin'
set role authenticated; set request.jwt.sub = '00000000-0000-0000-0000-00000000000a';
update public.perfiles set nombre='Ana', telefono='3001112233', direccion='Cll 80 #1', localidad_id=10 where id = auth.uid();
update public.perfiles set rol='admin' where id = auth.uid();
select rol from public.perfiles where id = auth.uid();
\echo '--- A no cambia precio ni zonas'
insert into public.precios_cubeta (precio) values (1500);
update public.zonas_envio set costo = 0 where id = 3;
\echo '--- A pide 2 cubetas hoy (zona 1: envio 0, total 38000 si es antes del límite)'
select cubetas, precio_unitario, envio, total, entrega_tipo from public.crear_pedido(2, 'programado', (now() at time zone 'America/Bogota')::date + 1, 1::smallint);
\echo '--- errores esperados'
select public.crear_pedido(0, 'hoy', null, null);
select public.crear_pedido(1, 'programado', (now() at time zone 'America/Bogota')::date, 1::smallint);
select public.crear_pedido(1, 'programado', (now() at time zone 'America/Bogota')::date + 1, 9::smallint);
\echo '--- A no puede insertar pedidos directo ni cambiar estado'
insert into public.pedidos (cubetas, precio_unitario, envio, total, nombre, telefono, direccion, entrega_tipo, entrega_fecha) values (1,1,0,1,'x','x','x','hoy',now());
update public.pedidos set estado='entregado';
select count(*) as pedidos_de_A from public.pedidos;
reset role;

\echo '--- cliente B: no ve lo de A'
set role authenticated; set request.jwt.sub = '00000000-0000-0000-0000-00000000000b';
select count(*) as pedidos_visibles_B from public.pedidos; select count(*) as perfiles_visibles_B from public.perfiles;
select public.crear_pedido(1, 'programado', (now() at time zone 'America/Bogota')::date + 1, 1::smallint);
reset role;

\echo '--- admin: cambia precio (sube 19000->20000), ve todo, marca entregado -> 10 puntos'
set role authenticated; set request.jwt.sub = '00000000-0000-0000-0000-0000000000ad';
insert into public.precios_cubeta (precio, nota) values (20000, 'prueba');
select precio, variacion, variacion_pct, direccion from public.precios_historial order by id;
select count(*) as pedidos_visibles_admin from public.pedidos;
update public.pedidos set estado='entregado' where id = 1;
update public.pedidos set estado='entregado' where id = 1;
update public.perfiles set rol='cliente' where id = auth.uid();
reset role;
set role authenticated; set request.jwt.sub = '00000000-0000-0000-0000-00000000000a';
select public.saldo_puntos() as puntos_A_esperado_10;
reset role;
\echo '--- precio nuevo aplica a pedidos nuevos (20000*1 + 0)'
set role authenticated; set request.jwt.sub = '00000000-0000-0000-0000-00000000000a';
select total from public.crear_pedido(1, 'programado', (now() at time zone 'America/Bogota')::date + 2, 2::smallint);
reset role;

\echo '--- clientes: solo admin puede listar'
set role authenticated; set request.jwt.sub = '00000000-0000-0000-0000-00000000000a';
select * from public.admin_clientes();
reset role;
set role authenticated; set request.jwt.sub = '00000000-0000-0000-0000-0000000000ad';
select email, nombre, pedidos, puntos from public.admin_clientes() order by email;
reset role;
set role anon; select * from public.admin_clientes(); reset role;

\echo '--- puntos: cambiar el estado muchas veces nunca duplica ni deja puntos de un pedido cancelado'
update public.perfiles set nombre='Admin', telefono='3', direccion='x', localidad_id=10 where id = '00000000-0000-0000-0000-0000000000ad';
set role authenticated; set request.jwt.sub = '00000000-0000-0000-0000-0000000000ad';
select public.crear_pedido(3, 'programado', (now() at time zone 'America/Bogota')::date + 3, 1::smallint) is not null as pedido_creado;
reset role;
select max(id) as pid from public.pedidos where usuario_id = '00000000-0000-0000-0000-0000000000ad' \gset
\echo '(saldo del admin tras cada cambio; esperado: 15, 0, 15, 15, 0, 15, 0)'
set role authenticated; set request.jwt.sub = '00000000-0000-0000-0000-0000000000ad';
update public.pedidos set estado='entregado' where id = :pid; select public.saldo_puntos();
update public.pedidos set estado='cancelado' where id = :pid; select public.saldo_puntos();
update public.pedidos set estado='entregado' where id = :pid; select public.saldo_puntos();
update public.pedidos set estado='entregado' where id = :pid; select public.saldo_puntos();
update public.pedidos set estado='confirmado' where id = :pid; select public.saldo_puntos();
update public.pedidos set estado='entregado' where id = :pid; select public.saldo_puntos();
update public.pedidos set estado='cancelado' where id = :pid; select public.saldo_puntos();
reset role;
select motivo, puntos from public.puntos where pedido_id = :pid order by id;

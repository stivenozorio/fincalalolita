-- Finca La Lolita · base de datos (Supabase / PostgreSQL)
-- Se pega UNA vez en Supabase → SQL Editor → New query → Run. Es seguro volver a correrlo.
-- Seguridad: cada cliente solo ve lo suyo; solo el rol 'admin' cambia precios, zonas y estados.

-- ============ Ajustes ============
create table if not exists public.ajustes (
  clave text primary key,
  valor text not null
);
insert into public.ajustes (clave, valor) values
  ('puntos_por_cubeta', '5')
on conflict (clave) do nothing;

-- ============ Zonas de envío y localidades ============
create table if not exists public.zonas_envio (
  id smallint primary key,
  nombre text not null,
  costo integer not null check (costo >= 0)
);
insert into public.zonas_envio (id, nombre, costo) values
  (1, 'Zona 1 · Alrededor de la calle 80', 0),
  (2, 'Zona 2 · Aledañas', 5000),
  (3, 'Zona 3 · Más lejos', 8000)
on conflict (id) do nothing;

create table if not exists public.localidades (
  id smallint primary key,
  nombre text not null unique,
  zona_id smallint references public.zonas_envio (id) on delete set null   -- null = aún sin cobertura definida
);
insert into public.localidades (id, nombre) values
  (1,'Usaquén'),(2,'Chapinero'),(3,'Santa Fe'),(4,'San Cristóbal'),(5,'Usme'),(6,'Tunjuelito'),(7,'Bosa'),
  (8,'Kennedy'),(9,'Fontibón'),(10,'Engativá'),(11,'Suba'),(12,'Barrios Unidos'),(13,'Teusaquillo'),
  (14,'Los Mártires'),(15,'Antonio Nariño'),(16,'Puente Aranda'),(17,'La Candelaria'),
  (18,'Rafael Uribe Uribe'),(19,'Ciudad Bolívar'),(20,'Sumapaz')
on conflict (id) do nothing;

create table if not exists public.franjas (
  id smallint primary key,
  nombre text not null,
  activa boolean not null default true
);
insert into public.franjas (id, nombre) values (1, 'Mañana'), (2, 'Tarde')
on conflict (id) do nothing;

-- ============ Perfiles ============
create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  rol text not null default 'cliente' check (rol in ('cliente', 'admin')),
  nombre text,
  telefono text,
  direccion text,
  localidad_id smallint references public.localidades (id),
  indicaciones text,
  acepta_datos_at timestamptz,
  creado_en timestamptz not null default now()
);

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin');
$$;

create or replace function public.crear_perfil_nuevo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Si entra con Google, guardamos su nombre desde el principio (el resto lo completa el cliente).
  insert into public.perfiles (id, nombre)
  values (new.id, nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), 80), ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users for each row execute function public.crear_perfil_nuevo();

-- ============ Precio de la cubeta ============
create table if not exists public.precios_cubeta (
  id bigserial primary key,
  precio integer not null check (precio between 1000 and 1000000),
  nota text check (char_length(nota) <= 140),
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid()
);
insert into public.precios_cubeta (precio, nota)
select 19000, 'Precio de referencia inicial' where not exists (select 1 from public.precios_cubeta);

-- Historial con variación en pesos y % frente al registro anterior
create or replace view public.precios_historial with (security_invoker = on) as
select id, precio, nota, creado_en,
       precio - lag(precio) over w as variacion,
       case when lag(precio) over w is null then null
            else round((precio - lag(precio) over w) * 100.0 / lag(precio) over w, 2) end as variacion_pct,
       case when lag(precio) over w is null then 'first'
            when precio > lag(precio) over w then 'up'
            when precio < lag(precio) over w then 'down' else 'same' end as direccion
from public.precios_cubeta
window w as (order by creado_en, id);

-- ============ Pedidos y puntos ============
create table if not exists public.pedidos (
  id bigserial primary key,
  usuario_id uuid not null default auth.uid() references auth.users (id),
  cubetas integer not null check (cubetas between 1 and 100),
  precio_unitario integer not null,
  envio integer not null,
  total integer not null,
  nombre text not null,
  telefono text not null,
  direccion text not null,
  localidad_id smallint references public.localidades (id),
  indicaciones text,
  entrega_tipo text not null check (entrega_tipo in ('hoy', 'programado')),
  entrega_fecha date not null,
  franja_id smallint references public.franjas (id),
  estado text not null default 'nuevo' check (estado in ('nuevo', 'confirmado', 'entregado', 'cancelado')),
  puntos_otorgados boolean not null default false,
  creado_en timestamptz not null default now()
);

create table if not exists public.puntos (
  id bigserial primary key,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  pedido_id bigint references public.pedidos (id),
  puntos integer not null,
  motivo text not null,
  creado_en timestamptz not null default now()
);

-- Suma los puntos cuando el pedido pasa a "entregado" (una sola vez).
create or replace function public.dar_puntos_al_entregar() returns trigger
language plpgsql security definer set search_path = public as $$
declare por_cubeta integer;
begin
  if new.estado = 'entregado' and not new.puntos_otorgados then
    select valor::integer into por_cubeta from public.ajustes where clave = 'puntos_por_cubeta';
    insert into public.puntos (usuario_id, pedido_id, puntos, motivo)
    values (new.usuario_id, new.id, new.cubetas * coalesce(por_cubeta, 5), 'Pedido entregado');
    new.puntos_otorgados := true;
  end if;
  return new;
end $$;
drop trigger if exists al_entregar on public.pedidos;
create trigger al_entregar before update on public.pedidos for each row execute function public.dar_puntos_al_entregar();

create or replace function public.saldo_puntos() returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(sum(puntos), 0)::integer from public.puntos where usuario_id = auth.uid();
$$;

-- Crear un pedido: el servidor calcula precio, domicilio y total (nunca se confía en lo que manda el navegador).
create or replace function public.crear_pedido(p_cubetas integer, p_entrega text, p_fecha date, p_franja smallint, p_indicaciones text default null)
returns public.pedidos
language plpgsql security definer set search_path = public as $$
declare
  perfil public.perfiles;
  v_precio integer;
  v_envio integer;
  v_zona smallint;
  hoy date := (now() at time zone 'America/Bogota')::date;
  fecha date;
  fila public.pedidos;
begin
  if auth.uid() is null then raise exception 'Debes entrar a tu perfil para pedir.'; end if;
  if p_cubetas is null or p_cubetas < 1 or p_cubetas > 100 then raise exception 'Escribe cuántas cubetas quieres (de 1 a 100).'; end if;
  select * into perfil from public.perfiles where id = auth.uid();
  if perfil.nombre is null or perfil.telefono is null or perfil.direccion is null or perfil.localidad_id is null then
    raise exception 'Completa tu nombre, teléfono, dirección y localidad en tu perfil.';
  end if;
  select precio into v_precio from public.precios_cubeta order by creado_en desc, id desc limit 1;
  select zona_id into v_zona from public.localidades where id = perfil.localidad_id;
  if v_zona is null then raise exception 'Todavía no confirmamos el domicilio para tu localidad. Escríbenos por WhatsApp.'; end if;
  select costo into v_envio from public.zonas_envio where id = v_zona;
  if p_entrega = 'hoy' then
    fecha := hoy;                              -- se puede pedir las 24 horas, todos los días
  elsif p_entrega = 'programado' then
    if p_fecha is null or p_fecha <= hoy or p_fecha > hoy + 30 then raise exception 'Elige una fecha desde mañana y dentro de los próximos 30 días.'; end if;
    if not exists (select 1 from public.franjas where id = p_franja and activa) then raise exception 'Elige un horario de entrega.'; end if;
    fecha := p_fecha;
  else raise exception 'Elige cuándo quieres recibirlos.'; end if;
  insert into public.pedidos (usuario_id, cubetas, precio_unitario, envio, total, nombre, telefono, direccion, localidad_id, indicaciones,
                              entrega_tipo, entrega_fecha, franja_id)
  values (auth.uid(), p_cubetas, v_precio, v_envio, p_cubetas * v_precio + v_envio, perfil.nombre, perfil.telefono, perfil.direccion, perfil.localidad_id,
          nullif(left(trim(coalesce(p_indicaciones, perfil.indicaciones, '')), 300), ''), p_entrega, fecha, case when p_entrega = 'programado' then p_franja end)
  returning * into fila;
  return fila;
end $$;

-- ============ Seguridad (RLS) ============
alter table public.ajustes        enable row level security;
alter table public.zonas_envio    enable row level security;
alter table public.localidades    enable row level security;
alter table public.franjas        enable row level security;
alter table public.perfiles       enable row level security;
alter table public.precios_cubeta enable row level security;
alter table public.pedidos        enable row level security;
alter table public.puntos         enable row level security;

-- Lectura pública (la página necesita mostrar precio, zonas y horarios)
drop policy if exists lee_precios on public.precios_cubeta;      create policy lee_precios      on public.precios_cubeta for select using (true);
drop policy if exists lee_zonas on public.zonas_envio;           create policy lee_zonas        on public.zonas_envio    for select using (true);
drop policy if exists lee_localidades on public.localidades;     create policy lee_localidades  on public.localidades    for select using (true);
drop policy if exists lee_franjas on public.franjas;             create policy lee_franjas      on public.franjas        for select using (true);
drop policy if exists lee_ajustes on public.ajustes;             create policy lee_ajustes      on public.ajustes        for select using (clave in ('puntos_por_cubeta'));

-- Solo el administrador cambia precios, zonas, localidades, horarios y ajustes
drop policy if exists admin_precios on public.precios_cubeta;    create policy admin_precios    on public.precios_cubeta for insert with check (public.es_admin());
drop policy if exists admin_zonas on public.zonas_envio;         create policy admin_zonas      on public.zonas_envio    for update using (public.es_admin()) with check (public.es_admin());
drop policy if exists admin_localidades on public.localidades;   create policy admin_localidades on public.localidades  for update using (public.es_admin()) with check (public.es_admin());
drop policy if exists admin_franjas on public.franjas;           create policy admin_franjas    on public.franjas        for all using (public.es_admin()) with check (public.es_admin());
drop policy if exists admin_ajustes on public.ajustes;           create policy admin_ajustes    on public.ajustes        for update using (public.es_admin()) with check (public.es_admin());

-- Perfiles: cada quien el suyo; el admin ve todos. El rol nunca lo cambia el usuario (ver permisos de columnas abajo).
drop policy if exists ve_perfil on public.perfiles;              create policy ve_perfil        on public.perfiles for select using (id = auth.uid() or public.es_admin());
drop policy if exists edita_perfil on public.perfiles;           create policy edita_perfil     on public.perfiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Pedidos: cada quien los suyos; solo el admin cambia el estado. Crear = solo con crear_pedido().
drop policy if exists ve_pedidos on public.pedidos;              create policy ve_pedidos       on public.pedidos for select using (usuario_id = auth.uid() or public.es_admin());
drop policy if exists admin_pedidos on public.pedidos;           create policy admin_pedidos    on public.pedidos for update using (public.es_admin()) with check (public.es_admin());
drop policy if exists ve_puntos on public.puntos;                create policy ve_puntos        on public.puntos  for select using (usuario_id = auth.uid() or public.es_admin());

-- Permisos de tabla/columna
revoke all on public.ajustes, public.zonas_envio, public.localidades, public.franjas, public.perfiles, public.precios_cubeta,
              public.pedidos, public.puntos from anon, authenticated;
grant select on public.zonas_envio, public.localidades, public.franjas, public.ajustes, public.precios_cubeta, public.precios_historial to anon, authenticated;
grant insert on public.precios_cubeta to authenticated;
grant update on public.zonas_envio, public.localidades, public.ajustes to authenticated;
grant insert, update, delete on public.franjas to authenticated;
grant select on public.perfiles, public.pedidos, public.puntos to authenticated;
grant update (nombre, telefono, direccion, localidad_id, indicaciones, acepta_datos_at) on public.perfiles to authenticated;   -- NO incluye 'rol'
grant update (estado) on public.pedidos to authenticated;                                                               -- RLS: solo admin
grant usage, select on all sequences in schema public to authenticated;
revoke execute on function public.crear_pedido(integer, text, date, smallint, text) from public, anon;
grant  execute on function public.crear_pedido(integer, text, date, smallint, text) to authenticated;
revoke execute on function public.saldo_puntos() from public, anon;
grant  execute on function public.saldo_puntos() to authenticated;
revoke execute on function public.es_admin() from public, anon;
grant  execute on function public.es_admin() to authenticated;

-- ============ Lista de clientes (solo administradores) ============
create or replace function public.admin_clientes()
returns table (id uuid, email text, nombre text, telefono text, direccion text, localidad text, rol text, creado_en timestamptz, pedidos bigint, puntos bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'Sin permiso.'; end if;
  return query
  select p.id, u.email::text, p.nombre, p.telefono, p.direccion, l.nombre, p.rol, p.creado_en,
         (select count(*) from public.pedidos o where o.usuario_id = p.id),
         (select coalesce(sum(x.puntos), 0) from public.puntos x where x.usuario_id = p.id)::bigint
  from public.perfiles p
  join auth.users u on u.id = p.id
  left join public.localidades l on l.id = p.localidad_id
  order by p.creado_en desc;
end $$;
revoke execute on function public.admin_clientes() from public, anon;
grant  execute on function public.admin_clientes() to authenticated;

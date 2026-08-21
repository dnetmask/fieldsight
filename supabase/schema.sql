-- =====================================================================
-- FieldSight — Esquema de base de datos para Supabase
-- Pega TODO este archivo en: Supabase → SQL Editor → New query → Run
-- =====================================================================

-- 1) PERFILES (complementa la tabla de autenticación con nombre y rol)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nombre text not null,
  email text,
  rol text not null default 'tecnico' check (rol in ('administrador','supervisor','tecnico')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Función que calcula el rol del usuario que hace la consulta (evita recursión en políticas)
create function public.mi_rol() returns text as $$
  select rol from public.profiles where id = auth.uid();
$$ language sql stable security definer;

-- Crea automáticamente el perfil cuando alguien se registra
create function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, nombre, rol, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', new.email), 'tecnico', new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2) CATÁLOGOS COMPARTIDOS
create table public.catalogo_tipos_activo (
  id bigint generated always as identity primary key,
  nombre text not null unique
);

create table public.catalogo_protocolos (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  ethernet boolean not null default false
);

-- 3) VISITAS (proyecto/actividad de campo), con trazabilidad de quién y cuándo
create table public.visitas (
  id text primary key,
  codigo text not null,
  proyecto text,
  cliente text,
  sede text,
  tecnico text,
  fecha date,
  tipo text not null,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  creado_por_nombre text,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  actualizado_por_nombre text,
  updated_at timestamptz not null default now()
);

create index visitas_created_at_idx on public.visitas (created_at desc);

-- 4) SEGURIDAD A NIVEL DE FILA (RLS) — nadie accede sin estar autenticado
alter table public.profiles enable row level security;
alter table public.catalogo_tipos_activo enable row level security;
alter table public.catalogo_protocolos enable row level security;
alter table public.visitas enable row level security;

-- Perfiles: cualquier autenticado puede ver todos los perfiles (para mostrar nombres);
-- cada quien solo edita el suyo.
create policy "Ver perfiles" on public.profiles for select using (auth.uid() is not null);
create policy "Editar mi perfil" on public.profiles for update using (auth.uid() = id);
-- Necesaria para la pantalla de administración de usuarios: un
-- administrador puede cambiar el rol de CUALQUIER perfil, no solo el
-- suyo (la política anterior por sí sola no alcanza para eso).
create policy "Administradores editan cualquier perfil" on public.profiles for update
  using ( public.mi_rol() = 'administrador' );

-- Catálogos: cualquier autenticado puede leer y agregar nuevas opciones.
create policy "Ver tipos de activo" on public.catalogo_tipos_activo for select using (auth.uid() is not null);
create policy "Agregar tipos de activo" on public.catalogo_tipos_activo for insert with check (auth.uid() is not null);
create policy "Ver protocolos" on public.catalogo_protocolos for select using (auth.uid() is not null);
create policy "Agregar protocolos" on public.catalogo_protocolos for insert with check (auth.uid() is not null);

-- Visitas: cualquier autenticado puede ver y crear.
create policy "Ver visitas" on public.visitas for select using (auth.uid() is not null);
create policy "Crear visitas" on public.visitas for insert with check (auth.uid() is not null);

-- Editar: el técnico que la creó, o supervisor/administrador.
create policy "Editar visitas" on public.visitas for update
  using ( created_by = auth.uid() or public.mi_rol() in ('supervisor','administrador') );

-- Eliminar: solo supervisor/administrador.
create policy "Eliminar visitas" on public.visitas for delete
  using ( public.mi_rol() in ('supervisor','administrador') );

-- 5) ALMACENAMIENTO DE FOTOS (bucket privado)
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;

create policy "Subir fotos" on storage.objects for insert
  with check ( bucket_id = 'fotos' and auth.uid() is not null );
create policy "Ver fotos" on storage.objects for select
  using ( bucket_id = 'fotos' and auth.uid() is not null );
create policy "Borrar fotos" on storage.objects for delete
  using ( bucket_id = 'fotos' and auth.uid() is not null );

-- =====================================================================
-- Listo. Después de correr esto:
-- 1. Ve a Authentication → Providers → Email y, si quieres que los
--    técnicos puedan entrar de inmediato sin confirmar correo,
--    desactiva "Confirm email".
-- 2. Todo usuario nuevo queda con rol 'tecnico' por defecto. Los
--    administradores pueden cambiar el rol de cualquiera desde la app
--    (pantalla "Administrar usuarios", solo visible para ese rol) —
--    pero como todavía no existe ningún administrador la primera vez,
--    hay que crear el primero a mano: Table Editor → profiles → edita
--    la fila de esa persona → cambia "rol" a 'administrador'. De ahí en
--    adelante, ya no hace falta volver a tocar la base de datos para esto.
-- =====================================================================

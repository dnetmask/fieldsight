-- Curaduría de catálogos (2026-09-18). Correr UNA vez, en el SQL Editor de
-- Studio, en bases que ya existían antes de este cambio. Las instalaciones
-- nuevas ya lo traen en supabase/schema.sql.
--
-- Si el índice único falla por duplicados que solo difieren en mayúsculas
-- ("Switch" / "switch"), quítalos primero desde la app (Administrar →
-- Catálogos compartidos, que ya funciona con las políticas de arriba) y
-- vuelve a correr solo las dos líneas de "create unique index".

drop policy if exists "Administradores quitan tipos de activo" on public.catalogo_tipos_activo;
create policy "Administradores quitan tipos de activo" on public.catalogo_tipos_activo for delete
  using ( public.mi_rol() = 'administrador' );

drop policy if exists "Administradores quitan protocolos" on public.catalogo_protocolos;
create policy "Administradores quitan protocolos" on public.catalogo_protocolos for delete
  using ( public.mi_rol() = 'administrador' );

create unique index if not exists catalogo_tipos_activo_nombre_lower_idx on public.catalogo_tipos_activo (lower(nombre));
create unique index if not exists catalogo_protocolos_nombre_lower_idx on public.catalogo_protocolos (lower(nombre));

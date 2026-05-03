-- ============================================================
-- Pizzería Demo – Schema Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── Tabla: productos ────────────────────────────────────────
create table if not exists productos (
  id          bigint generated always as identity primary key,
  created_at  timestamptz default now(),
  nombre      text        not null,
  descripcion text,
  precio      numeric(10,2) not null,
  categoria   text        not null
                check (categoria in ('pizzas','empanadas','bebidas','promos')),
  imagen_url  text,
  disponible  boolean     not null default true
);

-- ── Tabla: pedidos ──────────────────────────────────────────
create table if not exists pedidos (
  id          bigint generated always as identity primary key,
  created_at  timestamptz default now(),
  items       jsonb       not null,
  total       numeric(10,2) not null,
  estado      text        not null default 'nuevo',
  nombre      text,
  telefono    text,
  direccion   text,
  pago        text,
  notas       text
);

-- ============================================================
-- Row Level Security (RLS) — todo público (demo sin auth)
-- ============================================================

-- Productos
alter table productos enable row level security;

create policy "productos_public_select"
  on productos for select
  using (true);

create policy "productos_public_insert"
  on productos for insert
  with check (true);

create policy "productos_public_update"
  on productos for update
  using (true) with check (true);

create policy "productos_public_delete"
  on productos for delete
  using (true);

-- Pedidos
alter table pedidos enable row level security;

create policy "pedidos_public_select"
  on pedidos for select
  using (true);

create policy "pedidos_public_insert"
  on pedidos for insert
  with check (true);

create policy "pedidos_public_update"
  on pedidos for update
  using (true) with check (true);

create policy "pedidos_public_delete"
  on pedidos for delete
  using (true);

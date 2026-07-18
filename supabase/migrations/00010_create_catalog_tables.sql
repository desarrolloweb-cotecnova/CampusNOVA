
-- Catálogo: estados de activos fijos
create table if not exists estados_activos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
insert into estados_activos (nombre) values
  ('En funcionamiento'), ('Daño parcial'), ('Dado de baja'), ('En reparación')
on conflict (nombre) do nothing;

-- Catálogo: sedes de espacios físicos
create table if not exists sedes_espacios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
insert into sedes_espacios (nombre) values
  ('Sede Principal'), ('Sede Secundaria'), ('Sede Rural')
on conflict (nombre) do nothing;

-- Catálogo: bloques de espacios físicos
create table if not exists bloques_espacios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
insert into bloques_espacios (nombre) values
  ('Bloque A'), ('Bloque B'), ('Bloque C'), ('Bloque D'), ('N/A')
on conflict (nombre) do nothing;

-- Catálogo: tipos de espacios físicos
create table if not exists tipos_espacios (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
insert into tipos_espacios (codigo, nombre) values
  ('AUL', 'Aula'), ('LAB', 'Laboratorio'), ('ADM', 'Administrativo'),
  ('BAÑ', 'Baño'), ('BOD', 'Bodega'), ('AUD', 'Auditorio'),
  ('SAL', 'Sala de reuniones'), ('PAR', 'Parqueadero'),
  ('CUL', 'Zona cultural'), ('HOT', 'Hotspot')
on conflict (codigo) do nothing;

-- Catálogo: estados de espacios físicos
create table if not exists estados_espacios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
insert into estados_espacios (nombre) values
  ('Bueno'), ('Regular'), ('Requiere intervención')
on conflict (nombre) do nothing;

-- RLS: acceso público de lectura para todos los catálogos
alter table estados_activos enable row level security;
alter table sedes_espacios enable row level security;
alter table bloques_espacios enable row level security;
alter table tipos_espacios enable row level security;
alter table estados_espacios enable row level security;

create policy "Lectura pública" on estados_activos for select using (true);
create policy "Lectura pública" on sedes_espacios for select using (true);
create policy "Lectura pública" on bloques_espacios for select using (true);
create policy "Lectura pública" on tipos_espacios for select using (true);
create policy "Lectura pública" on estados_espacios for select using (true);

create policy "Escritura autenticados" on estados_activos for all using (auth.role() = 'authenticated');
create policy "Escritura autenticados" on sedes_espacios for all using (auth.role() = 'authenticated');
create policy "Escritura autenticados" on bloques_espacios for all using (auth.role() = 'authenticated');
create policy "Escritura autenticados" on tipos_espacios for all using (auth.role() = 'authenticated');
create policy "Escritura autenticados" on estados_espacios for all using (auth.role() = 'authenticated');

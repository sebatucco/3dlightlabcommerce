begin;

create extension if not exists "pgcrypto";

drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.product_images cascade;
drop table if exists public.products cascade;
drop table if exists public.categories cascade;
drop table if exists public.contacts cascade;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  price numeric(12,2) not null default 0,
  compare_at_price numeric(12,2),
  sku text,
  stock integer not null default 0,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  total numeric(12,2) not null default 0,
  status text not null default 'pending',
  payment_method text not null,
  mp_preference_id text,
  mp_payment_id text,
  external_reference text not null unique,
  notes text,
  created_at timestamptz not null default now(),
  constraint orders_status_check check (status in ('pending', 'approved', 'rejected', 'cancelled', 'confirmed')),
  constraint orders_payment_method_check check (payment_method in ('mercadopago', 'transferencia', 'whatsapp'))
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12,2) not null,
  quantity integer not null default 1,
  subtotal numeric(12,2) not null
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  reason text,
  product text,
  message text,
  created_at timestamptz not null default now()
);

create index idx_categories_active on public.categories(active);
create index idx_products_category_id on public.products(category_id);
create index idx_products_active on public.products(active);
create index idx_orders_status on public.orders(status);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_product_images_product_id on public.product_images(product_id);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.contacts enable row level security;

create policy "Public can view active categories" on public.categories for select to anon, authenticated using (active = true);
create policy "Public can view active products" on public.products for select to anon, authenticated using (active = true);
create policy "Public can view product images" on public.product_images for select to anon, authenticated using (true);
create policy "Public can insert contacts" on public.contacts for insert to anon, authenticated with check (true);

insert into public.categories (name, slug, description, sort_order, active)
values
  ('Hogar', 'hogar', 'Productos para el hogar', 1, true),
  ('Regalería', 'regaleria', 'Ideas para regalar', 2, true),
  ('Librería', 'libreria', 'Cuadernos, agendas y más', 3, true),
  ('Accesorios', 'accesorios', 'Complementos y accesorios', 4, true);

insert into public.products (
  category_id, name, slug, short_description, description, price, compare_at_price, sku, stock, featured, active
)
select c.id, p.name, p.slug, p.short_description, p.description, p.price, p.compare_at_price, p.sku, p.stock, p.featured, p.active
from (
  values
    ('hogar', 'Taza estampada', 'taza-estampada', 'Taza ideal para regalo', 'Taza estampada de uso diario, práctica y linda para regalar.', 3500, 4200, 'HOG-001', 20, true, true),
    ('libreria', 'Cuaderno A5', 'cuaderno-a5', 'Cuaderno tapa dura', 'Cuaderno tamaño A5 con hojas rayadas y tapa resistente.', 2800, 3200, 'LIB-001', 30, true, true),
    ('regaleria', 'Box de regalo', 'box-de-regalo', 'Combo listo para regalar', 'Set de regalo con presentación cuidada, ideal para cumpleaños o fechas especiales.', 7200, 8500, 'REG-001', 12, true, true),
    ('accesorios', 'Bolso organizador', 'bolso-organizador', 'Bolso práctico multiuso', 'Bolso liviano para organizar objetos personales y compras pequeñas.', 5400, 6200, 'ACC-001', 10, false, true)
) as p(category_slug, name, slug, short_description, description, price, compare_at_price, sku, stock, featured, active)
join public.categories c on c.slug = p.category_slug;

insert into public.product_images (product_id, image_url, alt_text, sort_order)
select p.id, i.image_url, i.alt_text, i.sort_order
from (
  values
    ('taza-estampada', 'https://via.placeholder.com/800x800?text=Taza+Estampada', 'Taza estampada', 1),
    ('cuaderno-a5', 'https://via.placeholder.com/800x800?text=Cuaderno+A5', 'Cuaderno A5', 1),
    ('box-de-regalo', 'https://via.placeholder.com/800x800?text=Box+de+Regalo', 'Box de regalo', 1),
    ('bolso-organizador', 'https://via.placeholder.com/800x800?text=Bolso+Organizador', 'Bolso organizador', 1)
) as i(product_slug, image_url, alt_text, sort_order)
join public.products p on p.slug = i.product_slug;

commit;

begin;

create extension if not exists "pgcrypto";

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  price numeric(12,2) not null default 0,
  compare_at_price numeric(12,2),
  sku text unique,
  stock integer not null default 0,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  media_type text not null default 'image',
  use_case text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.product_images
drop constraint if exists product_images_media_type_check;

alter table public.product_images
add constraint product_images_media_type_check
check (media_type in ('image', 'model'));

alter table public.product_images
drop constraint if exists product_images_use_case_check;

alter table public.product_images
add constraint product_images_use_case_check
check (use_case in ('catalog', 'detail', 'gallery', 'hero') or use_case is null);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;

do $$ begin
  create policy "Public can view active categories"
  on public.categories
  for select
  to anon, authenticated
  using (active = true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Public can view active products"
  on public.products
  for select
  to anon, authenticated
  using (active = true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Public can view product images"
  on public.product_images
  for select
  to anon, authenticated
  using (true);
exception when duplicate_object then null; end $$;

create or replace function public.generate_product_sku()
returns text
language plpgsql
as $$
declare
  last_number integer;
  next_number integer;
begin
  select max(
    case
      when sku ~ '^SKU-[0-9]+$' then substring(sku from 5)::integer
      else null
    end
  )
  into last_number
  from public.products;

  next_number := coalesce(last_number, 0) + 1;

  return 'SKU-' || lpad(next_number::text, 4, '0');
end;
$$;

create or replace function public.set_product_sku_if_missing()
returns trigger
language plpgsql
as $$
begin
  if new.sku is null or btrim(new.sku) = '' then
    new.sku := public.generate_product_sku();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_product_sku_if_missing on public.products;

create trigger trg_set_product_sku_if_missing
before insert on public.products
for each row
execute function public.set_product_sku_if_missing();

commit;
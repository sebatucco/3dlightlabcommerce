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

alter table public.products add column if not exists category text;
alter table public.products add column if not exists image text;
alter table public.products add column if not exists image_url text;

create table if not exists public.products (
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

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  reason text not null default '',
  product text not null default '',
  message text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
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
  constraint orders_status_check check (status in ('pending', 'approved', 'confirmed', 'shipped', 'delivered', 'rejected', 'cancelled')),
  constraint orders_payment_method_check check (payment_method in ('mercadopago', 'transferencia', 'whatsapp'))
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12,2) not null,
  quantity integer not null default 1,
  subtotal numeric(12,2) not null
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'customer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('admin', 'staff', 'customer'))
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'customer'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.touch_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.touch_profile_updated_at();

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.contacts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.profiles enable row level security;

do $$ begin
  create policy "Public can view active categories" on public.categories for select to anon, authenticated using (active = true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Public can view active products" on public.products for select to anon, authenticated using (active = true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Public can view product images" on public.product_images for select to anon, authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

commit;

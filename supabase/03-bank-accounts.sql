begin;

-- Tabla de cuentas bancarias con borrado lógico
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  holder_name text not null,
  cbu text not null,
  alias text,
  cuit text,
  account_type text not null default 'cuenta_corriente',
  active boolean not null default true,
  deleted boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger para updated_at
drop trigger if exists bank_accounts_set_updated_at on public.bank_accounts;
create trigger bank_accounts_set_updated_at
  before update on public.bank_accounts
  for each row execute procedure public.touch_updated_at();

-- Índices
create index if not exists idx_bank_accounts_active_deleted on public.bank_accounts(active, deleted, sort_order);

-- RLS
alter table public.bank_accounts enable row level security;

do $$ begin
  create policy "Public can view active bank accounts"
  on public.bank_accounts for select
  to anon, authenticated
  using (active = true and deleted = false);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins can manage bank accounts"
  on public.bank_accounts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
exception when duplicate_object then null; end $$;

commit;

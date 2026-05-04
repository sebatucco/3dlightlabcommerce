begin;

create table if not exists public.site_media (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  alt_text text,
  title text,
  subtitle text,
  use_case text not null,
  sort_order integer not null default 0,
  bucket text not null default 'site-media-images',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_media_use_case_check check (use_case in ('gallery', 'hero'))
);

create index if not exists idx_site_media_active_use_case_sort
  on public.site_media(active, use_case, sort_order, created_at desc);

alter table public.site_media enable row level security;

do $$ begin
  create policy "Public can view active site media"
  on public.site_media for select
  to anon, authenticated
  using (active = true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins can manage site media"
  on public.site_media for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
exception when duplicate_object then null; end $$;

drop trigger if exists site_media_set_updated_at on public.site_media;
create trigger site_media_set_updated_at
  before update on public.site_media
  for each row execute procedure public.touch_updated_at();

commit;

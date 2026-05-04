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
  updated_at timestamptz not null default now()
);

alter table public.site_media
  drop constraint if exists site_media_use_case_check;

alter table public.site_media
  add constraint site_media_use_case_check
  check (use_case in ('gallery', 'hero', 'carousel'));

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
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.is_active = true
    )
  );
exception when duplicate_object then null; end $$;

drop trigger if exists site_media_set_updated_at on public.site_media;
create trigger site_media_set_updated_at
  before update on public.site_media
  for each row execute procedure public.touch_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media-images',
  'site-media-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$ begin
  create policy "Public can read site media images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'site-media-images');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins can upload site media images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'site-media-images'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.is_active = true
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins can update site media images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'site-media-images'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.is_active = true
    )
  )
  with check (
    bucket_id = 'site-media-images'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.is_active = true
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins can delete site media images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'site-media-images'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.is_active = true
    )
  );
exception when duplicate_object then null; end $$;

commit;

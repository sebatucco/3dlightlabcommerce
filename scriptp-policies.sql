-- lectura pública de imágenes
create policy "Public read product images"
on storage.objects
for select
to public
using (bucket_id = 'product-images');

-- lectura pública de modelos
create policy "Public read product models"
on storage.objects
for select
to public
using (bucket_id = 'product-models');

-- subida por usuarios autenticados a imágenes
create policy "Authenticated upload product images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'product-images');

-- subida por usuarios autenticados a modelos
create policy "Authenticated upload product models"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'product-models');

-- actualización por usuarios autenticados en imágenes
create policy "Authenticated update product images"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');

-- actualización por usuarios autenticados en modelos
create policy "Authenticated update product models"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-models')
with check (bucket_id = 'product-models');

-- borrado por usuarios autenticados en imágenes
create policy "Authenticated delete product images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-images');

-- borrado por usuarios autenticados en modelos
create policy "Authenticated delete product models"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-models');
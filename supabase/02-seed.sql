insert into public.categories (name, slug, description, sort_order, active)
values
  ('Mates de calabaza', 'mates-de-calabaza', 'Mates clásicos de calabaza, curados y listos para acompañar cada ronda.', 1, true),
  ('Mates de algarrobo', 'mates-de-algarrobo', 'Piezas artesanales en madera, con terminaciones naturales.', 2, true),
  ('Imperiales', 'imperiales', 'Mates premium forrados en cuero y detalles criollos.', 3, true),
  ('Bombillas', 'bombillas', 'Bombillas de alpaca, acero inoxidable y diseños clásicos.', 4, true),
  ('Sets materos', 'sets-materos', 'Combos para regalar o arrancar con todo lo necesario.', 5, true)
on conflict (slug) do nothing;

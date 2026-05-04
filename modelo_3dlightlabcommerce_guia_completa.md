# Modelo Ecommerce Reutilizable - Guia Completa

Esta guia sirve para recrear este proyecto desde cero y adaptarlo a cualquier rubro (moda, hogar, repuestos, tecnologia, etc.) sin romper la base tecnica.

## 1) Que trae el modelo

- Frontend en Next.js (App Router) con home, catalogo, detalle y checkout.
- Backend API con validaciones, observabilidad y rate limit.
- Panel admin con login, categorias, productos, variantes, imagenes, pedidos y cuentas bancarias.
- Integracion de pagos: Mercado Pago, transferencia y cierre por WhatsApp.
- Persistencia en Supabase (Postgres + Storage + Auth + RLS).

## 2) Paquete para recrear desde cero

El archivo `modelo_3dlightlabcommerce_recrear_desde_cero.zip` incluye:

- `.env.example`
- `README.md`
- `CHECKLIST_DEPLOY_SEGURIDAD.md`
- `SERVICIOS_EXTERNOS.md`
- `CONFIGURACIONES_DINAMICAS.md`
- `01_supabase_bootstrap.sql`

## 3) Flujo recomendado de arranque

1. Crear proyecto en Supabase.
2. Ejecutar `01_supabase_bootstrap.sql` en SQL Editor.
3. Crear usuario admin en Supabase Auth.
4. Dar rol admin en `public.profiles`.
5. Configurar variables de entorno (`.env.local` y hosting).
6. Instalar dependencias y levantar local.
7. Probar checkout completo y panel admin.

## 4) Admin inicial

```sql
insert into public.profiles (id, email, role, is_active)
values ('AUTH_USER_ID_AQUI', 'admin@tu-dominio.com', 'admin', true)
on conflict (id) do update
set role = 'admin', is_active = true, email = excluded.email;
```

## 5) Adaptar el modelo a otro negocio

Cambios minimos para una nueva marca:

- `lib/site.js`: nombre comercial, WhatsApp, email, ubicacion, textos base.
- Home (`app/page.js`): titulares, propuestas de valor y secciones visuales.
- Seed/catalogo: categorias, productos, precios, stock, imagenes y variantes.
- Branding visual: logo, paleta, tipografia, fotos.

No cambiar al principio:

- Contratos de API.
- Estructura de tablas y checks de estados.
- Flujo de orden -> preferencia MP -> webhook -> actualizacion de estado.

## 6) Contratos clave de datos

### orders

- `payment_method`: `mercadopago | transferencia | whatsapp`
- `status`: `pending | approved | cancelled | rejected`
- `shipping_status`: `pending | preparing | shipped | delivered | cancelled`
- `external_reference` obligatorio y unico.

### order_items

- Soporta variantes (`variant_id`, `variant_name`) y opciones (`selected_options`).

### media

- Producto base: `use_case = catalog`
- Variante: `use_case = detail`
- Global home: `use_case = gallery | hero | carousel`
- Buckets:
  - `product-images`
  - `product-variant-images`
  - `product-models`
  - `site-media-images`

## 7) Seguridad minima obligatoria

- RLS activa en tablas publicas.
- Operaciones sensibles via backend (nunca desde cliente directo con service role).
- `ADMIN_SESSION_SECRET` >= 32 caracteres.
- Tokens/API keys solo en variables server.
- Webhook de Mercado Pago con token/firma/IP allowlist cuando aplique.

## 8) Pruebas funcionales antes de publicar

1. Catalogo y detalle cargan datos reales.
2. Carrito suma/edita/elimina correctamente.
3. Checkout crea orden con los tres medios de pago.
4. Mercado Pago crea preferencia y webhook actualiza estado.
5. Transferencia muestra cuentas activas y conserva el pedido.
6. WhatsApp abre mensaje con resumen y mantiene trazabilidad.
7. Admin ABM de categorias/productos/imagenes/pedidos funciona.
8. Carga de imagen global (gallery/hero/carousel) funciona end-to-end.

## 9) Errores frecuentes y solucion corta

- `null value in column external_reference`: generar `external_reference` al crear orden.
- `Metodo de pago invalido`: desalineacion front/back (`transfer` vs `transferencia`, falta `whatsapp`).
- `Could not find column ...`: esquema de DB distinto al esperado.
- `function public.is_admin() does not exist`: usar policy basada en `profiles` + `auth.uid()`.
- `site_media` o bucket faltante: ejecutar SQL de bootstrap completo.

## 10) Resultado esperado

Con este modelo tenes una base ecommerce productiva, escalable y reutilizable para otros negocios cambiando branding, catalogo y configuraciones, sin rehacer la arquitectura.

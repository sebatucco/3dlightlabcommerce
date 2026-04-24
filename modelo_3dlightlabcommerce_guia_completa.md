# 3DLightLab Commerce - Guía para crear el sitio desde cero

Este paquete sirve como modelo para recrear el ecommerce desde cero o clonar la arquitectura para otro proyecto.

## 1. Qué incluye

- `01_supabase_bootstrap.sql`: script limpio para crear tablas, triggers, funciones, RLS y buckets.
- `.env.example`: plantilla de variables para local y Netlify.
- `CHECKLIST_DEPLOY_SEGURIDAD.md`: checklist operativo de deploy, seguridad, auth y webhooks.
- `SERVICIOS_EXTERNOS.md`: dónde obtener API keys de Supabase, Mercado Pago, Groq y OpenAI.
- `CONFIGURACIONES_DINAMICAS.md`: qué conviene sacar del código y llevar a base de datos.

## 2. Orden recomendado para levantar un proyecto nuevo

1. Crear proyecto en Supabase.
2. Ejecutar `01_supabase_bootstrap.sql` en Supabase SQL Editor.
3. Crear un usuario admin en Supabase Auth.
4. Insertar ese usuario en `public.profiles` con rol `admin`.
5. Crear/verificar buckets Storage: `product-images`, `product-models`, `transfer-receipts`.
6. Configurar variables de entorno en `.env.local` y Netlify.
7. Deployar en Netlify.
8. Configurar webhook de Mercado Pago.
9. Cargar categorías, productos, imágenes/modelos, cuentas bancarias.
10. Probar checkout, transferencia, Mercado Pago, contacto, chat y panel admin.

## 3. Crear admin inicial

Después de crear un usuario desde Supabase Auth, copiar su UUID y ejecutar:

```sql
insert into public.profiles (id, email, role, is_active)
values ('AUTH_USER_ID_AQUI', 'admin@tu-dominio.com', 'admin', true)
on conflict (id) do update
set role = 'admin', is_active = true, email = excluded.email;
```

## 4. Rutas principales del sistema

### Público

- `/` tienda pública
- `/producto/[id]` detalle de producto
- `/checkout` checkout
- `/checkout/success`
- `/checkout/failure`
- `/checkout/pending`
- `/checkout/transfer`

### Admin

- `/admin` dashboard
- `/admin/login`
- `/admin/categorias`
- `/admin/productos`
- `/admin/imagenes`
- `/admin/pedidos`
- `/admin/cuentas-bancarias`

### APIs públicas/server

- `GET /api/products`
- `GET /api/categories`
- `POST /api/contacts`
- `POST /api/orders`
- `GET/PATCH /api/orders/[id]`
- `GET /api/bank-accounts`
- `POST /api/chat`
- `POST /api/mercadopago/preference`
- `POST /api/mercadopago/webhook`

### APIs admin

- `/api/admin/session`
- `/api/admin/login`
- `/api/admin/logout`
- `/api/admin/categories`
- `/api/admin/products`
- `/api/admin/product-images`
- `/api/admin/orders`
- `/api/admin/contacts`
- `/api/admin/bank-accounts`
- `/api/admin/storage/upload`

## 5. Contactos y leads

El formulario público usa `POST /api/contacts`. Guarda en `public.contacts` si recibe:

- `name`
- `email`
- `message`
- opcional: `phone`, `reason`, `product`

El chatbot también puede guardar leads en la misma tabla usando service role desde `/api/chat`.

## 6. Chatbot

El chat funciona con estrategia híbrida:

1. Reglas locales: productos, pagos, pedidos, leads.
2. IA opcional: Groq primero, OpenAI como fallback.
3. Supabase sigue siendo la fuente real para productos, stock, pedidos y cuentas.

No conviene dejar que la IA invente productos, precios o estados. La IA solo interpreta intención y genera una búsqueda limpia.

## 7. Notas importantes

- `SUPABASE_SERVICE_ROLE_KEY` nunca debe ir al frontend.
- `OPENAI_API_KEY` y `GROQ_API_KEY` nunca deben exponerse al navegador.
- Las variables de `.env.local` no sirven en producción: también deben estar en Netlify.
- Si se expone una API key en un chat o repositorio, revocarla y crear una nueva.
# Servicios externos y dónde obtener credenciales

## Supabase

Panel: https://supabase.com/dashboard

Credenciales:

1. Entrar al proyecto.
2. Ir a Project Settings > API.
3. Copiar:
   - Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key -> `SUPABASE_SERVICE_ROLE_KEY`

Importante: la service role key permite acceso elevado y solo debe usarse en backend/server.

## Supabase Storage

Buckets usados:

- `product-images`: imágenes públicas de productos.
- `product-models`: modelos 3D públicos `.glb/.gltf`.
- `transfer-receipts`: comprobantes de transferencia privados.

El SQL del paquete crea/actualiza los buckets sin borrar archivos existentes.

## Mercado Pago

Panel Developers: https://www.mercadopago.com.ar/developers

Credenciales:

1. Crear aplicación.
2. Ir a credenciales de producción o prueba.
3. Copiar Access Token.
4. Guardar como `MERCADOPAGO_ACCESS_TOKEN`.

Webhook sugerido:

```text
https://tu-dominio.com/api/mercadopago/webhook
```

Back URLs que usa el sitio:

- `/checkout/success`
- `/checkout/failure`
- `/checkout/pending`

## Groq

API keys: https://console.groq.com/keys
Docs: https://console.groq.com/docs

Variable:

```env
GROQ_API_KEY=gsk_xxxxx
```

Uso recomendado en este proyecto: clasificador de intención del chatbot. No debe decidir precios, stock o estados.

## OpenAI

API keys: https://platform.openai.com/api-keys
Docs: https://developers.openai.com/api/docs

Variable:

```env
OPENAI_API_KEY=sk-proj-xxxxx
```

Uso recomendado: fallback si Groq falla o si se quiere una respuesta más robusta.

## Netlify

Panel: https://app.netlify.com

Configurar variables en:

```text
Site configuration > Environment variables
```

Luego hacer redeploy.
# Checklist de deploy y seguridad

## Variables obligatorias en Netlify

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_SESSION_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `MERCADOPAGO_ACCESS_TOKEN`
- `GROQ_API_KEY` opcional pero recomendado para IA
- `OPENAI_API_KEY` opcional como fallback

## Seguridad crítica

- No subir `.env.local` a GitHub.
- No pegar API keys en chats ni tickets.
- Revocar claves expuestas inmediatamente.
- Mantener `SUPABASE_SERVICE_ROLE_KEY` solo en server.
- Mantener `ADMIN_SESSION_SECRET` con mínimo 32 caracteres.
- Revisar que cookies admin sean `httpOnly` y `secure` en producción.
- Activar RLS en tablas públicas.
- No permitir inserts públicos directos en `orders` ni `contacts`; usar API server.

## Supabase Auth / Admin

1. Crear usuario admin desde Supabase Auth.
2. Insertar su UUID en `public.profiles` con `role = 'admin'`.
3. Probar `/admin/login`.
4. Probar que usuarios sin profile admin no puedan entrar.

## Storage

- `product-images`: público.
- `product-models`: público.
- `transfer-receipts`: privado.
- Subidas deben hacerse desde endpoint admin con service role.

## Mercado Pago

- Usar Access Token correcto según entorno: test o producción.
- Configurar webhook:
  - `https://tu-dominio.com/api/mercadopago/webhook`
- Probar pago aprobado, pendiente y rechazado.
- Validar que el webhook actualice `orders.status` y `mp_payment_id`.

## Cron / órdenes vencidas

El proyecto incluye función SQL:

```sql
select public.cancel_expired_transfer_orders();
```

Y puede exponerse desde:

```text
/api/cron/cancel-expired-orders
```

Recomendación: proteger con `CRON_SECRET` y configurar un cron diario/horario en Netlify o servicio externo.

## Pruebas mínimas antes de producción

- Home carga productos reales.
- Producto detalle carga imágenes/modelos.
- Carrito funciona.
- Checkout crea orden.
- Transferencia descuenta stock y expira si corresponde.
- Mercado Pago crea preferencia.
- Webhook cambia estado de pedido.
- Admin puede aprobar/cancelar transferencia.
- Contacto guarda en `contacts`.
- Chat responde productos, cuentas y pedidos.
- Imágenes suben a Storage.
- Cuentas bancarias activas aparecen en checkout.
# Configuraciones que conviene hacer dinámicas

Actualmente varios datos suelen vivir en `lib/site.js`. Para hacer el proyecto reutilizable y administrable, conviene migrarlos a `public.site_settings` o a una pantalla admin de configuración.

## Configuraciones recomendadas

- Nombre de la tienda.
- Logo.
- Email comercial.
- Teléfono.
- WhatsApp.
- Ubicación.
- Horarios de atención.
- Mensaje principal del home.
- Texto de beneficios.
- Redes sociales.
- Mensaje de transferencia.
- Costo de envío base.
- Umbral de envío gratis.
- Mensajes automáticos del chatbot.
- Activar/desactivar Mercado Pago.
- Activar/desactivar transferencia.
- Activar/desactivar WhatsApp checkout.

## Tabla incluida

El SQL incluye:

```sql
public.site_settings(key, value, value_json, public, active)
```

Ejemplo:

```sql
insert into public.site_settings(key, value, public, active)
values ('whatsapp_number', '5493810000000', true, true)
on conflict (key) do update set value = excluded.value;
```

## Próximo desarrollo recomendado

Crear una pantalla admin:

```text
/admin/configuracion
```

Con ABM simple para editar:

- teléfono
- email
- WhatsApp
- dirección
- redes
- textos principales
- flags de pago

Así el sitio queda reusable para otro comercio sin tocar código.
# Resumen rápido del modelo

Para recrear el sitio desde cero:

1. Crear proyecto Supabase.
2. Ejecutar `01_supabase_bootstrap.sql`.
3. Crear usuario admin en Supabase Auth.
4. Insertarlo en `public.profiles` como admin.
5. Cargar variables de entorno en `.env.local` y Netlify.
6. Deployar en Netlify.
7. Configurar Mercado Pago y webhook.
8. Cargar datos desde admin:
   - categorías
   - productos
   - imágenes/modelos
   - cuentas bancarias
9. Probar checkout y pedidos.
10. Probar chat y contacto.

Este modelo queda preparado para ecommerce con:

- catálogo con baja lógica
- SKU automático
- imágenes y modelos 3D en Storage
- pedidos con transferencia/Mercado Pago
- comprobantes
- cuentas bancarias dinámicas
- chatbot híbrido con IA
- contactos/leads
- panel admin modular

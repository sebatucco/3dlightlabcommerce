# 3DLightLabCommerce

Proyecto ecommerce basado en **SendasDelTafiMatesCommerce** con identidad visual adaptada a **3DLightLab**.

## Qué mantiene
- Next.js App Router
- Catálogo
- Carrito
- Checkout
- Integración con Mercado Pago
- Integración con Supabase
- Panel admin
- Contacto por WhatsApp

## Qué cambia
- Branding: 3DLightLab Commerce
- Paleta más clara y cálida
- Tipografía y dirección visual alineadas al proyecto 3DLightLab
- Productos demo y textos orientados a lámparas e iluminación

## Variables de entorno
Copiá `.env.example` a `.env.local` y completá:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MERCADOPAGO_ACCESS_TOKEN`
- `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `ADMIN_SESSION_SECRET`
- `GROQ_API_KEY` (opcional, IA principal del chat)
- `GROQ_MODEL` (opcional)
- `OPENAI_API_KEY` (opcional, fallback del chat)
- `OPENAI_MODEL` (opcional)
- `OPENAI_FALLBACK_ENABLED` (opcional, `false` para deshabilitar fallback OpenAI)
- `METRICS_PERSISTENCE_ENABLED` (opcional)

## Ejecutar
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm start
```

## Observabilidad
- Todas las requests pasan por `proxy.js` y reciben `x-request-id`.
- Endpoints críticos registran logs estructurados JSON (inicio, fin, error, latencia).
- Healthcheck: `GET /api/health`.
- Métricas de API (requiere admin): `GET /api/metrics`.
- Persistencia de métricas en Supabase:
  - crear tabla con `supabase/04-api-metrics.sql`
  - `METRICS_PERSISTENCE_ENABLED=true`
- Alertas automáticas (opcional):
  - `ALERT_MIN_SAMPLES`, `ALERT_WARN_ERROR_RATE`, `ALERT_CRITICAL_ERROR_RATE`
  - `ALERT_WARN_AVG_LATENCY_MS`, `ALERT_CRITICAL_AVG_LATENCY_MS`
  - webhook: `ALERT_WEBHOOK_URL` y `ALERT_WEBHOOK_COOLDOWN_MS`
- Rate limiting distribuido (opcional):
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- Hardening de webhook Mercado Pago (opcional):
  - `MERCADOPAGO_WEBHOOK_SECRET` (token en query `?token=` o header `x-webhook-token`)
  - `MERCADOPAGO_WEBHOOK_IP_ALLOWLIST` (IPs separadas por coma)
  - Firma HMAC-SHA256: usa el mismo secret para verificar header `x-signature`
- Tests:
```bash
npm run test
```

## Nota técnica
- Se eliminó TypeScript del runtime para evitar conflictos de build.
- `middleware.js` fue reemplazado por `proxy.js` para compatibilidad con Next 16.

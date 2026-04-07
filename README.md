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

## Nota técnica
- Se eliminó TypeScript del runtime para evitar conflictos de build.
- `middleware.js` fue reemplazado por `proxy.js` para compatibilidad con Next 16.

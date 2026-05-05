export const siteConfig = {
  brandName: '3DLightLab Commerce',
  tagline: 'iluminación premium',
  description:
    'Tienda online de lámparas y piezas de iluminación con una experiencia de compra simple, cálida y enfocada en diseño.',
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5493815642773',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hola@3dlightlab.com',
  location: process.env.NEXT_PUBLIC_LOCATION || 'Tucumán, Argentina',
  bankInfo: {
    banco: process.env.NEXT_PUBLIC_BANK_NAME || 'Banco a definir',
    titular: process.env.NEXT_PUBLIC_BANK_HOLDER || '3DLightLab Commerce',
    cbu: process.env.NEXT_PUBLIC_BANK_CBU || '0000000000000000000000',
    alias: process.env.NEXT_PUBLIC_BANK_ALIAS || 'REEMPLAZAR.ALIAS',
    cuit: process.env.NEXT_PUBLIC_BANK_CUIT || '00-00000000-0',
  },
}

export const siteContent = {
  hero: {
    eyebrow: 'Diseño de iluminación premium',
    titlePrefix: 'Luz cálida para',
    titleHighlight: 'espacios con carácter',
    description:
      '3DLightLab Commerce reúne piezas decorativas, lámparas escultóricas y soluciones de iluminación con una experiencia de compra clara y elegante.',
  },
  catalog: {
    title: 'Colección destacada',
    description: 'Lámparas con materialidad cálida, presencia visual y detalles cuidados.',
  },
  about: {
    eyebrow: 'Nuestro enfoque',
    title: 'Más que una lámpara, una atmósfera',
    description:
      'En 3DLightLab Commerce entendemos la iluminación como parte esencial del proyecto interior. Seleccionamos piezas que aportan textura, escala y una luz confortable para habitar mejor cada ambiente.',
  },
}

export const benefits = [
  {
    title: 'Diseño con presencia',
    description: 'Piezas que iluminan y, al mismo tiempo, elevan la estética del espacio.',
  },
  {
    title: 'Compra simple',
    description: 'Catálogo claro, carrito rápido y checkout listo para vender sin fricción.',
  },
  {
    title: 'Atención cercana',
    description: 'WhatsApp integrado para consultas, proyectos especiales y seguimiento.',
  },
  {
    title: 'Base escalable',
    description: 'La lógica ecommerce de Sendas se mantiene intacta para crecer con nuevos productos.',
  },
]

export const faqs = [
  {
    question: '¿Qué medios de pago acepta la tienda?',
    answer: 'Podés pagar con Mercado Pago, transferencia bancaria o coordinar la compra por WhatsApp.',
  },
  {
    question: '¿Los productos se administran desde un panel?',
    answer: 'Sí. La tienda conserva el panel de administración para productos, imágenes, pedidos y contactos.',
  },
  {
    question: '¿Se puede conectar a Supabase?',
    answer: 'Sí. La base funcional sigue preparada para productos, pedidos, contactos y categorías.',
  },
  {
    question: '¿Se pueden seguir ajustando colores, textos o secciones?',
    answer: 'Sí. Esta versión deja una base limpia para evolucionar branding, catálogo y experiencia visual.',
  },
]

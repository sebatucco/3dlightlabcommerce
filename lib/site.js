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

export const fallbackProducts = [
  {
    id: 'lamp-aurora',
    slug: 'lampara-aurora',
    name: 'Lámpara Aurora',
    short_description: 'Pantalla de líneas suaves con luz cálida para livings y dormitorios.',
    description: 'Una pieza decorativa con presencia liviana, ideal para ambientar espacios contemporáneos con luz envolvente.',
    price: 189990,
    originalPrice: 219990,
    image: '/products/lamp-aurora.jpg',
    category: 'Colgantes',
    stock: 6,
    featured: true,
  },
  {
    id: 'lamp-esme',
    slug: 'lampara-esme',
    name: 'Lámpara Esmé',
    short_description: 'Diseño escultórico para mesas de apoyo, escritorios o rincones de lectura.',
    description: 'Combina textura visual y luz suave en una silueta elegante, pensada para interiores de estética cálida.',
    price: 149990,
    image: '/products/lamp-esme.jpg',
    category: 'Mesa',
    stock: 4,
    featured: true,
  },
  {
    id: 'lamp-margot',
    slug: 'lampara-margot',
    name: 'Lámpara Margot',
    short_description: 'Pieza de autor para dar profundidad y carácter a comedores y recepciones.',
    description: 'Una lámpara de volumen equilibrado, con terminaciones sobrias y materialidad premium.',
    price: 239990,
    image: '/products/lamp-margot.jpg',
    category: 'Statement',
    stock: 3,
    featured: false,
  },
  {
    id: 'lamp-maverick',
    slug: 'lampara-maverick',
    name: 'Lámpara Maverick',
    short_description: 'Perfil contemporáneo y cálido para proyectos residenciales o comerciales.',
    description: 'Diseñada para destacar sin invadir, con una luz confortable que acompaña la arquitectura del ambiente.',
    price: 209990,
    image: '/products/lamp-maverick.jpg',
    category: 'Suspensión',
    stock: 5,
    featured: true,
  },
]

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

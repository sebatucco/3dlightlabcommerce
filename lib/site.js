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
  navigation: [
    { href: '/#inicio', label: 'Inicio' },
    { href: '/#catalogo', label: 'Colección' },
    { href: '/#nosotros', label: 'Estudio' },
    { href: '/#contacto', label: 'Contacto' },
  ],
  hero: {
    eyebrow: 'Diseño de iluminación premium',
    titlePrefix: 'Luz cálida para',
    titleHighlight: 'espacios con carácter',
    description:
      '3DLightLab Commerce reúne piezas decorativas, lámparas escultóricas y soluciones de iluminación con una experiencia de compra clara y elegante.',
    ctas: {
      collection: 'Ver colección',
      advice: 'Pedir asesoramiento',
    },
  },
  carousel: {
    eyebrow: 'Galería destacada',
    title: 'Piezas diseñadas para transformar la atmósfera del espacio',
    description:
      'Una selección visual inspirada en 3DLightLab para presentar la colección antes de entrar al catálogo.',
    items: [
      { name: 'Diseño lumínico', title: 'Colección Aurora', img: '/gallery/gallery-1.jpg' },
      { name: 'Texturas cálidas', title: 'Colección Esmé', img: '/gallery/gallery-2.jpg' },
      { name: 'Volúmenes suaves', title: 'Colección Margot', img: '/gallery/gallery-3.jpg' },
      { name: 'Escenas contemporáneas', title: 'Colección Maverick', img: '/gallery/gallery-4.jpg' },
      { name: 'Luz para habitar', title: 'Ambientes reales', img: '/products/lamp-aurora.jpg' },
      { name: 'Piezas con carácter', title: 'Edición premium', img: '/products/lamp-margot.jpg' },
    ],
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
  contact: {
    title: 'Hablemos de tu proyecto',
    description:
      'Podemos ayudarte a elegir la pieza adecuada para un ambiente puntual, una renovación completa o una propuesta comercial.',
    form: {
      nameLabel: 'Nombre',
      namePlaceholder: 'Tu nombre',
      emailLabel: 'Email',
      emailPlaceholder: 'tu@email.com',
      messageLabel: 'Mensaje',
      messagePlaceholder: 'Contanos qué ambiente querés resolver o qué pieza te interesa.',
      submit: 'Enviar consulta',
    },
  },
  footer: {
    description:
      'Lámparas y piezas de iluminación pensadas para crear ambientes cálidos, contemporáneos y memorables.',
    navTitle: 'Navegación',
    contactTitle: 'Contacto',
    rights: 'Todos los derechos reservados.',
  },
  features: [
    {
      title: 'Luz con intención',
      desc: 'Diseños pensados para vestir espacios y generar atmósferas cálidas.',
    },
    {
      title: 'Estética contemporánea',
      desc: 'Formas nobles, texturas suaves y una presencia visual premium.',
    },
    {
      title: 'Calidad cuidada',
      desc: 'Piezas preparadas para acompañar proyectos residenciales y comerciales.',
    },
    {
      title: 'Pensado para habitar',
      desc: 'Iluminación decorativa para livings, dormitorios, recepciones y estudios.',
    },
  ],
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

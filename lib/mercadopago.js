// Mercado Pago configuration and helpers
export const MP_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ||
  process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY

export function formatPrice(price) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function generateWhatsAppLink(phone, message) {
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${phone}?text=${encodedMessage}`
}

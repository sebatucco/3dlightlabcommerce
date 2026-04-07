import './globals.css'
import { CartProvider } from '@/lib/store'
import { siteConfig } from '@/lib/site'

export const metadata = {
  title: `${siteConfig.brandName} | ${siteConfig.tagline}`,
  description: siteConfig.description,
  keywords: 'lamparas, iluminacion, e-commerce, mercado pago, supabase, whatsapp, argentina',
  openGraph: {
    title: `${siteConfig.brandName} | ${siteConfig.tagline}`,
    description: siteConfig.description,
    type: 'website',
    locale: 'es_AR',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  )
}

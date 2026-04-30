import './globals.css'
import { CartProvider } from '@/lib/store'
import { siteConfig } from '@/lib/site'

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://tu-sitio.netlify.app'),
  title: `${siteConfig.brandName} | ${siteConfig.tagline}`,
  description: siteConfig.description,
  keywords: 'lamparas, iluminacion, e-commerce, lamparas 3d, lamparas diseño, veladores, argentina',
  authors: [{ name: siteConfig.brandName }],
  creator: siteConfig.brandName,
  publisher: siteConfig.brandName,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: {
    icon: '/favicon.png',
  },
  openGraph: {
    title: `${siteConfig.brandName} | ${siteConfig.tagline}`,
    description: siteConfig.description,
    type: 'website',
    locale: 'es_AR',
    siteName: siteConfig.brandName,
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://tu-sitio.netlify.app',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: siteConfig.brandName,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.brandName} | ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: ['/logo.png'],
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || '',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es-AR">
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

'use client'

import React, { useEffect, useState } from 'react'

const fallbackItems = [
  { name: 'Diseño lumínico', title: 'Colección Aurora', img: '/gallery/gallery-1.jpg' },
  { name: 'Texturas cálidas', title: 'Colección Esmé', img: '/gallery/gallery-2.jpg' },
  { name: 'Volúmenes suaves', title: 'Colección Margot', img: '/gallery/gallery-3.jpg' },
  { name: 'Escenas contemporáneas', title: 'Colección Maverick', img: '/gallery/gallery-4.jpg' },
  { name: 'Luz para habitar', title: 'Ambientes reales', img: '/products/lamp-aurora.jpg' },
  { name: 'Piezas con carácter', title: 'Edición premium', img: '/products/lamp-margot.jpg' },
]

export default function ImageCarousel() {
  const [activeItem, setActiveItem] = useState(2)
  const [isDesktop, setIsDesktop] = useState(false)
  const [items, setItems] = useState(fallbackItems)

  useEffect(() => {
    const checkScreen = () => setIsDesktop(window.innerWidth >= 768)
    checkScreen()
    window.addEventListener('resize', checkScreen)
    return () => window.removeEventListener('resize', checkScreen)
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadSiteMedia() {
      try {
        const response = await fetch('/api/site-media', { cache: 'no-store' })
        const data = await response.json().catch(() => ({}))

        if (!response.ok || !mounted) return

        const mapped = Array.isArray(data?.items)
          ? data.items
            .filter((item) => item?.image_url)
            .map((item, index) => ({
              name: item?.title || item?.alt_text || `Imagen ${index + 1}`,
              title: item?.subtitle || (item?.use_case === 'hero' ? 'Hero principal' : 'Galería destacada'),
              img: item.image_url,
            }))
          : []

        if (mapped.length > 0) {
          setItems(mapped)
          setActiveItem(0)
        }
      } catch {
        // fallback local
      }
    }

    loadSiteMedia()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <section className="w-full bg-[hsl(var(--bone))] py-8 md:py-12 xl:py-14">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.22em] text-[hsl(var(--warm-gray-dark))]">
            Galería destacada
          </p>
          <h2 className="text-3xl font-bold leading-tight text-foreground md:text-5xl">
            Piezas diseñadas para transformar la atmósfera del espacio
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
            Una selección visual inspirada en 3DLightLab para presentar la colección antes de entrar al catálogo.
          </p>
        </div>

        <ul className="flex w-full flex-col gap-3 md:flex-row md:gap-3 lg:gap-4">
          {items.map((item, index) => {
            const isActive = activeItem === index

            return (
              <li
                key={`${item.name}-${index}`}
                onClick={() => setActiveItem(index)}
                className="relative list-none cursor-pointer"
                style={{
                  flex: isDesktop ? (isActive ? 4.2 : 1) : 'unset',
                  transition: isDesktop ? 'flex 700ms cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none',
                }}
              >
                <div
                  className="relative h-[260px] w-full overflow-hidden rounded-[28px] border border-[hsl(var(--border))] bg-black shadow-[0_20px_45px_rgba(72,59,46,0.18)] transition-all duration-500 ease-out hover:shadow-[0_24px_55px_rgba(72,59,46,0.22)] sm:h-[300px] md:h-[420px] lg:h-[470px] xl:h-[560px]"
                >
                  <img
                    src={item.img}
                    alt={item.name}
                    className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out ${isActive ? 'scale-105 grayscale-0' : 'scale-100 grayscale'}`}
                  />

                  <div
                    className={`absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-70'}`}
                  />

                  <div
                    className={`absolute bottom-0 left-0 w-full p-4 text-white transition-all duration-700 ease-out sm:p-5 md:p-6 lg:p-8 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-100 md:translate-y-8 md:opacity-0'}`}
                  >
                    <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#ece3d8] sm:text-xs md:text-sm">
                      {item.title}
                    </p>

                    <p
                      className="mt-2 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl"
                      style={{ textShadow: '2px 2px 10px rgba(0,0,0,0.55)' }}
                    >
                      {item.name}
                    </p>
                  </div>

                  {!isDesktop && (
                    <div className="absolute right-4 top-4 rounded-full bg-black/35 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
                      {isActive ? 'Activo' : 'Tocar'}
                    </div>
                  )}

                  {isDesktop && !isActive && (
                    <div className="absolute inset-0 flex items-end justify-start p-4 md:p-5">
                      <div className="rounded-full bg-black/30 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
                        Ver
                      </div>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

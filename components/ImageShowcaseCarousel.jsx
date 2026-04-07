'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function ImageShowcaseCarousel({ items = [] }) {
  const slides = useMemo(() => items.filter(Boolean), [items])
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (slides.length <= 1) return undefined
    const id = window.setInterval(() => {
      setCurrent((value) => (value + 1) % slides.length)
    }, 5000)
    return () => window.clearInterval(id)
  }, [slides.length])

  if (!slides.length) return null

  const goTo = (index) => setCurrent(index)
  const prev = () => setCurrent((value) => (value - 1 + slides.length) % slides.length)
  const next = () => setCurrent((value) => (value + 1) % slides.length)

  return (
    <section className="container mx-auto px-4 pb-4 md:pb-8">
      <div className="surface-panel overflow-hidden rounded-[28px]">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative min-h-[340px] bg-[#ebe2d5] sm:min-h-[420px] lg:min-h-[520px]">
            {slides.map((slide, index) => (
              <div
                key={`${slide.image}-${index}`}
                className={`absolute inset-0 transition-opacity duration-700 ${index === current ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
              >
                <img src={slide.image} alt={slide.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(33,26,21,0.05)_0%,rgba(33,26,21,0.55)_100%)]" />
              </div>
            ))}

            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/20 text-white backdrop-blur transition hover:bg-black/35"
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/20 text-white backdrop-blur transition hover:bg-black/35"
                  aria-label="Siguiente imagen"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          <div className="flex flex-col justify-between gap-8 bg-[linear-gradient(180deg,#f8f3ec_0%,#f3ede3_100%)] p-8 md:p-10">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#8b7d69]">Colección destacada</p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight text-[#2c261f] md:text-5xl">
                {slides[current]?.title}
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#6f6458]">
                {slides[current]?.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {slides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  onClick={() => goTo(index)}
                  className={`min-w-[92px] rounded-full px-4 py-3 text-left text-sm transition ${
                    index === current
                      ? 'bg-[#2c261f] text-white shadow-[0_18px_35px_rgba(44,38,31,0.18)]'
                      : 'border border-[#ded4c7] bg-white text-[#5b5145] hover:border-[#b9ad9d]'
                  }`}
                >
                  {slide.cta || `Slide ${index + 1}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

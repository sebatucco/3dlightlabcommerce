'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Menu, X } from 'lucide-react'
import { useCart } from '@/lib/store'
import Logo from '@/components/Logo'
import { siteContent } from '@/lib/site'

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { itemCount, setIsOpen } = useCart()

  const navLinks = siteContent.navigation

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))/0.86] backdrop-blur-xl">
      <div className="container mx-auto flex h-20 items-center gap-6 px-4">
        <Link
          href="/#inicio"
          className="group shrink-0 transition-transform duration-300 hover:scale-[1.01]"
          aria-label="Ir al inicio"
        >
          <div className="hidden sm:block">
            <Logo />
          </div>
          <div className="sm:hidden">
            <Logo compact />
          </div>
        </Link>

        <div className="ml-auto flex items-center gap-3 md:gap-4">
          <nav className="hidden items-center gap-2 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative rounded-full border border-[hsl(var(--border))] bg-white/70 px-4 py-2 text-sm tracking-wide text-[hsl(var(--muted-foreground))] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[hsl(var(--surface-elevated))] hover:text-[hsl(var(--foreground))]"
              >
                <span className="relative z-10">{link.label}</span>
              </Link>
            ))}
          </nav>

          <button
            onClick={() => setIsOpen(true)}
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white/80 text-[hsl(var(--foreground))] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[hsl(var(--surface-elevated))]"
            aria-label="Abrir carrito"
          >
            <ShoppingCart size={19} />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[hsl(var(--background))] bg-[hsl(var(--primary))] px-1 text-[10px] font-semibold text-[hsl(var(--primary-foreground))] shadow-sm">
                {itemCount}
              </span>
            )}
          </button>

          <button
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white/80 text-[hsl(var(--foreground))] shadow-sm transition-all duration-200 hover:bg-[hsl(var(--surface-elevated))] md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menú"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/95 md:hidden"
          >
            <nav className="container mx-auto flex flex-col gap-2 px-4 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-2xl border border-transparent px-4 py-3 text-sm text-[hsl(var(--muted-foreground))] transition-all duration-200 hover:border-[hsl(var(--border))] hover:bg-white/60 hover:text-[hsl(var(--foreground))]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

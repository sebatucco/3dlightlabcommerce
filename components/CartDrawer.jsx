'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react'
import { useCart } from '@/lib/store'
import { formatPrice } from '@/lib/mercadopago'
import Link from 'next/link'

export default function CartDrawer() {
  const { cart, removeFromCart, updateQuantity, total, isOpen, setIsOpen } = useCart()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-50 bg-[rgba(35,29,23,0.32)] backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 24, stiffness: 180 }}
            className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col border-l border-[#e2d8ca] bg-[#f6f2ea]"
          >
            <div className="flex items-center justify-between border-b border-[#e2d8ca] p-6">
              <h2 className="flex items-center gap-2 text-2xl font-semibold text-[#2c261f]">
                <ShoppingBag className="h-5 w-5" />
                Tu carrito
              </h2>
              <button onClick={() => setIsOpen(false)} className="p-2 text-[#6f6458] transition hover:bg-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                <ShoppingBag className="mb-4 h-16 w-16 text-[#b4a895]" />
                <p className="text-[#6f6458]">Todavía no agregaste productos.</p>
                <button onClick={() => setIsOpen(false)} className="mt-5 bg-[#2c261f] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#41382f]">
                  Seguir viendo productos
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto p-6">
                  {cart.map((item, index) => (
                    <motion.div
                      key={`${item.product_id || item.id}-${item.variant_id || 'base'}`}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="border border-[#e2d8ca] bg-white p-4 shadow-sm"
                    >
                      <div className="flex gap-4">
                        <div className="h-20 w-20 flex-shrink-0 overflow-hidden bg-[#f3ede4]">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ShoppingBag className="h-8 w-8 text-[#b4a895]" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-[#2c261f]">{item.name}</h3>
                          {item.variant && <p className="mt-1 text-sm text-[#6f6458]">{item.variant}</p>}
                          <p className="mt-1 font-semibold text-[#2c261f]">{formatPrice(item.price)}</p>

                          <div className="mt-3 flex items-center gap-2">
                            <button onClick={() => updateQuantity(item.product_id || item.id, item.variant_id || null, item.quantity - 1)} className="border border-[#dfd5c7] p-1.5 text-[#2c261f] transition hover:bg-[#f6f2ea]">
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center font-medium text-[#2c261f]">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product_id || item.id, item.variant_id || null, item.quantity + 1)} className="border border-[#dfd5c7] p-1.5 text-[#2c261f] transition hover:bg-[#f6f2ea]">
                              <Plus className="h-4 w-4" />
                            </button>
                            <button onClick={() => removeFromCart(item.product_id || item.id, item.variant_id || null)} className="ml-auto p-1.5 text-[#a5665f] transition hover:bg-[#fbf0ee]">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="space-y-4 border-t border-[#e2d8ca] p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6f6458]">Total</span>
                    <span className="text-xl font-semibold text-[#2c261f]">{formatPrice(total)}</span>
                  </div>

                  <Link href="/checkout" onClick={() => setIsOpen(false)} className="block w-full bg-[#2c261f] py-4 text-center font-medium text-white transition hover:bg-[#41382f]">
                    Ir al checkout
                  </Link>

                  <button onClick={() => setIsOpen(false)} className="block w-full text-center text-sm font-medium text-[#6f6458] transition hover:text-[#2c261f]">
                    Seguir comprando
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

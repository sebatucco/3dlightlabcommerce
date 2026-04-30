'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

export function CartProvider({ children }) {
  const [cart, setCart] = useState([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const savedCart = localStorage.getItem('3dlightlab_cart')
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('3dlightlab_cart', JSON.stringify(cart))
  }, [cart])

  const addToCart = (product, variant = null, quantity = 1) => {
    const variantId = variant?.id || null
    const variantName = variant?.display_name || variant?.name || variant?.sku || null
    const variantPrice = Number(variant?.price)
    const unitPrice = Number.isFinite(variantPrice) ? variantPrice : Number(product?.price || 0)

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => String(item.product_id || item.id) === String(product.id) &&
          String(item.variant_id || '') === String(variantId || '')
      )

      if (existingIndex > -1) {
        const updated = [...prev]
        updated[existingIndex].quantity += quantity
        return updated
      }

      return [
        ...prev,
        {
          ...product,
          id: product.id,
          product_id: product.id,
          variant: variantName,
          variant_id: variantId,
          variant_name: variantName,
          selected_options: Array.isArray(variant?.selected_options) ? variant.selected_options : [],
          price: unitPrice,
          quantity,
        },
      ]
    })
  }

  const removeFromCart = (productId, variantId = null) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(
            String(item.product_id || item.id) === String(productId) &&
            String(item.variant_id || '') === String(variantId || '')
          )
      )
    )
  }

  const updateQuantity = (productId, variantId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId)
      return
    }

    setCart((prev) =>
      prev.map((item) => {
        if (
          String(item.product_id || item.id) === String(productId) &&
          String(item.variant_id || '') === String(variantId || '')
        ) {
          return { ...item, quantity }
        }
        return item
      })
    )
  }

  const clearCart = () => setCart([])

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        total,
        itemCount,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

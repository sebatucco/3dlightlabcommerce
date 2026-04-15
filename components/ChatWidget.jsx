'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bot, MessageCircle, Send, X } from 'lucide-react'
import { siteConfig } from '@/lib/site'

function formatPrice(value) {
    const amount = Number(value || 0)
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
    }).format(amount)
}

function ProductChatCard({ product }) {
    return (
        <Link
            href={`/producto/${product.slug || product.id}`}
            className="block rounded-2xl border border-[#e7dccd] bg-white p-3 transition hover:shadow-md"
        >
            <div className="flex gap-3">
                <div className="h-20 w-20 overflow-hidden rounded-xl bg-[#f7f1e8]">
                    <img
                        src={product.image_url || '/placeholder.jpg'}
                        alt={product.name}
                        className="h-full w-full object-cover"
                    />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-bold text-[#143047]">
                        {product.name}
                    </p>

                    {product.short_description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-[#6b7280]">
                            {product.short_description}
                        </p>
                    ) : null}

                    <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-extrabold text-[#b7793e]">
                            {formatPrice(product.price)}
                        </span>

                        <span className="rounded-full bg-[#f7f1e8] px-2 py-1 text-[11px] font-semibold text-[#143047]">
                            Stock: {product.stock ?? 0}
                        </span>
                    </div>

                    <span className="mt-2 inline-block text-xs font-semibold text-[#5e89a6]">
                        Ver producto
                    </span>
                </div>
            </div>
        </Link>
    )
}

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            role: 'assistant',
            content:
                'Hola 👋 Soy el asistente de 3DLightLab. Si estás buscando una lámpara o tenés alguna duda, te ayudo.',
            products: [],
        },
    ])

    const listRef = useRef(null)

    useEffect(() => {
        if (!listRef.current) return
        listRef.current.scrollTop = listRef.current.scrollHeight
    }, [messages, isLoading])

    const sendMessage = async (text) => {
        const trimmed = String(text || '').trim()
        if (!trimmed || isLoading) return

        const userMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: trimmed,
            products: [],
        }

        const nextMessages = [...messages, userMessage]
        setMessages(nextMessages)
        setInput('')
        setIsLoading(true)

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: trimmed,
                    messages: nextMessages.map((msg) => ({
                        role: msg.role,
                        content: msg.content,
                    })),
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo obtener respuesta')
            }

            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: data.reply,
                    products: Array.isArray(data.products) ? data.products : [],
                },
            ])
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content:
                        'Hubo un problema para responder ahora mismo. Podés escribirnos por WhatsApp y te ayudamos enseguida.',
                    products: [],
                },
            ])
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        await sendMessage(input)
    }

    const openWhatsApp = () => {
        const text = encodeURIComponent(
            'Hola, necesito ayuda con una consulta sobre 3DLightLab.'
        )
        window.open(`https://wa.me/${siteConfig.whatsappNumber}?text=${text}`, '_blank')
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="fixed bottom-5 right-3 z-[70] inline-flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--primary-foreground))] shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition hover:scale-105 sm:bottom-6 sm:right-4 sm:h-14 sm:w-14"
                aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat'}
            >
                {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
            </button>

            {isOpen && (
                <div className="fixed bottom-20 right-3 z-[70] flex h-[min(72vh,560px)] w-[min(calc(100vw-1.5rem),350px)] flex-col overflow-hidden rounded-[22px] border border-[hsl(var(--border))] bg-white shadow-[0_24px_60px_rgba(20,48,71,0.16)] sm:bottom-24 sm:right-4 sm:w-[350px] lg:w-[380px]">
                    <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--foreground))] px-4 py-3 text-[hsl(var(--primary-foreground))] sm:px-5 sm:py-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 sm:h-11 sm:w-11">
                            <Bot className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">Asistente 3DLightLab</p>
                            <p className="truncate text-[11px] text-white/75 sm:text-xs">
                                Te ayudo a encontrar productos
                            </p>
                        </div>
                    </div>

                    <div
                        ref={listRef}
                        className="flex-1 space-y-3 overflow-y-auto bg-[#fcfaf6] px-3 py-3 sm:space-y-4 sm:px-4 sm:py-4"
                    >
                        {messages.map((message) => (
                            <div key={message.id}>
                                <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[88%] rounded-3xl px-3 py-2.5 text-sm leading-6 sm:max-w-[85%] sm:px-4 sm:py-3 ${message.role === 'user'
                                                ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--primary-foreground))]'
                                                : 'border border-[#e9dfd0] bg-white text-[#143047]'
                                            }`}
                                    >
                                        {message.content}
                                    </div>
                                </div>

                                {message.role === 'assistant' && Array.isArray(message.products) && message.products.length > 0 && (
                                    <div className="mt-3 space-y-3">
                                        {message.products.map((product) => (
                                            <ProductChatCard key={product.id} product={product} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="rounded-3xl border border-[#e9dfd0] bg-white px-3 py-2.5 text-sm text-[#143047] sm:px-4 sm:py-3">
                                    Escribiendo...
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-[hsl(var(--border))] bg-white px-3 py-3 sm:px-4 sm:py-4">
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Escribí tu consulta..."
                                className="min-w-0 flex-1 rounded-full border border-[#d8cdb8] bg-[#f8f3ea] px-4 py-3 text-sm text-[#143047] outline-none transition focus:border-[#5e89a6]"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#143047] text-white transition hover:bg-[#214a69] disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:w-12"
                                aria-label="Enviar mensaje"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </form>

                        <button
                            type="button"
                            onClick={openWhatsApp}
                            className="mt-3 w-full rounded-full border border-[#d8cdb8] px-4 py-3 text-sm font-medium text-[#143047] transition hover:bg-[#f8f3ea]"
                        >
                            Hablar por WhatsApp
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, MessageCircle, Send, X } from 'lucide-react'
import { siteConfig } from '@/lib/site'

const QUICK_QUESTIONS = [
    '¿Qué medios de pago aceptan?',
    '¿Hacen envíos a todo el país?',
    '¿Cuánto tarda la producción?',
    '¿Qué material usan?',
]

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            role: 'assistant',
            content:
                'Hola, soy el asistente de 3DLightLab. Puedo ayudarte con envíos, pagos, tiempos de producción, materiales y productos.',
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
                },
            ])
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content:
                        'Hubo un problema para responder ahora mismo. Podés escribirnos por WhatsApp y te ayudamos enseguida.',
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
                className="fixed bottom-24 right-5 z-[70] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--primary-foreground))] shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition hover:scale-105"
                aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat'}
            >
                {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
            </button>

            {isOpen && (
                <div className="fixed bottom-40 right-5 z-[70] flex h-[560px] w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden rounded-[28px] border border-[hsl(var(--border))] bg-white shadow-[0_24px_60px_rgba(20,48,71,0.16)]">
                    <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--foreground))] px-5 py-4 text-[hsl(var(--primary-foreground))]">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
                            <Bot className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Asistente 3DLightLab</p>
                            <p className="text-xs text-white/75">Consultas rápidas de compra y productos</p>
                        </div>
                    </div>

                    <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto bg-[#fcfaf6] px-4 py-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 ${message.role === 'user'
                                            ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--primary-foreground))]'
                                            : 'border border-[#e9dfd0] bg-white text-[#143047]'
                                        }`}
                                >
                                    {message.content}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="rounded-3xl border border-[#e9dfd0] bg-white px-4 py-3 text-sm text-[#143047]">
                                    Escribiendo...
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-[hsl(var(--border))] bg-white px-4 py-4">
                        <div className="mb-3 flex flex-wrap gap-2">
                            {QUICK_QUESTIONS.map((question) => (
                                <button
                                    key={question}
                                    type="button"
                                    onClick={() => sendMessage(question)}
                                    className="rounded-full border border-[#ddd2c2] bg-[#f8f3ea] px-3 py-2 text-xs text-[#143047] transition hover:bg-white"
                                >
                                    {question}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Escribí tu consulta..."
                                className="flex-1 rounded-full border border-[#d8cdb8] bg-[#f8f3ea] px-4 py-3 text-sm text-[#143047] outline-none transition focus:border-[#5e89a6]"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#143047] text-white transition hover:bg-[#214a69] disabled:cursor-not-allowed disabled:opacity-60"
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
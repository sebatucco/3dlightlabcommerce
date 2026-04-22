'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
    MessageCircle,
    LampFloor,
    Palette,
    Shield,
    Home,
    Send,
    MapPin,
    Phone,
    Mail,
} from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CartDrawer from '@/components/CartDrawer'
import WhatsAppButton from '@/components/WhatsAppButton'
import CatalogClient from '@/components/CatalogClient'
import { siteConfig } from '@/lib/site'
import ImageCarousel from '@/components/ImageCarousel'
import HeroBag3D from '@/components/HeroBag3D'
import ChatWidget from '@/components/ChatWidget'

const features = [
    {
        icon: LampFloor,
        title: 'Luz con intención',
        desc: 'Diseños pensados para vestir espacios y generar atmósferas cálidas.',
    },
    {
        icon: Palette,
        title: 'Estética contemporánea',
        desc: 'Formas nobles, texturas suaves y una presencia visual premium.',
    },
    {
        icon: Shield,
        title: 'Calidad cuidada',
        desc: 'Piezas preparadas para acompañar proyectos residenciales y comerciales.',
    },
    {
        icon: Home,
        title: 'Pensado para habitar',
        desc: 'Iluminación decorativa para livings, dormitorios, recepciones y estudios.',
    },
]

export default function HomePage() {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [form, setForm] = useState({ name: '', email: '', message: '' })

    useEffect(() => {
        let mounted = true

        async function loadStoreData() {
            try {
                const [productsResponse, categoriesResponse] = await Promise.all([
                    fetch('/api/products', { cache: 'no-store' }),
                    fetch('/api/categories', { cache: 'no-store' }),
                ])

                const productsData = await productsResponse.json()
                const categoriesData = await categoriesResponse.json()
                if (!mounted) return

                const items = Array.isArray(productsData?.products) ? productsData.products : []
                const categoryItems = Array.isArray(categoriesData)
                    ? categoriesData
                    : Array.isArray(categoriesData?.categories)
                        ? categoriesData.categories
                        : []

                setProducts(items)
                setCategories(categoryItems)
            } catch (error) {
                console.error('Error loading store data:', error)
            } finally {
                if (mounted) setLoading(false)
            }
        }

        loadStoreData()

        return () => {
            mounted = false
        }
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            setForm({ name: '', email: '', message: '' })
            alert('¡Mensaje enviado! Te contactaremos pronto.')
        } catch {
            alert('No se pudo enviar el mensaje, pero podés escribirnos por WhatsApp.')
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <CartDrawer />
            <WhatsAppButton />

            <section
                id="inicio"
                className="relative flex min-h-screen items-center overflow-hidden bg-[hsl(var(--bone))] pt-16"
            >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(213,167,98,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.6),transparent_24%)]" />

                <div className="container relative mx-auto grid items-center gap-12 px-4 lg:grid-cols-2">
                    <motion.div
                        initial={{ opacity: 0, x: -40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    >
                        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[hsl(var(--warm-gray-dark))]">
                            Diseño de iluminación premium
                        </p>

                        <h1 className="mt-4 text-5xl font-bold leading-tight text-foreground md:text-7xl">
                            Luz cálida para{' '}
                            <span className="text-[hsl(var(--warm-gray-dark))]">
                                espacios con carácter
                            </span>
                        </h1>

                        <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
                            3DLightLab Commerce reúne piezas decorativas, lámparas escultóricas y
                            soluciones de iluminación con una experiencia de compra clara y elegante.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-4">
                            <a
                                href="#catalogo"
                                className="inline-flex items-center rounded-full bg-[hsl(var(--primary))] px-8 py-3 text-sm font-medium tracking-wide text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90"
                            >
                                Ver colección
                            </a>

                            <a
                                href={`https://wa.me/${siteConfig.whatsappNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-8 py-3 text-sm font-medium tracking-wide text-foreground transition-colors hover:bg-accent"
                            >
                                <MessageCircle size={16} />
                                Pedir asesoramiento
                            </a>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                        className="flex justify-center"
                    >
                        <HeroBag3D />
                    </motion.div>
                </div>
            </section>

            <section className="bg-[hsl(var(--bone))] py-8 md:py-14">
                <ImageCarousel />
            </section>

            <section id="catalogo" className="bg-background py-24">
                <div className="container mx-auto px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mb-16 text-center"
                    >
                        <h2 className="text-4xl font-bold text-foreground md:text-5xl">
                            Colección destacada
                        </h2>
                        <p className="mx-auto mt-4 max-w-md text-lg text-muted-foreground">
                            Lámparas con materialidad cálida, presencia visual y detalles cuidados.
                        </p>
                    </motion.div>
                </div>

                <CatalogClient
                    products={products}
                    categories={categories}
                    loading={loading}
                />
            </section>

            <section id="nosotros" className="bg-[hsl(var(--bone))] py-24">
                <div className="container mx-auto px-4">
                    <div className="grid items-center gap-16 lg:grid-cols-2">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="overflow-hidden rounded-[30px] border border-[hsl(var(--border))] bg-white p-3 warm-shadow"
                        >
                            <img
                                src="/hero/lifestyle.jpg"
                                alt="Lámpara en ambiente cálido"
                                className="h-[400px] w-full rounded-[24px] object-cover lg:h-[500px]"
                            />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[hsl(var(--warm-gray-dark))]">
                                Nuestro enfoque
                            </p>

                            <h2 className="mt-4 text-4xl font-bold text-foreground md:text-5xl">
                                Más que una lámpara, una atmósfera
                            </h2>

                            <p className="mt-6 leading-relaxed text-muted-foreground">
                                En 3DLightLab Commerce entendemos la iluminación como parte esencial
                                del proyecto interior. Seleccionamos piezas que aportan textura,
                                escala y una luz confortable para habitar mejor cada ambiente.
                            </p>

                            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
                                {features.map((feature, index) => (
                                    <motion.div
                                        key={feature.title}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex gap-3"
                                    >
                                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent">
                                            <feature.icon size={18} className="text-foreground" />
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">
                                                {feature.title}
                                            </h3>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {feature.desc}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            <section id="contacto" className="bg-background py-24">
                <div className="container mx-auto px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mb-16 text-center"
                    >
                        <h2 className="text-4xl font-bold text-foreground md:text-5xl">
                            Contacto
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            ¿Estás armando un espacio o querés asesoramiento? Escribinos.
                        </p>
                    </motion.div>

                    <div className="mx-auto grid max-w-4xl gap-12 lg:grid-cols-2">
                        <motion.form
                            onSubmit={handleSubmit}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="space-y-5 rounded-[30px] border border-[hsl(var(--border))] bg-white p-8 warm-shadow"
                        >
                            <div>
                                <label className="mb-1.5 block text-sm text-muted-foreground">
                                    Nombre
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full rounded-2xl border border-border bg-[hsl(var(--surface))] px-4 py-3 text-sm text-card-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="Tu nombre"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm text-muted-foreground">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full rounded-2xl border border-border bg-[hsl(var(--surface))] px-4 py-3 text-sm text-card-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="tu@email.com"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm text-muted-foreground">
                                    Mensaje
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={form.message}
                                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                                    className="w-full resize-none rounded-2xl border border-border bg-[hsl(var(--surface))] px-4 py-3 text-sm text-card-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="Contanos qué ambiente querés resolver o qué pieza te interesa."
                                />
                            </div>

                            <button
                                type="submit"
                                className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-8 py-3 text-sm font-medium tracking-wide text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90"
                            >
                                <Send size={14} />
                                Enviar consulta
                            </button>
                        </motion.form>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="rounded-[30px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-8"
                        >
                            <h3 className="text-2xl font-bold text-foreground">
                                Hablemos de tu proyecto
                            </h3>

                            <p className="mt-4 leading-relaxed text-muted-foreground">
                                Podemos ayudarte a elegir la pieza adecuada para un ambiente puntual,
                                una renovación completa o una propuesta comercial.
                            </p>

                            <div className="mt-8 space-y-5">
                                {[
                                    [MapPin, siteConfig.location],
                                    [Phone, siteConfig.whatsappNumber],
                                    [Mail, siteConfig.email],
                                ].map(([Icon, value]) => (
                                    <div key={value} className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                                            <Icon className="h-4 w-4 text-[hsl(var(--foreground))]" />
                                        </div>
                                        <p className="pt-2 text-sm text-muted-foreground">{value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-10 overflow-hidden rounded-[24px] border border-[hsl(var(--border))]">
                                <img
                                    src="/gallery/gallery-2.jpg"
                                    alt="Detalle de lámpara"
                                    className="h-56 w-full object-cover"
                                />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>
            <ChatWidget />
            <Footer />
        </div>
    )
}
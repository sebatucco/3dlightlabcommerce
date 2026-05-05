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
import { siteConfig, siteContent } from '@/lib/site'
import ImageCarousel from '@/components/ImageCarousel'
import HeroBag3D from '@/components/HeroBag3D'
import ChatWidget from '@/components/ChatWidget'

const featureIcons = [LampFloor, Palette, Shield, Home]

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
                            {siteContent.hero.eyebrow}
                        </p>

                        <h1 className="mt-4 text-5xl font-bold leading-tight text-foreground md:text-7xl">
                            {siteContent.hero.titlePrefix}{' '}
                            <span className="text-[hsl(var(--warm-gray-dark))]">
                                {siteContent.hero.titleHighlight}
                            </span>
                        </h1>

                        <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
                            {siteContent.hero.description}
                        </p>

                        <div className="mt-8 flex flex-wrap gap-4">
                            <a
                                href="#catalogo"
                                className="inline-flex items-center rounded-full bg-[hsl(var(--primary))] px-8 py-3 text-sm font-medium tracking-wide text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90"
                            >
                                {siteContent.hero.ctas.collection}
                            </a>

                            <a
                                href={`https://wa.me/${siteConfig.whatsappNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-8 py-3 text-sm font-medium tracking-wide text-foreground transition-colors hover:bg-accent"
                            >
                                <MessageCircle size={16} />
                                {siteContent.hero.ctas.advice}
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
                        <h2 className="text-4xl font-bold text-foreground md:text-5xl">{siteContent.catalog.title}</h2>
                        <p className="mx-auto mt-4 max-w-md text-lg text-muted-foreground">
                            {siteContent.catalog.description}
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
                                {siteContent.about.eyebrow}
                            </p>

                            <h2 className="mt-4 text-4xl font-bold text-foreground md:text-5xl">{siteContent.about.title}</h2>

                            <p className="mt-6 leading-relaxed text-muted-foreground">{siteContent.about.description}</p>

                            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
                                {siteContent.features.map((feature, index) => {
                                    const Icon = featureIcons[index] || LampFloor
                                    return (
                                    <motion.div
                                        key={feature.title}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex gap-3"
                                    >
                                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent">
                                            <Icon size={18} className="text-foreground" />
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
                                    )
                                })}
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
                                    {siteContent.contact.form.nameLabel}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full rounded-2xl border border-border bg-[hsl(var(--surface))] px-4 py-3 text-sm text-card-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder={siteContent.contact.form.namePlaceholder}
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm text-muted-foreground">
                                    {siteContent.contact.form.emailLabel}
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full rounded-2xl border border-border bg-[hsl(var(--surface))] px-4 py-3 text-sm text-card-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder={siteContent.contact.form.emailPlaceholder}
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm text-muted-foreground">
                                    {siteContent.contact.form.messageLabel}
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={form.message}
                                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                                    className="w-full resize-none rounded-2xl border border-border bg-[hsl(var(--surface))] px-4 py-3 text-sm text-card-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder={siteContent.contact.form.messagePlaceholder}
                                />
                            </div>

                            <button
                                type="submit"
                                className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-8 py-3 text-sm font-medium tracking-wide text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90"
                            >
                                <Send size={14} />
                                {siteContent.contact.form.submit}
                            </button>
                        </motion.form>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="rounded-[30px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-8"
                        >
                            <h3 className="text-2xl font-bold text-foreground">
                                {siteContent.contact.title}
                            </h3>

                            <p className="mt-4 leading-relaxed text-muted-foreground">
                                {siteContent.contact.description}
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

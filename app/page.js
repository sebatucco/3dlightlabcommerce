import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CatalogClient from '@/components/CatalogClient'
import CartDrawer from '@/components/CartDrawer'
import ChatWidget from '@/components/ChatWidget'
import WhatsAppButton from '@/components/WhatsAppButton'
import { benefits, faqs, fallbackProducts, siteConfig } from '@/lib/site'
import { createAdminClient } from '@/lib/supabase/server'

async function getStorefrontData() {
    try {
        const supabase = createAdminClient()

        const [{ data: categories }, { data: products }] = await Promise.all([
            supabase
                .from('categories')
                .select('id,name,slug,sort_order')
                .is('deleted_at', null)
                .eq('active', true)
                .order('sort_order', { ascending: true })
                .order('name', { ascending: true }),

            supabase
                .from('products')
                .select(`
          *,
          categories(id,name,slug),
          product_images(id,image_url,alt_text,sort_order,media_type,use_case,is_primary)
        `)
                .is('deleted_at', null)
                .eq('active', true)
                .order('featured', { ascending: false })
                .order('created_at', { ascending: false }),
        ])

        const normalizedProducts = Array.isArray(products)
            ? products.map((product) => ({
                ...product,
                category_data: product.categories || null,
                category: product.categories?.name || null,
                category_slug: product.categories?.slug || null,
            }))
            : []

        return {
            categories: Array.isArray(categories) ? categories : [],
            products: normalizedProducts.length > 0 ? normalizedProducts : fallbackProducts,
        }
    } catch {
        return {
            categories: [],
            products: fallbackProducts,
        }
    }
}

export default async function HomePage() {
    const { categories, products } = await getStorefrontData()
    const featuredProducts = products.filter((product) => product.featured).slice(0, 4)

    return (
        <main className="min-h-screen bg-[#f5efe3] text-[#143047]">
            <Header />
            <CartDrawer />
            <ChatWidget />
            <WhatsAppButton />

            <section
                id="inicio"
                className="relative overflow-hidden border-b border-[#e7dccd] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(245,239,227,1)_62%)] pt-32"
            >
                <div className="container mx-auto grid gap-10 px-4 pb-20 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                    <div>
                        <p className="inline-flex rounded-full border border-[#d8cdb8] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7b68]">
                            {siteConfig.brandName}
                        </p>

                        <h1 className="mt-6 max-w-3xl font-display text-5xl uppercase leading-[0.95] text-[#143047] sm:text-6xl lg:text-7xl">
                            Diseño, luz y carácter para espacios memorables.
                        </h1>

                        <p className="mt-6 max-w-2xl text-base leading-8 text-[#4e6475]">
                            {siteConfig.description}
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <a
                                href="#catalogo"
                                className="rounded-full bg-[#143047] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#214a69]"
                            >
                                Ver colección
                            </a>

                            <a
                                href="#contacto"
                                className="rounded-full border border-[#d8cdb8] bg-white px-6 py-3 text-sm font-semibold text-[#143047] transition hover:bg-[#f7f1e8]"
                            >
                                Contacto
                            </a>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {featuredProducts.slice(0, 4).map((product) => {
                            const image =
                                product?.product_images?.find((item) => item?.media_type === 'image')?.image_url ||
                                product?.image ||
                                '/products/lamp-aurora.jpg'

                            return (
                                <article
                                    key={product.id}
                                    className="overflow-hidden rounded-[28px] border border-[#e7dccd] bg-white shadow-sm"
                                >
                                    <div className="h-56 w-full overflow-hidden bg-[#f7f1e8]">
                                        <img
                                            src={image}
                                            alt={product.name}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <div className="p-5">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7b68]">
                                            {product?.categories?.name || product?.category || 'Colección'}
                                        </p>
                                        <h2 className="mt-2 text-lg font-bold text-[#143047]">{product.name}</h2>
                                        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
                                            {product.short_description || product.description}
                                        </p>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                </div>
            </section>

            <section id="catalogo" className="container mx-auto px-4 py-16">
                <div className="mb-8 max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7b68]">
                        Catálogo
                    </p>
                    <h2 className="mt-3 font-display text-4xl uppercase leading-none text-[#143047]">
                        Colección disponible
                    </h2>
                    <p className="mt-4 text-base leading-7 text-[#4e6475]">
                        Explorá la selección completa y filtrá por categoría.
                    </p>
                </div>

                <CatalogClient products={products} categories={categories} />
            </section>

            <section id="nosotros" className="border-y border-[#e7dccd] bg-white">
                <div className="container mx-auto px-4 py-16">
                    <div className="mb-10 max-w-2xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7b68]">
                            Estudio
                        </p>
                        <h2 className="mt-3 font-display text-4xl uppercase leading-none text-[#143047]">
                            Una base lista para crecer
                        </h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {benefits.map((benefit) => (
                            <article
                                key={benefit.title}
                                className="rounded-[28px] border border-[#e7dccd] bg-[#faf6ee] p-6"
                            >
                                <h3 className="text-lg font-bold text-[#143047]">{benefit.title}</h3>
                                <p className="mt-3 text-sm leading-7 text-[#4e6475]">{benefit.description}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4 py-16">
                <div className="mb-10 max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7b68]">
                        Preguntas frecuentes
                    </p>
                    <h2 className="mt-3 font-display text-4xl uppercase leading-none text-[#143047]">
                        Todo listo para vender
                    </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {faqs.map((faq) => (
                        <article
                            key={faq.question}
                            className="rounded-[28px] border border-[#e7dccd] bg-white p-6"
                        >
                            <h3 className="text-lg font-bold text-[#143047]">{faq.question}</h3>
                            <p className="mt-3 text-sm leading-7 text-[#4e6475]">{faq.answer}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section id="contacto" className="border-t border-[#e7dccd] bg-[#faf6ee]">
                <div className="container mx-auto px-4 py-16">
                    <div className="max-w-2xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7b68]">
                            Contacto
                        </p>
                        <h2 className="mt-3 font-display text-4xl uppercase leading-none text-[#143047]">
                            ¿Querés una cotización o un proyecto especial?
                        </h2>
                        <p className="mt-4 text-base leading-7 text-[#4e6475]">
                            Escribinos por WhatsApp o por email para compras, consultas o desarrollos a medida.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <a
                                href={`https://wa.me/${siteConfig.whatsappNumber}`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full bg-[#143047] px-6 py-3 text-sm font-semibold text-white"
                            >
                                WhatsApp
                            </a>

                            <a
                                href={`mailto:${siteConfig.email}`}
                                className="rounded-full border border-[#d8cdb8] bg-white px-6 py-3 text-sm font-semibold text-[#143047]"
                            >
                                {siteConfig.email}
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    )
}
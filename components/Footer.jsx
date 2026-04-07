import { siteConfig } from '@/lib/site'
import Logo from '@/components/Logo'

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-[hsl(var(--border))] bg-[hsl(var(--surface))] py-14 text-[hsl(var(--foreground))]">
      <div className="container mx-auto px-4">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              Lámparas y piezas de iluminación pensadas para crear ambientes cálidos, contemporáneos y memorables.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[hsl(var(--warm-gray-dark))]">Navegación</h4>
            <nav className="flex flex-col gap-2">
              {[
                ['Inicio', '#inicio'],
                ['Colección', '#catalogo'],
                ['Estudio', '#nosotros'],
                ['Contacto', '#contacto'],
              ].map(([label, href]) => (
                <a key={href} href={href} className="text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]">
                  {label}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[hsl(var(--warm-gray-dark))]">Contacto</h4>
            <p className="text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{siteConfig.location}</p>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{siteConfig.whatsappNumber}</p>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{siteConfig.email}</p>
          </div>
        </div>

        <div className="mt-12 border-t border-[hsl(var(--border))] pt-6 text-center">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">© {new Date().getFullYear()} {siteConfig.brandName}. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}

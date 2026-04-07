'use client'

export default function ProductCard({ product }) {
  return (
    <div className="h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[#e7dccd] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">

        {/* Imagen */}
        <div className="relative h-56 w-full overflow-hidden bg-[#f7f1e8]">
          <img
            src={product.image || '/placeholder.jpg'}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 hover:scale-105"
          />
        </div>

        {/* Contenido */}
        <div className="flex flex-1 flex-col p-5">

          {/* Título */}
          <h3 className="min-h-[56px] text-lg font-semibold leading-tight text-[#143047]">
            {product.name}
          </h3>

          {/* Descripción */}
          <p className="mt-2 line-clamp-2 min-h-[48px] text-sm leading-6 text-[#6b7280]">
            {product.description}
          </p>

          {/* Precio */}
          <div className="mt-4">
            <span className="text-xl font-bold text-[#b7793e]">
              ${product.price}
            </span>
          </div>

          {/* Botón */}
          <button className="mt-auto rounded-full bg-[#143047] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#214a69]">
            Ver producto
          </button>
        </div>
      </article>
    </div>
  )
}
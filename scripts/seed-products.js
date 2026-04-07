// Script para insertar productos iniciales en Supabase
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://cvtplxncaailyrldfdvt.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2dHBseG5jYWFpbHlybGRmZHZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk2MjIyMywiZXhwIjoyMDg5NTM4MjIzfQ.Cu457CN8k0_v4w1cxrY_yexdR4keLgdzu88fNDdwPUI'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const initialProducts = [
  {
    id: '1',
    name: 'Mate Imperial Cuero',
    description: 'Mate de calabaza forrado en cuero premium con virola de alpaca. Trabajo artesanal de primera calidad.',
    price: 18500,
    original_price: 22000,
    image: 'https://images.unsplash.com/photo-1585744259332-111384f5def9?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1585744259332-111384f5def9?w=600&q=80'],
    category: 'Mates de Cuero',
    stock: 8,
    featured: true,
    variants: ['Marrón', 'Negro', 'Natural'],
    specs: { altura: '12cm', material: 'Calabaza + Cuero', virola: 'Alpaca' },
    active: true
  },
  {
    id: '2',
    name: 'Mate Madera Algarrobo',
    description: 'Mate torneado en madera de algarrobo con vetas naturales únicas. Incluye bombilla de alpaca.',
    price: 12000,
    original_price: null,
    image: 'https://images.unsplash.com/photo-1687920492018-e21cad9023d9?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1687920492018-e21cad9023d9?w=600&q=80'],
    category: 'Mates de Madera',
    stock: 12,
    featured: true,
    variants: ['Claro', 'Oscuro', 'Natural'],
    specs: { altura: '10cm', material: 'Algarrobo', capacidad: '200ml' },
    active: true
  },
  {
    id: '3',
    name: 'Mate Calabaza Premium',
    description: 'Calabaza natural curada artesanalmente. El mate tradicional argentino por excelencia.',
    price: 8500,
    original_price: null,
    image: 'https://images.unsplash.com/photo-1675001077188-809370ce3279?w=600&q=80',
    images: ['https://images.unsplash.com/photo-1675001077188-809370ce3279?w=600&q=80'],
    category: 'Mates Calabaza',
    stock: 15,
    featured: false,
    variants: ['Chico', 'Mediano', 'Grande'],
    specs: { material: 'Calabaza natural', curado: 'Artesanal', origen: 'Argentina' },
    active: true
  },
  {
    id: '4',
    name: 'Mate Cerámica Artesanal',
    description: 'Mate de cerámica esmaltada con diseño minimalista. Conserva mejor la temperatura.',
    price: 14500,
    original_price: null,
    image: 'https://images.pexels.com/photos/29145615/pexels-photo-29145615.jpeg?w=600',
    images: ['https://images.pexels.com/photos/29145615/pexels-photo-29145615.jpeg?w=600'],
    category: 'Mates Cerámica',
    stock: 6,
    featured: true,
    variants: ['Blanco', 'Negro', 'Gris'],
    specs: { material: 'Cerámica esmaltada', capacidad: '250ml', apto: 'Lavavajillas' },
    active: true
  },
  {
    id: '5',
    name: 'Set Matero Completo',
    description: 'Kit completo: mate de cuero, bombilla de alpaca, termo y yerbera. Ideal para regalo.',
    price: 35000,
    original_price: 42000,
    image: 'https://images.pexels.com/photos/29145614/pexels-photo-29145614.jpeg?w=600',
    images: ['https://images.pexels.com/photos/29145614/pexels-photo-29145614.jpeg?w=600'],
    category: 'Sets Completos',
    stock: 4,
    featured: true,
    variants: ['Marrón', 'Negro'],
    specs: { incluye: 'Mate, bombilla, termo 1L, yerbera', material: 'Premium', packaging: 'Caja regalo' },
    active: true
  },
  {
    id: '6',
    name: 'Bombilla Alpaca Cincelada',
    description: 'Bombilla de alpaca con trabajo de cincelado a mano. Filtro desmontable para fácil limpieza.',
    price: 6500,
    original_price: null,
    image: 'https://images.pexels.com/photos/12851545/pexels-photo-12851545.jpeg?w=600',
    images: ['https://images.pexels.com/photos/12851545/pexels-photo-12851545.jpeg?w=600'],
    category: 'Bombillas',
    stock: 20,
    featured: false,
    variants: ['Recta', 'Curva', 'Pico loro'],
    specs: { material: 'Alpaca', largo: '19cm', filtro: 'Desmontable' },
    active: true
  }
]

async function seedProducts() {
  console.log('🧉 Insertando productos de mates...\n')

  for (const product of initialProducts) {
    const { data, error } = await supabase
      .from('products')
      .upsert(product, { onConflict: 'id' })
      .select()
    
    if (error) {
      console.log(`❌ Error con ${product.name}:`, error.message)
    } else {
      console.log(`✅ ${product.name} - $${product.price.toLocaleString()}`)
    }
  }

  // Verificar productos
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, name, price')
    .order('id')

  if (fetchError) {
    console.log('\n❌ Error al verificar:', fetchError.message)
  } else {
    console.log(`\n✅ Total de productos en Supabase: ${products.length}`)
  }
}

seedProducts().catch(console.error)

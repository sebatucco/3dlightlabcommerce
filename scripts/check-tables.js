// Script para crear las tablas en Supabase usando SQL
const https = require('https')

const SUPABASE_URL = 'https://cvtplxncaailyrldfdvt.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2dHBseG5jYWFpbHlybGRmZHZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk2MjIyMywiZXhwIjoyMDg5NTM4MjIzfQ.Cu457CN8k0_v4w1cxrY_yexdR4keLgdzu88fNDdwPUI'

const sql = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  original_price INTEGER,
  image TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  category TEXT,
  stock INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  variants JSONB DEFAULT '[]'::jsonb,
  specs JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  items JSONB NOT NULL,
  customer JSONB NOT NULL,
  shipping JSONB,
  total INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'mercadopago',
  payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  reason TEXT,
  product TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  image TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  role TEXT,
  content TEXT NOT NULL,
  avatar TEXT,
  rating INTEGER DEFAULT 5,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Banners table
CREATE TABLE IF NOT EXISTS banners (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  title TEXT,
  subtitle TEXT,
  image TEXT,
  link TEXT,
  "order" INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access on products
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (active = true);

-- Create policies for public read access on categories
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (active = true);

-- Create policies for public read access on testimonials
DROP POLICY IF EXISTS "Testimonials are viewable by everyone" ON testimonials;
CREATE POLICY "Testimonials are viewable by everyone" ON testimonials FOR SELECT USING (active = true);

-- Create policies for public read access on banners
DROP POLICY IF EXISTS "Banners are viewable by everyone" ON banners;
CREATE POLICY "Banners are viewable by everyone" ON banners FOR SELECT USING (active = true);

-- Allow inserts for contacts (public contact form)
DROP POLICY IF EXISTS "Anyone can submit a contact" ON contacts;
CREATE POLICY "Anyone can submit a contact" ON contacts FOR INSERT WITH CHECK (true);

-- Allow inserts for orders (public checkout)
DROP POLICY IF EXISTS "Anyone can create an order" ON orders;
CREATE POLICY "Anyone can create an order" ON orders FOR INSERT WITH CHECK (true);

-- Allow public to read their own orders by ID
DROP POLICY IF EXISTS "Orders are viewable by id" ON orders;
CREATE POLICY "Orders are viewable by id" ON orders FOR SELECT USING (true);
`

async function executeSQL() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`)
    
    // Try using the REST API to execute raw SQL
    const postData = JSON.stringify({ query: sql })
    
    const options = {
      hostname: 'cvtplxncaailyrldfdvt.supabase.co',
      path: '/rest/v1/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal'
      }
    }

    console.log('Ejecutando SQL en Supabase...')
    console.log('URL:', SUPABASE_URL)
    
    // Since we can't execute raw SQL via REST API, we need to create tables manually
    // or use the Supabase dashboard. Let's check if tables exist first.
    
    const checkOptions = {
      hostname: 'cvtplxncaailyrldfdvt.supabase.co',
      path: '/rest/v1/products?select=id&limit=1',
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    }

    const req = https.request(checkOptions, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        console.log('Status:', res.statusCode)
        console.log('Response:', data)
        resolve({ status: res.statusCode, data })
      })
    })

    req.on('error', reject)
    req.end()
  })
}

executeSQL()
  .then(result => {
    if (result.status === 200) {
      console.log('✅ La tabla products existe!')
    } else {
      console.log('⚠️ La tabla products no existe. Necesitas crearla en el dashboard de Supabase.')
      console.log('\n📋 SQL para crear las tablas:')
      console.log('=====================================')
      console.log(sql)
      console.log('=====================================')
      console.log('\n👉 Ve a: https://supabase.com/dashboard/project/cvtplxncaailyrldfdvt/sql')
      console.log('   y ejecuta el SQL de arriba.')
    }
  })
  .catch(console.error)

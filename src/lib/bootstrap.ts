import { pool } from "@/db";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS images (
  id text PRIMARY KEY,
  mime text NOT NULL,
  data text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  icon text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS products (
  id integer PRIMARY KEY,
  category_id text NOT NULL,
  image_id text,
  default_image_id text,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  delivery_ar text NOT NULL DEFAULT '',
  delivery_en text NOT NULL DEFAULT '',
  requires_player_id boolean NOT NULL DEFAULT false,
  hidden boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS packages (
  id serial PRIMARY KEY,
  product_id integer NOT NULL,
  code text NOT NULL,
  label_ar text NOT NULL,
  label_en text NOT NULL,
  price integer NOT NULL,
  old_price integer,
  image_id text,
  default_image_id text,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS packages_code_unique ON packages (code);
CREATE TABLE IF NOT EXISTS discount_codes (
  code text PRIMARY KEY,
  percent integer NOT NULL,
  category text,
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS offers (
  id serial PRIMARY KEY,
  title_ar text NOT NULL,
  title_en text NOT NULL,
  description_ar text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  image_id text,
  product_id integer NOT NULL,
  package_id integer NOT NULL,
  sale_price integer NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  name text NOT NULL,
  phone text UNIQUE,
  email text UNIQUE,
  password_hash text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY,
  user_id integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id serial PRIMARY KEY,
  number text NOT NULL UNIQUE,
  user_id integer,
  customer_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL DEFAULT '',
  payment_method text NOT NULL,
  locale text NOT NULL DEFAULT 'ar',
  discount_code text NOT NULL DEFAULT '',
  discount_percent integer NOT NULL DEFAULT 0,
  discount_amount integer NOT NULL DEFAULT 0,
  points_used integer NOT NULL DEFAULT 0,
  points_discount integer NOT NULL DEFAULT 0,
  points_awarded integer NOT NULL DEFAULT 0,
  subtotal integer NOT NULL,
  offer_discount integer NOT NULL DEFAULT 0,
  total integer NOT NULL,
  status text NOT NULL DEFAULT 'received',
  message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_items (
  id serial PRIMARY KEY,
  order_id integer NOT NULL,
  product_id integer NOT NULL,
  package_index integer NOT NULL,
  package_code text NOT NULL DEFAULT '',
  quantity integer NOT NULL,
  player_id text NOT NULL DEFAULT '',
  unit_price integer NOT NULL,
  catalog_price integer NOT NULL,
  label_ar text NOT NULL,
  label_en text NOT NULL,
  product_name_ar text NOT NULL,
  product_name_en text NOT NULL,
  image text NOT NULL DEFAULT '',
  offer_id integer
);
CREATE TABLE IF NOT EXISTS order_events (
  id serial PRIMARY KEY,
  order_id integer NOT NULL,
  status text NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS points_ledger (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  delta integer NOT NULL,
  reason text NOT NULL,
  order_number text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL
);
`;

let readyPromise: Promise<void> | null = null;

async function bootstrap() {
  await pool.query(SCHEMA_SQL);
  const { seedStore } = await import("@/lib/catalog");
  await seedStore();
}

export function ready() {
  if (!readyPromise) {
    readyPromise = bootstrap().catch((error) => {
      readyPromise = null;
      throw error;
    });
  }
  return readyPromise;
}

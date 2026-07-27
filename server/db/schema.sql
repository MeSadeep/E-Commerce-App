-- Run this once against your database to create the tables.
-- psql "$DATABASE_URL" -f db/schema.sql

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0), -- store money as integer cents, never floats
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true, -- soft-delete flag: see note below
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe to run even if the table already exists from before this column was added.
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Why soft-delete: order_items.product_id references products(id), and a
-- product that has ever actually been ordered CAN'T be hard-deleted without
-- either corrupting that order's history or requiring ON DELETE CASCADE
-- (which would silently erase what someone actually bought — worse). Instead,
-- "deleting" a product that has order history just hides it from the
-- storefront (is_active = false) while its row — and the order history that
-- points at it — stays intact. See routes/admin.js's DELETE handler.

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  auth0_user_id VARCHAR(255) NOT NULL,   -- Auth0 "sub" claim identifies the buyer, not a password we store
  stripe_session_id VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending -> paid -> fulfilled
  total_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL -- snapshot price at time of purchase
);

-- A fuller catalog so you can test the flow immediately
INSERT INTO products (name, description, price_cents, currency, image_url, stock)
VALUES
  ('Wireless Headphones', 'Over-ear, noise-cancelling, 30h battery', 8999, 'usd', 'https://picsum.photos/seed/headphones/600', 25),
  ('Mechanical Keyboard', 'Hot-swappable switches, RGB backlight', 12999, 'usd', 'https://picsum.photos/seed/keyboard/600', 15),
  ('Smart Water Bottle', 'Tracks hydration, glows as a reminder', 2999, 'usd', 'https://picsum.photos/seed/bottle/600', 50),
  ('Titanium Travel Mug', 'Vacuum insulated, holds heat for 12 hours', 4599, 'usd', 'https://picsum.photos/seed/mug/600', 40),
  ('Modular Desk Lamp', 'Adjustable arm, three color temperatures', 6499, 'usd', 'https://picsum.photos/seed/lamp/600', 20),
  ('Canvas Weekender Bag', 'Waxed canvas, full-grain leather straps', 14900, 'usd', 'https://picsum.photos/seed/bag/600', 12),
  ('Wireless Charging Stand', 'Angled for video calls, 15W fast charge', 3499, 'usd', 'https://picsum.photos/seed/charger/600', 35),
  ('Analog Wall Clock', 'Solid walnut frame, silent sweep movement', 5299, 'usd', 'https://picsum.photos/seed/clock/600', 18),
  ('Leather Passport Wallet', 'Full-grain leather, RFID-blocking', 3899, 'usd', 'https://picsum.photos/seed/wallet/600', 30),
  ('Precision Pour-Over Kit', 'Stainless dripper, gooseneck kettle', 7999, 'usd', 'https://picsum.photos/seed/kettle/600', 22)
ON CONFLICT DO NOTHING;


-- =====================================================================
-- LEAST-PRIVILEGE APP ROLE
-- =====================================================================
-- The Node app should NEVER connect as a Postgres superuser or table owner.
-- Row Level Security (below) is silently bypassed by superusers and by any
-- role with the BYPASSRLS attribute, no matter what the policies say.
-- Change the password below, then put THIS role's credentials in DATABASE_URL
-- (not the admin/owner credentials your hosting provider first gave you).
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'CHANGE_ME_TO_A_STRONG_PASSWORD'
      NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE ON products, orders, order_items TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;


-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================
-- Even if a bug in the API (or a future new route) forgot a WHERE clause,
-- Postgres itself will still refuse to return or modify another user's rows.
-- The app sets a per-request session variable (app.current_user_id) — see
-- server/config/db.js — and these policies check it on every query.

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;      -- applies even to the table owner

DROP POLICY IF EXISTS orders_owner_only ON orders;
CREATE POLICY orders_owner_only ON orders
  USING (
    auth0_user_id = current_setting('app.current_user_id', true)
    OR current_setting('app.is_service', true) = 'true'   -- trusted server-only paths (webhook)
  )
  WITH CHECK (
    auth0_user_id = current_setting('app.current_user_id', true)
    OR current_setting('app.is_service', true) = 'true'
  );

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_items_owner_only ON order_items;
CREATE POLICY order_items_owner_only ON order_items
  USING (
    order_id IN (SELECT id FROM orders WHERE auth0_user_id = current_setting('app.current_user_id', true))
    OR current_setting('app.is_service', true) = 'true'
  )
  WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE auth0_user_id = current_setting('app.current_user_id', true))
    OR current_setting('app.is_service', true) = 'true'
  );

-- Products are meant to be public (anyone can browse the catalog), but we
-- still enable RLS so only a trusted server-side path can ever write to it.
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_public_read ON products;
CREATE POLICY products_public_read ON products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS products_service_write ON products;
CREATE POLICY products_service_write ON products
  FOR INSERT WITH CHECK (current_setting('app.is_service', true) = 'true');

DROP POLICY IF EXISTS products_service_update ON products;
CREATE POLICY products_service_update ON products
  FOR UPDATE USING (current_setting('app.is_service', true) = 'true')
  WITH CHECK (current_setting('app.is_service', true) = 'true');

DROP POLICY IF EXISTS products_service_delete ON products;
CREATE POLICY products_service_delete ON products
  FOR DELETE USING (current_setting('app.is_service', true) = 'true');


-- =====================================================================
-- PRODUCT VARIANTS (size, color, material) — "Advanced Product Management"
-- =====================================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size VARCHAR(50),
  color VARCHAR(50),
  material VARCHAR(100),
  image_url TEXT,               -- kept for backward compatibility — first entry of image_urls below
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,  -- up to 4 photos for this specific color/size
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe to run even if the table already exists from before these columns were added.
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS image_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

GRANT SELECT, INSERT, UPDATE, DELETE ON product_variants TO app_user;

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_variants_public_read ON product_variants;
CREATE POLICY product_variants_public_read ON product_variants
  FOR SELECT USING (true);

DROP POLICY IF EXISTS product_variants_service_write ON product_variants;
CREATE POLICY product_variants_service_write ON product_variants
  FOR INSERT WITH CHECK (current_setting('app.is_service', true) = 'true');

DROP POLICY IF EXISTS product_variants_service_update ON product_variants;
CREATE POLICY product_variants_service_update ON product_variants
  FOR UPDATE USING (current_setting('app.is_service', true) = 'true')
  WITH CHECK (current_setting('app.is_service', true) = 'true');

DROP POLICY IF EXISTS product_variants_service_delete ON product_variants;
CREATE POLICY product_variants_service_delete ON product_variants
  FOR DELETE USING (current_setting('app.is_service', true) = 'true');


-- =====================================================================
-- SERVER-SIDE CARTS — needed for "Abandoned Cart Analysis"
-- =====================================================================
-- The frontend still uses localStorage for a snappy UI, but ALSO syncs the
-- cart here so we can detect abandonment (see routes/analytics.js). Without
-- this table, a cart that's never checked out leaves no trace on the server.
CREATE TABLE IF NOT EXISTS carts (
  id SERIAL PRIMARY KEY,
  auth0_user_id VARCHAR(255) NOT NULL UNIQUE,
  items JSONB NOT NULL DEFAULT '[]',
  checked_out BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON carts TO app_user;

ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS carts_owner_only ON carts;
CREATE POLICY carts_owner_only ON carts
  USING (
    auth0_user_id = current_setting('app.current_user_id', true)
    OR current_setting('app.is_service', true) = 'true'
  )
  WITH CHECK (
    auth0_user_id = current_setting('app.current_user_id', true)
    OR current_setting('app.is_service', true) = 'true'
  );


-- =====================================================================
-- ROLES (admin, inventory_manager, support, etc.)
-- =====================================================================
-- Roles are NOT stored in this database — they're managed entirely in the
-- Auth0 Dashboard (User Management -> Roles) and delivered inside each
-- user's JWT as a custom claim. See server/middleware/requireRole.js for
-- the one-time Auth0 setup this needs (an Action that copies roles into
-- the token). There is deliberately no "role" column here: the JWT, signed
-- by Auth0, is the single source of truth so the database can't drift out
-- of sync with who's actually an admin.

-- Re-grant sequence usage — product_variants/carts sequences were created
-- after the earlier blanket GRANT ran, so they need it repeated here.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- ============================================================
-- FLOORTYPE — SUPABASE DATABASE SCHEMA
-- ============================================================
-- Run this entire file in your Supabase SQL Editor.
-- Project: https://app.supabase.com → SQL Editor → New Query
-- Paste everything below and click Run.
-- ============================================================


-- ── EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- TABLE: clients
-- Created automatically when an order or quote is submitted.
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  company       TEXT,
  role          TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: orders  (Floor Plan Orders)
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ref           TEXT UNIQUE NOT NULL,           -- e.g. FT-841022
  client_id     UUID REFERENCES clients(id),
  client_name   TEXT NOT NULL,
  client_email  TEXT NOT NULL,
  client_company TEXT,

  -- Project details
  address       TEXT NOT NULL,
  property_type TEXT,
  floors        INTEGER NOT NULL DEFAULT 1,
  style         TEXT,
  notes         TEXT,

  -- Pricing
  addons        JSONB DEFAULT '{}',             -- { "Furnished Version": 79 }
  total         NUMERIC(10,2) NOT NULL,
  deposit       NUMERIC(10,2) NOT NULL,
  balance_due   NUMERIC(10,2) GENERATED ALWAYS AS (total - deposit) STORED,

  -- Status & workflow
  status        TEXT NOT NULL DEFAULT 'Received'
                  CHECK (status IN ('Received','In Progress','In Review','Complete','On Hold')),

  -- Payment
  stripe_payment_intent_id  TEXT,
  stripe_charge_id          TEXT,
  payment_status            TEXT DEFAULT 'deposit_paid',

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: order_files
-- Files uploaded by client at order time.
-- Stored in Supabase Storage bucket: "order-files"
-- ============================================================
CREATE TABLE IF NOT EXISTS order_files (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  storage_path  TEXT NOT NULL,                  -- bucket path for signed URL
  file_size     BIGINT,
  mime_type     TEXT,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: revision_rounds
-- Each draft delivered to client for a floor plan order.
-- ============================================================
CREATE TABLE IF NOT EXISTS revision_rounds (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  round_number  INTEGER NOT NULL DEFAULT 1,
  status        TEXT NOT NULL DEFAULT 'Pending'
                  CHECK (status IN ('Pending','Revised','Approved')),
  delivered_at  TIMESTAMPTZ,
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: revision_files
-- Files attached to a specific revision round (draft deliverables).
-- ============================================================
CREATE TABLE IF NOT EXISTS revision_files (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id      UUID NOT NULL REFERENCES revision_rounds(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  file_size     BIGINT,
  mime_type     TEXT,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: revision_notes
-- Threaded notes between client and team on a revision round.
-- ============================================================
CREATE TABLE IF NOT EXISTS revision_notes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id      UUID NOT NULL REFERENCES revision_rounds(id) ON DELETE CASCADE,
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  author_type   TEXT NOT NULL CHECK (author_type IN ('client','team')),
  author_name   TEXT NOT NULL,
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: quotes  (3D Rendering Quote Requests)
-- ============================================================
CREATE TABLE IF NOT EXISTS quotes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ref             TEXT UNIQUE NOT NULL,          -- e.g. QT-293847
  client_id       UUID REFERENCES clients(id),
  client_name     TEXT NOT NULL,
  client_email    TEXT NOT NULL,
  client_company  TEXT,
  client_role     TEXT,

  -- Project scope
  project_name    TEXT NOT NULL,
  project_type    TEXT,
  city            TEXT,
  country         TEXT,
  phases          INTEGER DEFAULT 1,
  phase_details   JSONB DEFAULT '[]',            -- array of phase objects
  description     TEXT,

  -- Rendering spec
  renders         JSONB DEFAULT '{}',            -- { interior: { views: 4 }, ... }
  complexity      TEXT CHECK (complexity IN ('standard','premium','luxury')),
  sqft            INTEGER,

  -- Deliverables & timeline
  deliverables    JSONB DEFAULT '[]',            -- ['still','print','web',...]
  timeline        TEXT CHECK (timeline IN ('standard','expedited','urgent')),
  target_date     DATE,
  deadline_reason TEXT,
  deliverable_notes TEXT,

  -- Reference materials
  total_files     INTEGER DEFAULT 0,
  shared_link     TEXT,

  -- Pricing
  estimate_low    NUMERIC(10,2),                 -- client-facing ballpark
  estimate_high   NUMERIC(10,2),
  confirmed_low   NUMERIC(10,2),                 -- your confirmed quote
  confirmed_high  NUMERIC(10,2),
  quoted_at       TIMESTAMPTZ,

  -- Status
  status          TEXT NOT NULL DEFAULT 'Received'
                    CHECK (status IN ('Received','Quoted','Approved','On Hold','Declined')),
  converted_order_id UUID REFERENCES orders(id), -- set when quote → order

  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: quote_files
-- Reference material files uploaded with quote request.
-- Stored in Supabase Storage bucket: "quote-files"
-- ============================================================
CREATE TABLE IF NOT EXISTS quote_files (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id      UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  section       TEXT NOT NULL,                  -- 'arch','ffe','landscape','rcp','materials','furniture','inspiration','other'
  filename      TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  file_size     BIGINT,
  mime_type     TEXT,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- UPDATED_AT TRIGGERS
-- Automatically update updated_at on row change.
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_client_email ON orders(client_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at   ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_status        ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_client_email  ON quotes(client_email);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at    ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revision_notes_order ON revision_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_revision_notes_round ON revision_notes(round_id);
CREATE INDEX IF NOT EXISTS idx_order_files_order    ON order_files(order_id);
CREATE INDEX IF NOT EXISTS idx_quote_files_quote    ON quote_files(quote_id);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Clients can only see their own data.
-- Admins (service role) can see everything.
-- ============================================================
ALTER TABLE clients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_files     ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_files  ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_notes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_files     ENABLE ROW LEVEL SECURITY;


-- Clients: read own row only
CREATE POLICY "clients_read_own" ON clients
  FOR SELECT USING (email = auth.email());

CREATE POLICY "clients_insert_own" ON clients
  FOR INSERT WITH CHECK (email = auth.email());

-- Orders: client reads own orders by email
CREATE POLICY "orders_read_own" ON orders
  FOR SELECT USING (client_email = auth.email());

-- Order files: client reads own
CREATE POLICY "order_files_read_own" ON order_files
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE client_email = auth.email())
  );

-- Revision rounds: client reads own
CREATE POLICY "revision_rounds_read_own" ON revision_rounds
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE client_email = auth.email())
  );

-- Revision files: client reads own
CREATE POLICY "revision_files_read_own" ON revision_files
  FOR SELECT USING (
    round_id IN (
      SELECT rr.id FROM revision_rounds rr
      JOIN orders o ON o.id = rr.order_id
      WHERE o.client_email = auth.email()
    )
  );

-- Revision notes: client reads own + can insert
CREATE POLICY "revision_notes_read_own" ON revision_notes
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE client_email = auth.email())
  );

CREATE POLICY "revision_notes_insert_own" ON revision_notes
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE client_email = auth.email())
    AND author_type = 'client'
  );

-- Quotes: client reads own
CREATE POLICY "quotes_read_own" ON quotes
  FOR SELECT USING (client_email = auth.email());

-- Quote files: client reads own
CREATE POLICY "quote_files_read_own" ON quote_files
  FOR SELECT USING (
    quote_id IN (SELECT id FROM quotes WHERE client_email = auth.email())
  );


-- ============================================================
-- STORAGE BUCKETS
-- Run these in the Supabase dashboard:
-- Storage → New Bucket
-- Or use the SQL below (requires storage extension).
-- ============================================================

-- Bucket: order-files  (client floor plan uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-files', 'order-files', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket: quote-files  (reference material uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-files', 'quote-files', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket: deliverables  (drafts you send to clients)
INSERT INTO storage.buckets (id, name, public)
VALUES ('deliverables', 'deliverables', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: clients can read files from their own orders/quotes
CREATE POLICY "order_files_client_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'order-files'
    AND (storage.foldername(name))[1] IN (
      SELECT ref FROM orders WHERE client_email = auth.email()
    )
  );

CREATE POLICY "deliverables_client_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'deliverables'
    AND (storage.foldername(name))[1] IN (
      SELECT ref FROM orders WHERE client_email = auth.email()
    )
  );


-- ============================================================
-- SEED DATA (optional — mirrors demo data in the dashboard)
-- Comment out if you don't want demo records.
-- ============================================================

/*
INSERT INTO clients (email, name, company, role) VALUES
  ('sarah.m@meridianre.com',  'Sarah Mitchell',  'Meridian Real Estate', 'Project Manager'),
  ('j.thornton@studiov.co.uk','James Thornton',  'Studio Volta',         'Architect'),
  ('priya@kesslergroup.com',  'Priya Kessler',   'Kessler Group',        'Developer / Owner'),
  ('mobrien@obarchitects.com',"Michael O'Brien", "O'Brien Architects",   'Architect')
ON CONFLICT (email) DO NOTHING;

INSERT INTO orders (ref, client_name, client_email, client_company, address, floors, style, addons, total, deposit, status) VALUES
  ('FT-841022','Sarah Mitchell',  'sarah.m@meridianre.com',  'Meridian Real Estate','220 Riverside Drive, New York, NY 10025', 2,'Modern',   '{"Furnished Version":79,"Rush Delivery":99}', 476.00,238.00,'In Review'),
  ('FT-392874','James Thornton',  'j.thornton@studiov.co.uk','Studio Volta',         '14 Kings Road, London, SW3 4PX',          1,'Luxury',   '{"B&W Version":39}',                         188.00, 94.00,'Complete'),
  ('FT-774531','Priya Kessler',   'priya@kesslergroup.com',  'Kessler Group',        '48 Elm Street, Austin, TX 78701',          3,'Scandinavian','{}',                                    447.00,223.50,'In Progress'),
  ('FT-203984','Michael O\'Brien','mobrien@obarchitects.com',"O'Brien Architects",   '7 Orchard Lane, Chicago, IL 60601',        1,'Traditional','{"Extra View":49}',                       198.00, 99.00,'Received');

INSERT INTO quotes (ref, client_name, client_email, client_company, client_role, project_name, project_type, city, phases, renders, complexity, timeline, estimate_low, estimate_high, status) VALUES
  ('QT-293847','Priya Kessler',   'priya@kesslergroup.com',  'Kessler Development', 'Developer / Owner','The Meridian Tower', 'Multifamily Residential','Austin, TX',  2,'{"interior":{"views":6},"exterior":{"views":3},"aerial":{"views":2}}','premium',  'standard',  7200,11000,'Received'),
  ('QT-847291','Elena Vasquez',   'evasquez@pacificprops.com','Pacific Properties', 'Project Manager',  'Harbor Walk Phase 2','Mixed-Use Development',  'Miami, FL',   3,'{"exterior":{"views":4},"aerial":{"views":2},"flythrough":{"views":1}}','luxury',  'expedited', 14000,20000,'Quoted'),
  ('QT-556128','Michael O\'Brien','mobrien@obarchitects.com',"O'Brien Architects",  'Architect',        'Elm Street Residences','Single Family Residential','Chicago, IL',1,'{"interior":{"views":4},"exterior":{"views":2}}',                    'standard', 'standard', 2400, 3600,'Approved');
*/


-- ============================================================
-- DONE.
-- Your schema is ready. Next steps:
-- 1. Copy your Supabase URL + anon key into .env.local
-- 2. Create storage buckets (they're in this file above)
-- 3. Enable Email auth in Authentication → Providers
-- 4. Wire up the JS files (see supabase-client.js)
-- ============================================================

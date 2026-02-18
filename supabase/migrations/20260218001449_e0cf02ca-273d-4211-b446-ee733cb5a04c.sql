
-- MERCHANTS (linked to auth.users)
CREATE TABLE public.merchants (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  store_name text NOT NULL DEFAULT '',
  store_slug text UNIQUE,
  store_description text DEFAULT '',
  store_tagline text DEFAULT '',
  store_category text CHECK (store_category IN ('fashion', 'beauty', 'supplements', 'home', 'general')),
  brand_config jsonb DEFAULT '{}',
  stripe_connected_account_id text,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own record" ON public.merchants FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Merchants can update own record" ON public.merchants FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Merchants can insert own record" ON public.merchants FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Public can read merchant by slug" ON public.merchants FOR SELECT USING (store_slug IS NOT NULL AND onboarding_completed = true);

-- Auto-create merchant on signup
CREATE OR REPLACE FUNCTION public.handle_new_merchant()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.merchants (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_merchant();

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  price numeric NOT NULL CHECK (price >= 0),
  compare_at_price numeric CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  images text[] DEFAULT '{}',
  category text DEFAULT '',
  tags text[] DEFAULT '{}',
  status text DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived')),
  grid_position jsonb DEFAULT '{"x": 0, "y": 0}',
  pinned boolean DEFAULT false,
  seo_title text,
  seo_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can CRUD own products" ON public.products FOR ALL USING (auth.uid() = merchant_id);
CREATE POLICY "Public can read active products" ON public.products FOR SELECT USING (status = 'active');

-- PRODUCT VARIANTS
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  sku text,
  price numeric,
  inventory_count integer DEFAULT 0 CHECK (inventory_count >= 0),
  options jsonb DEFAULT '{}',
  images text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can CRUD own variants" ON public.product_variants FOR ALL
  USING (EXISTS (SELECT 1 FROM public.products WHERE products.id = product_variants.product_id AND products.merchant_id = auth.uid()));
CREATE POLICY "Public can read variants of active products" ON public.product_variants FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.products WHERE products.id = product_variants.product_id AND products.status = 'active'));

-- HOTZONES
CREATE TABLE public.hotzones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  position jsonb NOT NULL DEFAULT '{"x": 0, "y": 0, "width": 400, "height": 400}',
  product_ids uuid[] DEFAULT '{}',
  style_config jsonb DEFAULT '{}',
  neighbors jsonb DEFAULT '{}',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.hotzones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can CRUD own hotzones" ON public.hotzones FOR ALL USING (auth.uid() = merchant_id);
CREATE POLICY "Public can read hotzones" ON public.hotzones FOR SELECT USING (true);

-- EDITORIAL TILES
CREATE TABLE public.editorial_tiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  grid_position jsonb DEFAULT '{"x": 0, "y": 0}',
  grid_size jsonb DEFAULT '{"width": 2, "height": 2}',
  product_tags jsonb[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.editorial_tiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can CRUD own editorial tiles" ON public.editorial_tiles FOR ALL USING (auth.uid() = merchant_id);
CREATE POLICY "Public can read editorial tiles" ON public.editorial_tiles FOR SELECT USING (true);

-- ORDERS
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE NOT NULL,
  order_number text UNIQUE NOT NULL,
  customer_email text NOT NULL,
  customer_name text,
  shipping_address jsonb,
  items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'shipped', 'delivered', 'cancelled')),
  stripe_payment_id text,
  tracking_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can CRUD own orders" ON public.orders FOR ALL USING (auth.uid() = merchant_id);

-- EVENTS (analytics)
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  session_id text NOT NULL,
  event_type text NOT NULL,
  product_id uuid,
  hotzone_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_events_session ON public.events(merchant_id, session_id, created_at);
CREATE INDEX idx_events_type ON public.events(merchant_id, event_type, created_at);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert events" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Merchants can read own events" ON public.events FOR SELECT USING (auth.uid() = merchant_id);

-- STORE CONFIG
CREATE TABLE public.store_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE UNIQUE NOT NULL,
  ale_enabled boolean DEFAULT true,
  ale_intensity text DEFAULT 'medium' CHECK (ale_intensity IN ('low', 'medium', 'high')),
  low_stock_threshold integer DEFAULT 5,
  platform_fee_percent numeric DEFAULT 5.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can CRUD own config" ON public.store_config FOR ALL USING (auth.uid() = merchant_id);

-- FLOW EDITOR STATE
CREATE TABLE public.flow_editor_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE UNIQUE NOT NULL,
  nodes jsonb DEFAULT '[]',
  edges jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.flow_editor_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can CRUD own flow state" ON public.flow_editor_state FOR ALL USING (auth.uid() = merchant_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON public.merchants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_store_config_updated_at BEFORE UPDATE ON public.store_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.96.0";
import { AI_NOT_CONFIGURED, aiFailure, chatCompletions, readAiConfig } from "../_shared/ai.ts";
import { checkMessages, pickProductFields } from "../_shared/chat-guards.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_MESSAGES = 50;
const MAX_MESSAGE_CHARS = 10_000;
const MAX_CONVERSATION_CHARS = 120_000;
const MAX_TOKENS = 8_192;
const USER_LIMIT_PER_HOUR = 60;
const USER_LIMIT_PER_DAY = 300;

// ─── Embedded demo catalog & mock orders (mirrors client-side mock-orders.ts) ───
const DEMO_CATALOG = [
  { id: 'p1', title: 'Cloud Puffer Jacket', price: 420, compare_at_price: 520, category: 'outerwear', description: 'Oversized puffer with matte shell.' },
  { id: 'p2', title: 'Stealth Trench', price: 380, category: 'outerwear', description: 'Minimalist trench coat in water-resistant cotton.' },
  { id: 'p7', title: 'Wool Overcoat', price: 550, category: 'outerwear', description: 'Double-faced Italian wool.' },
  { id: 'p9', title: 'Leather Moto Jacket', price: 680, category: 'outerwear', description: 'Full-grain lambskin with asymmetric zip.' },
  { id: 'p3', title: 'Bomber Mk IV', price: 290, category: 'outerwear', description: 'Technical bomber with ribbed cuffs.' },
  { id: 'p8', title: 'Windbreaker Shell', price: 195, category: 'outerwear', description: 'Packable windbreaker.' },
  { id: 'p10', title: 'Track Jacket', price: 210, category: 'streetwear', description: 'Retro-inspired track jacket.' },
  { id: 'p19', title: 'Deconstructed Blazer', price: 340, category: 'new-arrivals', description: 'Unstructured blazer with raw edge details.' },
  { id: 'p4', title: 'Graphic Hoodie', price: 145, category: 'streetwear', description: 'Heavy fleece hoodie with screen-printed back graphic.' },
  { id: 'p13', title: 'Core Crewneck', price: 95, category: 'essentials', description: 'Mid-weight french terry crewneck.' },
  { id: 'p20', title: 'Knit Polo', price: 125, category: 'new-arrivals', description: 'Textured knit polo.' },
  { id: 'p18', title: 'Long Sleeve Base', price: 70, category: 'essentials', description: 'Fitted long sleeve in premium cotton.' },
  { id: 'p6', title: 'Oversized Tee', price: 65, category: 'streetwear', description: 'Heavyweight cotton. Dropped shoulder.' },
  { id: 'p15', title: 'Tank Top', price: 40, category: 'essentials', description: 'Ribbed cotton tank.' },
  { id: 'p12', title: 'Maroon Crop Top', price: 55, category: 'essentials', description: 'Fitted maroon crop top.' },
  { id: 'p5', title: 'Cargo Pants', price: 175, category: 'streetwear', description: 'Relaxed fit cargo with oversized pockets.' },
  { id: 'p16', title: 'Crème Joggers', price: 120, category: 'essentials', description: 'Heavyweight French terry joggers.' },
  { id: 'p25', title: 'Utility Pant', price: 165, category: 'streetwear', description: 'Slim tapered utility pant.' },
  { id: 'p11', title: 'Mesh Shorts', price: 85, category: 'streetwear', description: 'Double-layer mesh shorts.' },
  { id: 'p17', title: 'Sweat Shorts', price: 75, category: 'essentials', description: 'French terry shorts with raw hem.' },
];

const FIRST_NAMES = ['Alex','Jordan','Morgan','Taylor','Casey','Riley','Jamie','Quinn','Avery','Blake','Drew','Skyler','Reese','Parker','Hayden','Dakota','Emery','Sage','River','Rowan','Kai','Logan','Cameron','Finley','Elliot','Harper','Lennox','Nico','Wren','Jules'];
const LAST_NAMES = ['Chen','Williams','Martinez','Johnson','Lee','Patel','Kim','Garcia','Anderson','Taylor','Brown','Wilson','Thomas','Moore','Jackson','White','Harris','Clark','Lewis','Hall','Young','Walker','Allen','King','Scott','Green','Adams','Baker','Rivera','Hill'];
const STATUSES = ['pending','fulfilled','shipped','delivered','cancelled'];
const STATUS_WEIGHTS = [0.10, 0.15, 0.18, 0.52, 0.05];

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}
function pick<T>(arr: T[], rand: () => number): T { return arr[Math.floor(rand() * arr.length)]; }
function weightedPick(items: string[], weights: number[], rand: () => number): string {
  const r = rand(); let sum = 0;
  for (let i = 0; i < items.length; i++) { sum += weights[i]; if (r <= sum) return items[i]; }
  return items[items.length - 1];
}

interface MockOrder {
  id: string; order_number: string; customer_name: string; customer_email: string;
  items: { title: string; variant: string; qty: number; price: number; product_id: string }[];
  subtotal: number; total: number; status: string; created_at: string;
}

let _mockOrdersCache: MockOrder[] | null = null;
function generateMockOrders(): MockOrder[] {
  if (_mockOrdersCache) return _mockOrdersCache;
  const rand = seededRandom(77);
  const orders: MockOrder[] = [];
  const now = Date.now();
  const SIZES = ['XS','S','M','L','XL'];
  for (let i = 0; i < 100; i++) {
    const firstName = pick(FIRST_NAMES, rand);
    const lastName = pick(LAST_NAMES, rand);
    const numItems = rand() < 0.55 ? 1 : rand() < 0.80 ? 2 : 3;
    const items: MockOrder['items'] = [];
    const usedIds = new Set<string>();
    for (let j = 0; j < numItems; j++) {
      let prod = pick(DEMO_CATALOG, rand);
      let attempts = 0;
      while (usedIds.has(prod.id) && attempts < 10) { prod = pick(DEMO_CATALOG, rand); attempts++; }
      usedIds.add(prod.id);
      items.push({ title: prod.title, variant: pick(SIZES, rand), qty: 1, price: prod.price, product_id: prod.id });
    }
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const status = weightedPick(STATUSES, STATUS_WEIGHTS, rand);
    const daysAgo = Math.floor(rand() * 120);
    const hoursAgo = Math.floor(rand() * 24);
    const createdAt = new Date(now - daysAgo * 86400000 - hoursAgo * 3600000).toISOString();
    orders.push({
      id: `mock-${String(i + 1).padStart(4, '0')}`,
      order_number: `CB-${String(1001 + i).padStart(4, '0')}`,
      customer_email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      customer_name: `${firstName} ${lastName}`,
      items, subtotal, total: subtotal, status, created_at: createdAt,
    });
  }
  orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  _mockOrdersCache = orders;
  return orders;
}

// Tool definitions for the AI agent
const tools = [
  {
    type: "function",
    function: {
      name: "query_products",
      description:
        "Search or list products in the merchant's store. Can filter by title, category, status, tags, or price range.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Search term for product title" },
          category: { type: "string", description: "Filter by category" },
          status: { type: "string", enum: ["active", "draft"], description: "Filter by status" },
          tag: { type: "string", description: "Filter by tag" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_product",
      description:
        "Update a product's fields. Returns a preview of changes. Requires confirmation from the merchant.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "UUID of the product to update" },
          updates: {
            type: "object",
            description: "Fields to update: title, description, price, compare_at_price, status, category, tags, pinned",
          },
        },
        required: ["product_id", "updates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_product",
      description: "Create a new product in the store. Returns a preview for confirmation.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          price: { type: "number" },
          compare_at_price: { type: "number" },
          category: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          status: { type: "string", enum: ["active", "draft"], description: "Default: draft" },
        },
        required: ["title", "price"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_orders",
      description: "Query orders with optional filters. Returns order summaries.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"] },
          limit: { type: "number", description: "Max results (default 20)" },
          date_from: { type: "string", description: "ISO date string for start range" },
          date_to: { type: "string", description: "ISO date string for end range" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_sales",
      description: "Analyze sales data: revenue, order count, top sellers, trends.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "this_week", "this_month", "last_30_days", "all_time"], description: "Time period for analysis" },
          metric: { type: "string", enum: ["revenue", "orders", "top_products", "summary"], description: "What to analyze" },
        },
        required: ["period"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_inventory",
      description: "Update inventory count for a product variant. Requires confirmation.",
      parameters: {
        type: "object",
        properties: {
          variant_id: { type: "string", description: "UUID of the variant" },
          inventory_count: { type: "number", description: "New inventory count" },
        },
        required: ["variant_id", "inventory_count"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_inventory",
      description: "Query inventory levels, optionally filtering by low stock.",
      parameters: {
        type: "object",
        properties: {
          low_stock_only: { type: "boolean", description: "Only show items below threshold" },
          product_id: { type: "string", description: "Filter variants for a specific product" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_hotzones",
      description: "List hotzones in the store.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_copy",
      description: "Generate product description or marketing copy. Returns generated text (does not save automatically).",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "Product to generate copy for" },
          style: { type: "string", enum: ["luxury", "casual", "technical", "playful", "minimal"], description: "Tone of the copy" },
          type: { type: "string", enum: ["description", "tagline", "seo_title", "seo_description"], description: "What to generate" },
        },
        required: ["product_id", "type"],
      },
    },
  },
];

// Execute tool calls against Supabase
async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  merchantId: string,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<unknown> {
  switch (toolName) {
    case "query_products": {
      let query = supabaseAdmin
        .from("products")
        .select("id, title, description, price, compare_at_price, category, tags, status, images, pinned, created_at")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false })
        .limit((args.limit as number) || 20);

      if (args.search) query = query.ilike("title", `%${args.search}%`);
      if (args.category) query = query.eq("category", args.category);
      if (args.status) query = query.eq("status", args.status);
      if (args.tag) query = query.contains("tags", [args.tag]);

      const { data, error } = await query;
      if (error) throw error;

      // Fall back to demo catalog if DB is empty
      if (!data || data.length === 0) {
        let demos = [...DEMO_CATALOG];
        if (args.search) demos = demos.filter(p => p.title.toLowerCase().includes((args.search as string).toLowerCase()));
        if (args.category) demos = demos.filter(p => p.category === args.category);
        const limited = demos.slice(0, (args.limit as number) || 20);
        return { products: limited.map(p => ({ ...p, status: 'active', tags: [], pinned: false })), count: limited.length, source: "demo" };
      }
      return { products: data, count: data?.length || 0 };
    }

    case "update_product": {
      // Return preview, don't execute yet — needs confirmation
      const { data: current } = await supabaseAdmin
        .from("products")
        .select("*")
        .eq("id", args.product_id)
        .eq("merchant_id", merchantId)
        .single();

      if (!current) throw new Error("Product not found");

      return {
        action: "update_product",
        requires_confirmation: true,
        product_id: args.product_id,
        current_values: Object.fromEntries(
          Object.keys(args.updates as object).map((k) => [k, current[k]])
        ),
        new_values: pickProductFields(args.updates),
        product_title: current.title,
      };
    }

    case "create_product": {
      return {
        action: "create_product",
        requires_confirmation: true,
        product: {
          title: args.title,
          description: args.description || "",
          price: args.price,
          compare_at_price: args.compare_at_price,
          category: args.category || "",
          tags: args.tags || [],
          status: args.status || "draft",
        },
      };
    }

    case "query_orders": {
      let query = supabaseAdmin
        .from("orders")
        .select("id, order_number, customer_name, customer_email, status, total, items, created_at")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false })
        .limit((args.limit as number) || 20);

      if (args.status) query = query.eq("status", args.status);
      if (args.date_from) query = query.gte("created_at", args.date_from);
      if (args.date_to) query = query.lte("created_at", args.date_to);

      const { data, error } = await query;
      if (error) throw error;

      // Fall back to mock orders if DB is empty
      if (!data || data.length === 0) {
        let mockOrders = generateMockOrders();
        if (args.status) mockOrders = mockOrders.filter(o => o.status === args.status);
        if (args.date_from) mockOrders = mockOrders.filter(o => o.created_at >= (args.date_from as string));
        if (args.date_to) mockOrders = mockOrders.filter(o => o.created_at <= (args.date_to as string));
        const limited = mockOrders.slice(0, (args.limit as number) || 20);
        return { orders: limited, count: limited.length, total_in_store: mockOrders.length, source: "demo" };
      }
      return { orders: data, count: data?.length || 0 };
    }

    case "analyze_sales": {
      const now = new Date();
      let dateFrom: Date;

      switch (args.period) {
        case "today":
          dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "this_week":
          dateFrom = new Date(now);
          dateFrom.setDate(now.getDate() - now.getDay());
          break;
        case "this_month":
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "last_30_days":
          dateFrom = new Date(now);
          dateFrom.setDate(now.getDate() - 30);
          break;
        default:
          dateFrom = new Date(0);
      }

      const { data: dbOrders, error } = await supabaseAdmin
        .from("orders")
        .select("total, items, created_at, status")
        .eq("merchant_id", merchantId)
        .gte("created_at", dateFrom.toISOString());

      if (error) throw error;

      // Use mock orders if DB is empty
      const useOrders = (dbOrders && dbOrders.length > 0)
        ? dbOrders.map(o => ({ total: Number(o.total), items: o.items, created_at: o.created_at, status: o.status }))
        : generateMockOrders()
            .filter(o => new Date(o.created_at).getTime() >= dateFrom.getTime())
            .map(o => ({ total: o.total, items: o.items, created_at: o.created_at, status: o.status }));

      const nonCancelled = useOrders.filter(o => o.status !== 'cancelled');
      const totalRevenue = nonCancelled.reduce((sum, o) => sum + o.total, 0);
      const orderCount = useOrders.length;

      // Top products
      const productSales: Record<string, { title: string; revenue: number; qty: number }> = {};
      for (const o of useOrders) {
        const orderItems = Array.isArray(o.items) ? o.items : [];
        for (const item of orderItems) {
          const pid = (item as any).product_id || (item as any).title;
          if (!productSales[pid]) productSales[pid] = { title: (item as any).title || pid, revenue: 0, qty: 0 };
          productSales[pid].revenue += (item as any).price * ((item as any).qty || 1);
          productSales[pid].qty += (item as any).qty || 1;
        }
      }
      const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      return {
        period: args.period,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        order_count: orderCount,
        average_order_value: orderCount > 0 ? Math.round((totalRevenue / nonCancelled.length) * 100) / 100 : 0,
        top_products: topProducts,
        source: (dbOrders && dbOrders.length > 0) ? "live" : "demo",
      };
    }

    case "update_inventory": {
      const { data: variant } = await supabaseAdmin
        .from("product_variants")
        .select("id, title, inventory_count, product_id, products(title, merchant_id)")
        .eq("id", args.variant_id)
        .single();

      if (!variant || (variant as any).products?.merchant_id !== merchantId) {
        throw new Error("Variant not found");
      }

      return {
        action: "update_inventory",
        requires_confirmation: true,
        variant_id: args.variant_id,
        variant_title: variant.title,
        product_title: (variant as any).products?.title,
        current_count: variant.inventory_count,
        new_count: args.inventory_count,
      };
    }

    case "query_inventory": {
      let query = supabaseAdmin
        .from("product_variants")
        .select("id, title, sku, inventory_count, product_id, products!inner(title)")
        .eq("products.merchant_id", merchantId);

      if (args.product_id) query = query.eq("product_id", args.product_id);

      const { data, error } = await query;
      if (error) throw error;

      let variants = data || [];
      if (args.low_stock_only) {
        variants = variants.filter((v) => (v.inventory_count || 0) < 5);
      }

      return { variants, count: variants.length };
    }

    case "query_hotzones": {
      const { data, error } = await supabaseAdmin
        .from("hotzones")
        .select("id, name, product_ids, sort_order, position, neighbors")
        .eq("merchant_id", merchantId)
        .order("sort_order");

      if (error) throw error;
      return { hotzones: data, count: data?.length || 0 };
    }

    case "generate_copy": {
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("*")
        .eq("id", args.product_id)
        .eq("merchant_id", merchantId)
        .single();

      if (!product) throw new Error("Product not found");

      return {
        action: "generate_copy",
        product_title: product.title,
        product_type: product.category,
        product_price: product.price,
        current_description: product.description,
        requested_type: args.type,
        requested_style: args.style || "casual",
        note: "Generate the requested copy based on this product info and return it to the merchant for review.",
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing");

    // Get merchant from auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Sign in to use the assistant." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use the apikey from the request header (sent by the client)
    const anonKey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!anonKey) throw new Error("No API key available");

    const supabaseUser = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sign in to use the assistant." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const merchantId = user.id;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get merchant context
    const { data: merchant } = await supabaseAdmin
      .from("merchants")
      .select("store_name, store_category, store_description, brand_config")
      .eq("id", merchantId)
      .single();

    const body = await req.json();
    const { confirm_action } = body;

    // Input validation
    let messages: { role: string; content: string }[] = [];
    if (confirm_action) {
      if (typeof confirm_action !== "object" || !confirm_action.action) {
        return new Response(
          JSON.stringify({ error: "Invalid confirm_action payload." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const checked = checkMessages(body.messages, {
        maxMessages: MAX_MESSAGES,
        maxContentChars: MAX_MESSAGE_CHARS,
        maxTotalChars: MAX_CONVERSATION_CHARS,
      });
      if (!checked.ok) {
        return new Response(
          JSON.stringify({ error: checked.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      messages = checked.messages;
    }

    // Handle action confirmation
    if (confirm_action) {
      const { action, ...actionArgs } = confirm_action;
      let result;

      if (action === "update_product") {
        const newValues = pickProductFields(actionArgs.new_values);
        if (Object.keys(newValues).length === 0 || typeof actionArgs.product_id !== "string") {
          return new Response(
            JSON.stringify({ error: "No valid product changes." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await supabaseAdmin
          .from("products")
          .update(newValues)
          .eq("id", actionArgs.product_id)
          .eq("merchant_id", merchantId);
        if (error) throw error;
        result = { success: true, message: `Updated "${actionArgs.product_title}" successfully.` };
      } else if (action === "create_product") {
        const product = pickProductFields(actionArgs.product);
        if (typeof product.title !== "string" || !product.title.trim()) {
          return new Response(
            JSON.stringify({ error: "A product needs a title." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await supabaseAdmin
          .from("products")
          .insert({ ...product, merchant_id: merchantId });
        if (error) throw error;
        result = { success: true, message: `Created "${product.title}" successfully.` };
      } else if (action === "update_inventory") {
        if (!Number.isInteger(actionArgs.new_count) || actionArgs.new_count < 0) {
          return new Response(
            JSON.stringify({ error: "Inventory count must be a whole number." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Re-verify merchant ownership before updating
        const { data: variant } = await supabaseAdmin
          .from("product_variants")
          .select("id, product_id, products!inner(merchant_id)")
          .eq("id", actionArgs.variant_id)
          .single();

        if (!variant || (variant as any).products?.merchant_id !== merchantId) {
          throw new Error("Unauthorized: variant not found or not owned by merchant");
        }

        const { error } = await supabaseAdmin
          .from("product_variants")
          .update({ inventory_count: actionArgs.new_count })
          .eq("id", actionArgs.variant_id);
        if (error) throw error;
        result = { success: true, message: `Updated inventory for "${actionArgs.variant_title}" to ${actionArgs.new_count} units.` };
      } else {
        return new Response(
          JSON.stringify({ error: "Unknown action." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Confirmed actions above don't use the model, so only chat needs a key.
    const ai = readAiConfig((name) => Deno.env.get(name));
    if (!ai) {
      return new Response(JSON.stringify(AI_NOT_CONFIGURED), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Per-user AI quota. Any failure here refuses the request: an open limiter
    // would leave the AI bill uncapped.
    const quotas: [string, number, number][] = [
      [`smart-chat:user-hour:${merchantId}`, USER_LIMIT_PER_HOUR, 3_600],
      [`smart-chat:user-day:${merchantId}`, USER_LIMIT_PER_DAY, 86_400],
    ];
    for (const [bucket, limit, windowSeconds] of quotas) {
      const { data: allowed, error: quotaError } = await supabaseAdmin.rpc("edge_rate_limit_hit", {
        p_bucket: bucket,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });
      if (quotaError) {
        console.error("Quota check failed:", quotaError);
        return new Response(JSON.stringify({ error: "The assistant is unavailable right now. Please try again later." }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!allowed) {
        return new Response(JSON.stringify({ error: "You've reached the assistant's usage limit. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Build system prompt
    const systemPrompt = `You are the Smart Chat AI assistant for "${merchant?.store_name || "this store"}", a ${merchant?.store_category || "retail"} store. You are an intelligent store manager that can read data, perform actions, and provide advice.

Store context:
- Store name: ${merchant?.store_name || "Not set"}
- Category: ${merchant?.store_category || "General"}
- Description: ${merchant?.store_description || "No description"}

Your capabilities:
1. **Read store data**: Query products, orders, inventory, hotzones
2. **Execute actions**: Create/update products, manage inventory, generate copy (always ask for confirmation before write actions)
3. **Analyze**: Sales trends, top products, inventory health
4. **Advise**: Pricing, product descriptions, merchandising strategy

Guidelines:
- Be concise and action-oriented. You're a smart manager, not a generic chatbot.
- When showing data, format it clearly using markdown tables or lists.
- For write actions, ALWAYS use the appropriate tool and present the preview to the merchant for confirmation.
- For analysis, use the analyze_sales and query tools to get real data before making claims.
- If asked about competitive pricing or trends, note that web search is coming soon, and provide advice based on general knowledge.
- Use currency formatting for prices (e.g., $45.00).
- Keep responses focused and practical.`;

    const aiResponse = await chatCompletions(ai, {
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      tools,
      max_tokens: MAX_TOKENS,
      stream: true,
    });

    if (!aiResponse.ok) {
      console.error("AI provider error:", aiResponse.status, await aiResponse.text());
      const failure = aiFailure(aiResponse.status);
      return new Response(JSON.stringify(failure.body), {
        status: failure.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // We need to handle tool calls non-streaming first
    // Read the full streamed response to check for tool calls
    const reader = aiResponse.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let toolCallsAccumulator: Record<number, { name: string; arguments: string }> = {};
    let finishReason = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const choice = parsed.choices?.[0];
          if (!choice) continue;

          if (choice.finish_reason) finishReason = choice.finish_reason;

          const delta = choice.delta;
          if (delta?.content) fullContent += delta.content;

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallsAccumulator[idx]) {
                toolCallsAccumulator[idx] = { name: "", arguments: "" };
              }
              if (tc.function?.name) toolCallsAccumulator[idx].name = tc.function.name;
              if (tc.function?.arguments) toolCallsAccumulator[idx].arguments += tc.function.arguments;
            }
          }
        } catch {
          // partial JSON, skip
        }
      }
    }

    // If there are tool calls, execute them and do a second pass
    const toolCallKeys = Object.keys(toolCallsAccumulator);
    if (toolCallKeys.length > 0 || finishReason === "tool_calls") {
      const toolResults = [];

      for (const idx of toolCallKeys) {
        const tc = toolCallsAccumulator[Number(idx)];
        try {
          const toolArgs = JSON.parse(tc.arguments);
          const result = await executeTool(tc.name, toolArgs, merchantId, supabaseAdmin);
          toolResults.push({
            role: "tool",
            tool_call_id: `call_${idx}`,
            content: JSON.stringify(result),
          });
        } catch (err) {
          toolResults.push({
            role: "tool",
            tool_call_id: `call_${idx}`,
            content: JSON.stringify({ error: err instanceof Error ? err.message : "Tool execution failed" }),
          });
        }
      }

      // Build tool_calls array for the assistant message
      const assistantToolCalls = toolCallKeys.map((idx) => ({
        id: `call_${idx}`,
        type: "function",
        function: {
          name: toolCallsAccumulator[Number(idx)].name,
          arguments: toolCallsAccumulator[Number(idx)].arguments,
        },
      }));

      // Second call with tool results — stream this one
      const secondResponse = await chatCompletions(ai, {
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
          {
            role: "assistant",
            content: fullContent || null,
            tool_calls: assistantToolCalls,
          },
          ...toolResults,
        ],
        tools,
        max_tokens: MAX_TOKENS,
        stream: true,
      });

      if (!secondResponse.ok) {
        console.error("AI second pass error:", secondResponse.status, await secondResponse.text());
        const failure = aiFailure(secondResponse.status);
        return new Response(JSON.stringify(failure.body), {
          status: failure.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Stream the second response back with tool call metadata
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      // Prepend tool call info as a special SSE event
      const toolMeta = toolCallKeys.map((idx) => {
        const tc = toolCallsAccumulator[Number(idx)];
        const resultObj = toolResults.find((r) => r.tool_call_id === `call_${idx}`);
        return {
          tool: tc.name,
          args: JSON.parse(tc.arguments),
          result: resultObj ? JSON.parse(resultObj.content) : null,
        };
      });

      (async () => {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ tool_calls: toolMeta })}\n\n`));

        const reader2 = secondResponse.body!.getReader();
        while (true) {
          const { done, value } = await reader2.read();
          if (done) break;
          await writer.write(value);
        }
        await writer.close();
      })();

      return new Response(readable, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls — re-stream the content we already read
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      // Send the content we already accumulated as SSE chunks
      if (fullContent) {
        const chunk = {
          choices: [{ delta: { content: fullContent }, finish_reason: null }],
        };
        await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      await writer.write(encoder.encode("data: [DONE]\n\n"));
      await writer.close();
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("smart-chat error:", e);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.96.0";
import { AI_NOT_CONFIGURED, aiFailure, chatCompletions, readAiConfig } from "../_shared/ai.ts";
import { checkMessages, clientIp } from "../_shared/chat-guards.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BODY_CHARS = 256_000;
const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_CONVERSATION_CHARS = 30_000;
const MAX_CATALOG_ITEMS = 200;
const MAX_CART_ITEMS = 50;
const MAX_TOKENS = 4_096;
const IP_LIMIT_PER_MINUTE = 20;
const IP_LIMIT_PER_DAY = 200;
// Client IPs can be forged if the platform header is ever missing, so this caps total spend.
const GLOBAL_LIMIT_PER_DAY = 2_000;
const DAY_SECONDS = 86_400;

interface CatalogItem {
  id: string;
  title: string;
  price: number;
  compare_at_price?: number;
  category: string;
  description: string;
  variants?: { title: string; inventory_count: number }[];
}

interface CartLine {
  productId: string;
  title: string;
  variantTitle: string;
  quantity: number;
  price: number;
}

interface Outfit {
  name: string;
  budget: number | null;
  items: { product_id: string; type: string }[];
  total?: number;
  remaining?: number;
}

type AiContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Tool definitions for structured output
const tools = [
  {
    type: "function",
    function: {
      name: "recommend_products",
      description:
        "Return product recommendations with reasoning. Use when suggesting pairings, alternatives, or answering 'what goes with' questions.",
      parameters: {
        type: "object",
        properties: {
          products: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_id: { type: "string", description: "The product ID from the catalog" },
                reason: { type: "string", description: "Brief reason for recommending (1 sentence)" },
              },
              required: ["product_id", "reason"],
            },
            description: "2-4 product recommendations",
          },
        },
        required: ["products"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "build_outfit",
      description:
        "Build a complete outfit/look from the catalog. Supports optional external anchor items (from uploaded photos) and budget constraints.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name for the outfit (e.g. 'Casual Streetwear')" },
          budget: { type: "number", description: "Budget limit if specified by shopper, or null" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_id: { type: "string", description: "Product ID from catalog. Use 'external' for the shopper's uploaded item." },
                type: { type: "string", enum: ["store", "external"], description: "Whether this is a store product or external (uploaded) item" },
                role: { type: "string", description: "Role: anchor, top, bottom, outerwear, footwear, accessory" },
                reason: { type: "string", description: "Why this piece works" },
                label: { type: "string", description: "For external items: label like 'Your jacket'" },
              },
              required: ["product_id", "type", "role", "reason"],
            },
          },
        },
        required: ["name", "items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "budget_rebuild",
      description:
        "Suggest cheaper alternatives for cart items to meet a budget. Use when shopper wants to rebuild cart cheaper or cut spending.",
      parameters: {
        type: "object",
        properties: {
          original_total: { type: "number", description: "Current cart total" },
          suggested_total: { type: "number", description: "New total after swaps" },
          savings: { type: "number", description: "Amount saved" },
          swaps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                original_product_id: { type: "string", description: "Product ID being replaced" },
                original_title: { type: "string" },
                original_price: { type: "number" },
                suggested_product_id: { type: "string", description: "Replacement product ID from catalog" },
                suggested_title: { type: "string" },
                suggested_price: { type: "number" },
                reason: { type: "string", description: "Why this swap works" },
              },
              required: ["original_product_id", "original_title", "original_price", "suggested_product_id", "suggested_title", "suggested_price", "reason"],
            },
          },
          kept: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_id: { type: "string" },
                title: { type: "string" },
                price: { type: "number" },
                note: { type: "string" },
              },
              required: ["product_id", "title", "price"],
            },
            description: "Items kept as-is (no swap needed)",
          },
        },
        required: ["original_total", "suggested_total", "savings", "swaps"],
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ai = readAiConfig((name) => Deno.env.get(name));
    if (!ai) return jsonResponse(AI_NOT_CONFIGURED, 503);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing");

    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_CHARS) {
      return jsonResponse({ error: "Request too large." }, 413);
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: "Invalid JSON." }, 400);
    }
    const { mode } = body;
    const catalog: CatalogItem[] = Array.isArray(body.catalog) ? body.catalog : [];
    const cart_items: CartLine[] = Array.isArray(body.cart_items) ? body.cart_items : [];

    if (catalog.length > MAX_CATALOG_ITEMS || cart_items.length > MAX_CART_ITEMS) {
      return jsonResponse({ error: "Request too large." }, 413);
    }

    const checked = checkMessages(body.messages, {
      maxMessages: MAX_MESSAGES,
      maxContentChars: MAX_MESSAGE_CHARS,
      maxTotalChars: MAX_CONVERSATION_CHARS,
      allowImagesFrom: SUPABASE_URL,
    });
    if (!checked.ok) {
      return jsonResponse({ error: checked.error }, 400);
    }
    const { messages } = checked;

    // Only valid requests reach the database. Any failure here refuses the
    // request: an open limiter would leave the AI bill uncapped.
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const ip = clientIp(req.headers);
    const limits: [string, number, number][] = [
      [`smartcart:ip-minute:${ip}`, IP_LIMIT_PER_MINUTE, 60],
      [`smartcart:ip-day:${ip}`, IP_LIMIT_PER_DAY, DAY_SECONDS],
      ["smartcart:global-day", GLOBAL_LIMIT_PER_DAY, DAY_SECONDS],
    ];
    for (const [bucket, limit, windowSeconds] of limits) {
      const { data: allowed, error: limitError } = await supabaseAdmin.rpc("edge_rate_limit_hit", {
        p_bucket: bucket,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });
      if (limitError) {
        console.error("Rate limit check failed:", limitError);
        return jsonResponse({ error: "Chat is unavailable right now. Please try again later." }, 503);
      }
      if (!allowed) {
        return jsonResponse({ error: "Rate limit exceeded. Please try again in a moment." }, 429);
      }
    }

    // Build catalog context string
    let catalogContext = "No catalog provided.";
    if (catalog.length > 0) {
      catalogContext = catalog
        .map(
          (p) =>
            `- ID: ${p.id} | "${p.title}" | $${p.price}${p.compare_at_price ? ` (was $${p.compare_at_price})` : ""} | Category: ${p.category} | ${p.description} | Variants: ${p.variants?.map((v) => `${v.title}${v.inventory_count <= 0 ? " (OUT OF STOCK)" : ""}`).join(", ") || "default"}`
        )
        .join("\n");
    }

    // Build cart context
    let cartContext = "Cart is empty.";
    if (cart_items.length > 0) {
      cartContext = cart_items
        .map((i) => `- ID: ${i.productId} | "${i.title}" (${i.variantTitle}) x${i.quantity} — $${i.price * i.quantity}`)
        .join("\n");
    }

    const systemPrompt = `You are the Style Assistant AI for Cart Blanche, a contemporary streetwear and essentials store. You help shoppers find products, build outfits, and answer questions about items. When referring to yourself, call yourself "Style Assistant AI".

You are a knowledgeable friend — helpful but never pushy or salesy. Think personal stylist, not commission-hungry salesperson.

## STORE CATALOG
${catalogContext}

## SHOPPER'S CURRENT CART
${cartContext}

## RULES
1. ONLY recommend products that exist in the catalog above. Never invent products.
2. ONLY recommend products that are in stock (variants with inventory_count > 0). If a great match is out of stock, mention it.
3. Never hallucinate product details. If info isn't in the description, say "That info isn't listed — you might want to ask the store."
4. Never discuss competitors, other stores, or external products.
5. Never share pricing strategy or internal data.
6. Keep responses concise and natural. 2-3 sentences for simple answers.
7. When recommending products, ALWAYS use the recommend_products, build_outfit, or budget_rebuild tool so the frontend can render product cards.
8. Consider price coherence when building outfits.
9. Consider aesthetic coherence.
10. Don't recommend items already in the shopper's cart.

## IMAGE ANALYSIS
When the shopper uploads an image, analyze it for: product type/category, colors, style/aesthetic, formality. Never identify or name brands. Use observations to find matching products in the catalog. When building outfits around an uploaded item, use type="external" with product_id="external" and provide a label like "Your jacket".

## BUDGET CONSTRAINTS
When the shopper mentions a budget:
- For "rebuild my cart cheaper" or "cut $X": Use the budget_rebuild tool. Find alternatives for each item that maintain the aesthetic but cost less. If impossible, say so and offer the closest option.
- For "build X items under $Y": Use build_outfit with the budget field set. Find the best combination under budget.
- For budget + image: Treat the uploaded item as free (they own it), build the rest under budget.
- Always be honest if the budget is impossible: "The cheapest combo I can find is $X — want me to show that?"

## PROACTIVE MODE
${mode === "proactive_add" ? "The shopper just added an item to cart. Suggest 2-3 complementary pieces that pair well with their latest addition. Be brief and natural." : ""}
${mode === "proactive_review" ? "The shopper is reviewing their cart with multiple items. If you see an opportunity to complete the look, suggest it briefly." : ""}
${mode === "proactive_remove" ? "The shopper just removed an item (possible price sensitivity). Suggest 1-2 similar alternatives at different price points. Be tactful." : ""}`;

    // Build messages with image support
    const aiMessages: { role: string; content: string | AiContentPart[] }[] = [{ role: "system", content: systemPrompt }];
    
    for (const msg of messages) {
      if (msg.image_url) {
        // Multimodal message with image; checkMessages limits these to user turns
        aiMessages.push({
          role: "user",
          content: [
            { type: "text", text: msg.content || "What do you see in this image?" },
            { type: "image_url", image_url: { url: msg.image_url } },
          ],
        });
      } else {
        aiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const aiResponse = await chatCompletions(ai, {
      messages: aiMessages,
      tools,
      max_tokens: MAX_TOKENS,
      stream: false,
    });

    if (!aiResponse.ok) {
      console.error("AI provider error:", aiResponse.status, await aiResponse.text());
      const failure = aiFailure(aiResponse.status);
      return jsonResponse(failure.body, failure.status);
    }

    const data = await aiResponse.json();
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error("No response from AI");
    }

    const message = choice.message;
    const textContent = message.content || "";
    let products: unknown[] | null = null;
    let outfit: Outfit | null = null;
    let budget_comparison: Record<string, unknown> | null = null;

    // Process tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const tc of message.tool_calls) {
        const args = typeof tc.function.arguments === "string"
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments;

        if (tc.function.name === "recommend_products") {
          products = args.products;
        } else if (tc.function.name === "build_outfit") {
          outfit = {
            name: args.name,
            budget: args.budget || null,
            items: args.items,
          };
        } else if (tc.function.name === "budget_rebuild") {
          budget_comparison = {
            original_total: args.original_total,
            suggested_total: args.suggested_total,
            savings: args.savings,
            swaps: args.swaps,
            kept: args.kept || [],
          };
        }
      }
    }

    // Calculate outfit total if present
    if (outfit) {
      let total = 0;
      for (const item of outfit.items) {
        if (item.type === "external") continue;
        const prod = catalog.find((p) => p.id === item.product_id);
        if (prod) total += prod.price;
      }
      outfit.total = total;
      if (outfit.budget) {
        outfit.remaining = outfit.budget - total;
      }
    }

    const result = {
      message: textContent,
      products,
      outfit,
      budget_comparison,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("smartcart-chat error:", e);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.96.0";
import { clientIp } from "../_shared/chat-guards.ts";
import { checkLimits } from "../_shared/limits.ts";
import { MAX_CHAT_IMAGE_BYTES, sniffImageType } from "../_shared/shopper-guards.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IP_LIMIT_PER_MINUTE = 5;
const IP_LIMIT_PER_DAY = 20;
const GLOBAL_LIMIT_PER_DAY = 200;
const DAY_SECONDS = 86_400;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Reads the body without holding more than the limit in memory. It keeps draining
// past the limit, because answering mid-upload makes the gateway hang the client.
async function readUpTo(req: Request, limit: number): Promise<Uint8Array | null> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  if (req.body) {
    for await (const chunk of req.body) {
      total += chunk.length;
      if (total <= limit) chunks.push(chunk);
    }
  }
  if (total > limit) return null;
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

// Stores a shopper's photo for the AI stylist. Visitors can't write to storage
// directly, so this is the only way in, and it picks the file name itself.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing");

    const bytes = await readUpTo(req, MAX_CHAT_IMAGE_BYTES);
    if (!bytes) {
      return jsonResponse({ error: "That image is over 5 MB." }, 413);
    }

    const image = sniffImageType(bytes);
    if (!image) {
      return jsonResponse({ error: "Please upload a JPEG, PNG, WebP or GIF." }, 415);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const ip = clientIp(req.headers);
    const limit = await checkLimits(supabaseAdmin, [
      [`chat-upload:ip-minute:${ip}`, IP_LIMIT_PER_MINUTE, 60],
      [`chat-upload:ip-day:${ip}`, IP_LIMIT_PER_DAY, DAY_SECONDS],
      ["chat-upload:global-day", GLOBAL_LIMIT_PER_DAY, DAY_SECONDS],
    ]);
    if (limit === "unavailable") {
      return jsonResponse({ error: "Uploads are unavailable right now. Please try again later." }, 503);
    }
    if (limit === "limited") {
      return jsonResponse({ error: "Too many uploads. Please wait a minute and try again." }, 429);
    }

    const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${image.extension}`;
    const { error } = await supabaseAdmin.storage
      .from("chat-uploads")
      .upload(path, bytes, { contentType: image.contentType });
    if (error) throw error;

    return jsonResponse({ path }, 200);
  } catch (e) {
    console.error("chat-upload error:", e);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }
});

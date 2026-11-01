import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.96.0";
import { clientIp } from "../_shared/chat-guards.ts";
import { checkLimits } from "../_shared/limits.ts";
import { checkSignup } from "../_shared/shopper-guards.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BODY_CHARS = 4_000;
const IP_LIMIT_PER_MINUTE = 5;
const IP_LIMIT_PER_DAY = 30;
const STORE_LIMIT_PER_DAY = 2_000;
const DAY_SECONDS = 86_400;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Shoppers have no account, so they can't write these rows directly. This takes
// their signup for a store, checks it, and limits how often anyone can send one.
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

    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_CHARS) {
      return jsonResponse({ error: "Request too large." }, 413);
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: "Invalid JSON." }, 400);
    }

    const checked = checkSignup(body);
    if (!checked.ok) {
      return jsonResponse({ error: checked.error }, 400);
    }
    const { kind, ...row } = checked.signup;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const ip = clientIp(req.headers);
    const limit = await checkLimits(supabaseAdmin, [
      [`signup:ip-minute:${ip}`, IP_LIMIT_PER_MINUTE, 60],
      [`signup:ip-day:${ip}`, IP_LIMIT_PER_DAY, DAY_SECONDS],
      [`signup:store-day:${row.merchant_id}`, STORE_LIMIT_PER_DAY, DAY_SECONDS],
    ]);
    if (limit === "unavailable") {
      return jsonResponse({ error: "Signups are unavailable right now. Please try again later." }, 503);
    }
    if (limit === "limited") {
      return jsonResponse({ error: "Too many tries. Please wait a minute and try again." }, 429);
    }

    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from("merchants")
      .select("id")
      .eq("id", row.merchant_id)
      .maybeSingle();
    if (merchantError) throw merchantError;
    if (!merchant) {
      return jsonResponse({ error: "Unknown store." }, 400);
    }

    const { error } = await supabaseAdmin
      .from(kind === "subscriber" ? "subscribers" : "waitlist_signups")
      .insert(row);

    // Already signed up looks the same as a new signup, so this can't be used to
    // find out who is on a store's lists.
    if (error && error.code !== "23505") throw error;

    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error("store-signup error:", e);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }
});

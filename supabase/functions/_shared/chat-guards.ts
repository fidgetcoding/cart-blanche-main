// Input checks shared by the chat edge functions. No Deno or network APIs here,
// so src/lib/__tests__/chat-guards.test.ts can exercise them under vitest.

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  image_url?: string;
}

export interface MessageLimits {
  maxMessages: number;
  maxContentChars: number;
  maxTotalChars: number;
  /** Only messages from the shopper chat may carry images. */
  allowImagesFrom?: string;
}

export type MessageCheck =
  | { ok: true; messages: ChatMessage[] }
  | { ok: false; error: string };

/** True only for public files on this project's own storage host. */
export function isProjectStorageUrl(url: unknown, projectUrl: string): boolean {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === new URL(projectUrl).hostname &&
      parsed.username === "" &&
      parsed.password === "" &&
      parsed.pathname.startsWith("/storage/v1/object/public/") &&
      !parsed.pathname.includes("..")
    );
  } catch {
    return false;
  }
}

/**
 * Rebuilds the message list from known fields only, so callers can't smuggle
 * system or tool roles, non-string content, or extra keys through to the model.
 */
export function checkMessages(input: unknown, limits: MessageLimits): MessageCheck {
  if (!Array.isArray(input) || input.length === 0 || input.length > limits.maxMessages) {
    return { ok: false, error: `Invalid messages: must be a non-empty array with at most ${limits.maxMessages} items.` };
  }

  const messages: ChatMessage[] = [];
  let totalChars = 0;

  for (const raw of input) {
    const msg = raw as Record<string, unknown> | null;
    if (msg?.role !== "user" && msg?.role !== "assistant") {
      return { ok: false, error: "Invalid message role." };
    }
    if (typeof msg.content !== "string") {
      return { ok: false, error: "Message content must be a string." };
    }
    if (msg.content.length > limits.maxContentChars) {
      return { ok: false, error: "Message content too long." };
    }
    totalChars += msg.content.length;
    if (totalChars > limits.maxTotalChars) {
      return { ok: false, error: "Conversation too long." };
    }

    const message: ChatMessage = { role: msg.role, content: msg.content };
    if (msg.image_url !== undefined && msg.image_url !== null) {
      const allowed = msg.role === "user" && limits.allowImagesFrom !== undefined &&
        isProjectStorageUrl(msg.image_url, limits.allowImagesFrom);
      if (!allowed) return { ok: false, error: "Invalid image URL." };
      message.image_url = msg.image_url as string;
    }
    messages.push(message);
  }

  return { ok: true, messages };
}

const isText = (v: unknown) => typeof v === "string";
const isPrice = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0;

const PRODUCT_FIELDS: Record<string, (v: unknown) => boolean> = {
  title: isText,
  description: isText,
  price: isPrice,
  compare_at_price: (v) => v === null || isPrice(v),
  status: isText,
  category: isText,
  tags: (v) => Array.isArray(v) && v.every(isText),
  pinned: (v) => typeof v === "boolean",
};

/** Keeps only the product fields the assistant may set; drops id, merchant_id and the rest. */
export function pickProductFields(input: unknown): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  if (typeof input !== "object" || input === null) return picked;
  for (const [field, isValid] of Object.entries(PRODUCT_FIELDS)) {
    const value = (input as Record<string, unknown>)[field];
    if (value !== undefined && isValid(value)) picked[field] = value;
  }
  return picked;
}

/**
 * The address Supabase's edge saw. x-forwarded-for's first entry is whatever the
 * client sent, so only its last entry, added by the nearest proxy, is used.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  return headers.get("cf-connecting-ip")?.trim() || headers.get("x-real-ip")?.trim() || forwarded || "unknown";
}

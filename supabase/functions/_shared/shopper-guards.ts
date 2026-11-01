// Input checks for the public shopper functions. No Deno or network APIs here,
// so src/lib/__tests__/shopper-guards.test.ts can exercise them under vitest.

export interface SubscriberSignup {
  kind: "subscriber";
  merchant_id: string;
  email: string;
}

export interface WaitlistSignup {
  kind: "waitlist";
  merchant_id: string;
  email: string;
  name: string;
  product_id: string;
  size_preference: string | null;
  colorway_preference: string | null;
}

export type SignupCheck =
  | { ok: true; signup: SubscriberSignup | WaitlistSignup }
  | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
};

/** Rebuilds a signup from known fields only, so callers can't set anything else. */
export function checkSignup(input: unknown): SignupCheck {
  const body = (input ?? {}) as Record<string, unknown>;
  if (typeof body.merchant_id !== "string" || !UUID.test(body.merchant_id)) {
    return { ok: false, error: "Unknown store." };
  }
  const email = text(body.email, 254)?.toLowerCase();
  if (!email || !EMAIL.test(email)) return { ok: false, error: "Please enter a valid email." };

  if (body.kind === "subscriber") {
    return { ok: true, signup: { kind: "subscriber", merchant_id: body.merchant_id, email } };
  }
  if (body.kind !== "waitlist") return { ok: false, error: "Unknown signup type." };

  const name = text(body.name, 120);
  const productId = text(body.product_id, 100);
  if (!name) return { ok: false, error: "Please enter your name." };
  if (!productId) return { ok: false, error: "Unknown product." };
  return {
    ok: true,
    signup: {
      kind: "waitlist",
      merchant_id: body.merchant_id,
      email,
      name,
      product_id: productId,
      size_preference: text(body.size_preference, 50),
      colorway_preference: text(body.colorway_preference, 100),
    },
  };
}

export const MAX_CHAT_IMAGE_BYTES = 5 * 1024 * 1024;

export interface ImageType {
  contentType: string;
  extension: string;
}

/** Identifies an image from its first bytes, since the Content-Type header is client-supplied. */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(1, 4) === "PNG") {
    return { contentType: "image/png", extension: "png" };
  }
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return { contentType: "image/webp", extension: "webp" };
  }
  if (bytes.length >= 6 && (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a")) {
    return { contentType: "image/gif", extension: "gif" };
  }
  return null;
}

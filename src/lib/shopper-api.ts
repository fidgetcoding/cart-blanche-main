import { isBackendConfigured } from '@/integrations/supabase/client';

export type StoreSignup =
  | { kind: 'subscriber'; merchant_id: string; email: string }
  | {
      kind: 'waitlist';
      merchant_id: string;
      email: string;
      name: string;
      product_id: string;
      size_preference?: string;
      colorway_preference?: string;
    };

function functionHeaders(contentType: string): Record<string, string> {
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return { 'Content-Type': contentType, apikey: key, Authorization: `Bearer ${key}` };
}

function functionUrl(name: string): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;
}

/** Sends a logged-out shopper's signup to the store's edge function. */
export async function submitStoreSignup(signup: StoreSignup): Promise<{ ok: boolean; error?: string }> {
  try {
    const resp = await fetch(functionUrl('store-signup'), {
      method: 'POST',
      headers: functionHeaders('application/json'),
      body: JSON.stringify(signup),
    });
    if (resp.ok) return { ok: true };
    const body = await resp.json().catch(() => ({}));
    return { ok: false, error: body.error };
  } catch (e) {
    console.error('Store signup failed:', e);
    return { ok: false };
  }
}

/**
 * Stores a photo for the AI stylist and returns its URL. Visitors can't write to
 * storage directly, so it goes through an edge function. With no backend the
 * stylist is off anyway, and the photo just stays in the browser.
 */
export async function uploadChatImage(file: File): Promise<string> {
  if (!isBackendConfigured) return URL.createObjectURL(file);

  const resp = await fetch(functionUrl('chat-upload'), {
    method: 'POST',
    headers: functionHeaders(file.type),
    body: file,
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok || !body.path) throw new Error(body.error || "That photo couldn't be uploaded.");
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/chat-uploads/${body.path}`;
}

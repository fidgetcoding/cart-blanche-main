const warmed = new Set<string>();

/** Starts downloading and decoding a photo before it's needed, such as a product the pointer is resting on. */
export function warmPhoto(src: string | undefined) {
  if (!src || warmed.has(src) || typeof Image === 'undefined') return;
  warmed.add(src);
  const img = new Image();
  img.src = src;
  img.decode?.().catch(() => {});
}

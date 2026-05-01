/**
 * Splits a product description into sentences so each sentence renders
 * on its own line. Splits on period followed by whitespace, while
 * preserving the trailing period on each sentence.
 */
export function splitSentences(text: string | null | undefined): string[] {
  if (!text) return [];
  // Match sentences ending with . ! or ? (keeps the punctuation),
  // falling back to the whole string when no terminator is present.
  const matches = text.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g);
  return (matches || [text]).map(s => s.trim()).filter(Boolean);
}

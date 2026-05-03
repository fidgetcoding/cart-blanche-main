import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ruler } from 'lucide-react';
import { useWaitlistSignup } from '@/hooks/use-waitlist-signup';
import { getSwatchStyle } from '@/lib/swatch-style';
import { SizeChartOverlay } from './SizeChartOverlay';
import type { DemoProduct } from '@/data/demo-data';

interface MaisonWaitlistModalProps {
  open: boolean;
  onClose: () => void;
  product: DemoProduct;
  /** When provided, modal opens with this size pre-filled and not editable. */
  lockedSize?: string;
}

/**
 * SL-branded waitlist popup. Editorial uppercase typography, sharp corners,
 * thin borders, button-style size + color preference selectors. Mirrors the
 * YZ modal flow but follows the Maison aesthetic.
 */
export function MaisonWaitlistModal({ open, onClose, product }: MaisonWaitlistModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const { submit, submitting } = useWaitlistSignup();

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setEmail(''); setName(''); setSize(''); setColor('');
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!email.trim() || !name.trim()) return;
    const res = await submit({
      productId: product.id,
      email,
      name,
      sizePreference: size,
      colorPreference: color,
    });
    if (res.ok) onClose();
  }

  return (
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-lg bg-background border border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-10 pt-8 pb-2">
              <div className="min-w-0">
                <p
                  className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Join the Waitlist
                </p>
                <h2
                  className="mt-2 tracking-[0.15em] uppercase text-foreground truncate"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'calc(var(--font-size-display) * 1.05)',
                  }}
                >
                  {product.title}
                </h2>
                <p
                  className="mt-1 text-foreground/60"
                  style={{
                    fontFamily: 'var(--font-numeral)',
                    fontSize: 'calc(var(--font-size-numeral) * 0.85)',
                  }}
                >
                  ${product.price}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-10 pb-10 pt-4 space-y-6">
              <p
                className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                We'll email you when this is back in stock
              </p>

              {/* Name */}
              <div>
                <label
                  className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border bg-transparent text-[12px] tracking-[0.05em] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
              </div>

              {/* Email */}
              <div>
                <label
                  className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border bg-transparent text-[12px] tracking-[0.05em] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
              </div>

              {/* Size — button style, matches detail-view selector */}
              {product.variants.length > 1 && (
                <div>
                  <label
                    className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Size Preference
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {product.variants.map(v => {
                      const active = size === v.title;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSize(active ? '' : v.title)}
                          className={`px-4 py-2 text-[10px] tracking-[0.15em] uppercase border transition-colors ${
                            active
                              ? 'bg-foreground text-background border-foreground'
                              : 'border-border text-foreground hover:border-foreground'
                          }`}
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          {v.title}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setSizeChartOpen(true)}
                      className="px-4 py-2 text-[10px] tracking-[0.15em] uppercase border border-border text-foreground/70 hover:border-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <Ruler className="w-3 h-3" />
                      Chart
                    </button>
                  </div>
                </div>
              )}

              {/* Color */}
              {product.colorways && product.colorways.length >= 1 && (
                <div>
                  <label
                    className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Color Preference
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {product.colorways.map((c) => {
                      const active = color === c.name;
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setColor(active ? '' : c.name)}
                          title={c.name}
                          className={`w-[18px] h-[18px] rounded-full border transition-all shrink-0 ${
                            active
                              ? 'border-foreground/40 ring-2 ring-foreground ring-offset-2 ring-offset-background'
                              : 'border-foreground/30 hover:border-foreground/60'
                          }`}
                          style={getSwatchStyle(c)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 mt-2 bg-foreground text-background text-[10px] tracking-[0.25em] uppercase hover:bg-foreground/90 transition-colors disabled:opacity-60"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {submitting ? 'Adding…' : 'Join Waitlist'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    <SizeChartOverlay
      open={sizeChartOpen}
      category={product.product_type || product.category}
      onClose={() => setSizeChartOpen(false)}
      variant="maison"
    />
    </>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ruler } from 'lucide-react';
import { useWaitlistSignup } from '@/hooks/use-waitlist-signup';
import { SizeChartOverlay } from './SizeChartOverlay';
import type { DemoProduct } from '@/data/demo-data';

interface WaitlistModalProps {
  open: boolean;
  onClose: () => void;
  product: DemoProduct;
}

// Shared neutral preference palette — no per-product color data exists,
// so we offer common shopper preferences.
export const WAITLIST_COLOR_OPTIONS = [
  'Black',
  'White',
  'Cream',
  'Grey',
  'Navy',
  'Brown',
  'Olive',
  'Burgundy',
];

export function WaitlistModal({ open, onClose, product }: WaitlistModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const { submit, submitting } = useWaitlistSignup();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;
    const res = await submit({
      productId: product.id,
      email,
      name,
      sizePreference: size,
      colorPreference: color,
    });
    if (res.ok) {
      setEmail('');
      setName('');
      setSize('');
      setColor('');
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md rounded-2xl bg-background/80 backdrop-blur-xl border border-foreground/10 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold tracking-wide text-foreground">
                  Join the waitlist
                </h2>
                <p className="mt-1 text-sm text-foreground/70 truncate">{product.title}</p>
                <p className="text-sm text-foreground/50">${product.price}</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-foreground/10 text-foreground/60 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-4 text-xs text-foreground/60">
              Enter your details and we'll email you the moment this is back in stock.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-[11px] tracking-wider uppercase text-foreground/60">Name</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-background/40 border border-foreground/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
                />
              </label>

              <label className="block">
                <span className="text-[11px] tracking-wider uppercase text-foreground/60">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-background/40 border border-foreground/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
                />
              </label>

              {product.variants.length > 1 && (
                <div>
                  <span className="text-[11px] tracking-wider uppercase text-foreground/60">Size preference</span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {product.variants.map((v) => {
                      const active = size === v.title;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSize(active ? '' : v.title)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                            active
                              ? 'bg-foreground text-background border-foreground'
                              : 'bg-background/40 text-foreground border-foreground/20 hover:border-foreground/40'
                          }`}
                        >
                          {v.title}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setSizeChartOpen(true)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium border border-foreground/20 text-foreground/70 hover:text-foreground hover:border-foreground/40 transition-colors flex items-center gap-1.5"
                    >
                      <Ruler className="w-3 h-3" />
                      SIZE CHART
                    </button>
                  </div>
                </div>
              )}

              <div>
                <span className="text-[11px] tracking-wider uppercase text-foreground/60">Color preference</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {WAITLIST_COLOR_OPTIONS.map((c) => {
                    const active = color === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(active ? '' : c)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-background/40 text-foreground border-foreground/20 hover:border-foreground/40'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-2.5 rounded-lg bg-foreground text-background font-display font-semibold text-sm tracking-wider hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {submitting ? 'Adding...' : 'JOIN WAITLIST'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

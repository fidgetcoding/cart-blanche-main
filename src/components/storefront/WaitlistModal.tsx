import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useWaitlistSignup } from '@/hooks/use-waitlist-signup';
import type { DemoProduct } from '@/data/demo-data';

interface WaitlistModalProps {
  open: boolean;
  onClose: () => void;
  product: DemoProduct;
}

export function WaitlistModal({ open, onClose, product }: WaitlistModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const { submit, submitting } = useWaitlistSignup();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;
    const res = await submit({
      productId: product.id,
      email,
      name,
      sizePreference: size,
    });
    if (res.ok) {
      setEmail('');
      setName('');
      setSize('');
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

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
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
                <label className="block">
                  <span className="text-[11px] tracking-wider uppercase text-foreground/60">Size (optional)</span>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-background/40 border border-foreground/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
                  >
                    <option value="">No preference</option>
                    {product.variants.map((v) => (
                      <option key={v.id} value={v.title}>{v.title}</option>
                    ))}
                  </select>
                </label>
              )}

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

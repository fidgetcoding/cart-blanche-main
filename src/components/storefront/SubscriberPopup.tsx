import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check } from 'lucide-react';
import { useSubscriberSignup } from '@/hooks/use-subscriber-signup';

const STORAGE_KEY = 'cb_subscriber_dismissed';
const SHOW_DELAY_MS = 7000;
const COPY_FEEDBACK_MS = 2000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Stage = 'hidden' | 'form' | 'success';

interface SubscriberPopupProps {
  /** Storefront template flavor. Drives subtle typography differences;
   *  color palette adapts automatically via theme tokens. */
  variant: 'yz' | 'sl';
}

export function SubscriberPopup({ variant }: SubscriberPopupProps) {
  const [stage, setStage] = useState<Stage>('hidden');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [welcomeCode, setWelcomeCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { submit, submitting } = useSubscriberSignup();

  // Show popup after delay, unless previously dismissed.
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') return;
    } catch {
      // intentional no-op
    }
    const t = setTimeout(() => setStage('form'), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const persistDismissed = () => {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch { /* no-op */ }
  };

  const dismiss = () => {
    persistDismissed();
    setStage('hidden');
  };

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Please enter your email.');
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError('Please enter a valid email.');
      return;
    }
    setEmailError('');

    const result = await submit(trimmed);
    if (result.ok && result.welcomeCode) {
      setWelcomeCode(result.welcomeCode);
      setStage('success');
      persistDismissed();
    } else {
      setEmailError('Something went wrong. Please try again.');
    }
  };

  const handleCopyCode = async () => {
    if (!welcomeCode) return;
    try {
      await navigator.clipboard.writeText(welcomeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      // Clipboard API unavailable — user falls back to manual selection
    }
  };

  const isYZ = variant === 'yz';
  const headerClass = isYZ
    ? 'font-display font-bold text-[10px] tracking-[0.22em] uppercase text-foreground/70'
    : 'font-display text-[10px] tracking-[0.28em] uppercase text-foreground/60';
  const cardClass = isYZ
    ? 'rounded-lg border border-foreground/15'
    : 'rounded-xl border border-border';
  const inputClass = isYZ
    ? 'w-full h-11 px-3 text-sm bg-transparent border border-foreground/25 rounded-md focus:border-foreground/60 focus:outline-none transition-colors font-display tracking-wider placeholder:text-foreground/30 placeholder:tracking-[0.18em] placeholder:uppercase placeholder:text-[10px]'
    : 'w-full h-11 px-3 text-sm bg-transparent border border-border rounded-lg focus:border-foreground/40 focus:outline-none transition-colors font-display tracking-wider placeholder:text-foreground/40 placeholder:tracking-[0.22em] placeholder:uppercase placeholder:text-[10px]';
  const submitButtonClass = isYZ
    ? 'w-full h-11 bg-foreground text-background font-display font-bold text-[11px] tracking-[0.22em] uppercase rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed'
    : 'w-full h-11 bg-foreground text-background font-display text-[11px] tracking-[0.28em] uppercase rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <AnimatePresence>
      {stage !== 'hidden' && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-32px)] max-w-[640px]"
        >
          <div className={`relative bg-background text-foreground shadow-2xl ${cardClass} p-6 sm:p-8`}>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {stage === 'form' && (
              <div className="flex flex-col gap-4">
                <h2 className={headerClass}>Receive Website Updates</h2>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                  placeholder="Email Address"
                  className={inputClass}
                  autoComplete="email"
                  disabled={submitting}
                />
                {emailError && (
                  <p className="text-xs text-destructive -mt-2">{emailError}</p>
                )}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={submitButtonClass}
                >
                  {submitting ? 'Submitting...' : 'Subscribe'}
                </button>
              </div>
            )}

            {stage === 'success' && (
              <div className="flex flex-col gap-4">
                <h2 className={headerClass}>You're In</h2>
                <p className="text-sm text-foreground/70 leading-relaxed">
                  Use this code at checkout for 10% off your first order.
                </p>
                <div className="flex items-stretch gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className={`flex-1 h-12 px-4 flex items-center justify-center font-display font-bold text-sm tracking-[0.3em] uppercase border ${isYZ ? 'border-foreground/25 rounded-md' : 'border-border rounded-lg'} hover:bg-foreground/5 transition-colors`}
                  >
                    {welcomeCode}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className={`h-12 px-4 flex items-center gap-2 font-display text-[11px] tracking-[0.22em] uppercase border ${isYZ ? 'border-foreground/25 rounded-md' : 'border-border rounded-lg'} hover:bg-foreground/5 transition-colors`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={dismiss}
                  className={submitButtonClass}
                >
                  Continue Browsing
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

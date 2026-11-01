import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // If already signed in, skip to storefront
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/', { replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    if (error) setError(error.message);
    else setMessage('Check your email for a sign-in link.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen dynamic-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold tracking-[0.2em]">CART BLANCHE</h1>
          <p className="text-sm text-muted-foreground mt-2">Merchant Portal</p>
        </div>

        <div className="liquid-glass rounded-2xl p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-display tracking-widest text-muted-foreground">EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full mt-1 px-4 py-3 bg-card/50 border border-border/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring backdrop-blur-sm"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-success">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-foreground/10 text-foreground backdrop-blur-xl border border-foreground/10 hover:bg-foreground/20 shadow-[inset_0_1px_0_hsla(0,0%,100%,0.1),0_4px_12px_hsla(0,0%,0%,0.2)] font-display font-semibold text-sm tracking-wider rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? '...' : 'EMAIL ME A SIGN-IN LINK'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

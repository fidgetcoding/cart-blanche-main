import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase sets the session from the URL hash automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    // Also check if already in recovery (hash may have been consumed)
    if (window.location.hash.includes('type=recovery')) setReady(true);
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setMessage('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else {
      setMessage('Password updated! Redirecting…');
      setTimeout(() => navigate('/admin'), 1500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen dynamic-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold tracking-[0.2em]">CART BLANCHE</h1>
          <p className="text-sm text-muted-foreground mt-2">Reset Your Password</p>
        </div>

        <div className="liquid-glass rounded-2xl p-6 space-y-6">
          {!ready ? (
            <p className="text-sm text-muted-foreground text-center">Verifying reset link…</p>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="text-xs font-display tracking-widest text-muted-foreground">NEW PASSWORD</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full mt-1 px-4 py-3 bg-card/50 border border-border/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring backdrop-blur-sm"
                  required
                  minLength={6}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {message && <p className="text-sm text-success">{message}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-foreground/10 text-foreground backdrop-blur-xl border border-foreground/10 hover:bg-foreground/20 shadow-[inset_0_1px_0_hsla(0,0%,100%,0.1),0_4px_12px_hsla(0,0%,0%,0.2)] font-display font-semibold text-sm tracking-wider rounded-lg transition-all disabled:opacity-50"
              >
                {loading ? '...' : 'UPDATE PASSWORD'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

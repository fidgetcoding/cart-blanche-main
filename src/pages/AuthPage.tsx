import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';

// What Supabase answers when an email has no account and signups are closed.
const NO_ACCOUNT_CODES = ['otp_disabled', 'signup_disabled'];

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen dynamic-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold tracking-[0.2em]">CART BLANCHE</h1>
          <p className="text-sm text-muted-foreground mt-2">Merchant Portal</p>
        </div>

        <div className="liquid-glass rounded-2xl p-6 space-y-6">{children}</div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  if (!supabase) {
    return (
      <AuthShell>
        <p className="text-sm">No backend is configured, so signing in is switched off.</p>
        <p className="text-sm text-muted-foreground">
          This copy runs on sample data. To use real accounts, connect your own Supabase project by following SETUP.md.
        </p>
        <Link to="/admin" className="block text-center text-xs font-display tracking-wider text-muted-foreground hover:text-foreground transition-colors">
          OPEN THE DEMO ADMIN
        </Link>
      </AuthShell>
    );
  }
  return <AuthForm client={supabase} />;
}

function AuthForm({ client }: { client: NonNullable<typeof supabase> }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // If already signed in, skip to storefront
  useEffect(() => {
    client.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/', { replace: true });
    });
  }, [client, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const { error } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/admin` },
    });
    // Unknown emails get the same answer, so this can't reveal who has an account.
    if (error && !NO_ACCOUNT_CODES.includes(error.code ?? '')) setError(error.message);
    else setMessage('If that email has a merchant account, a sign-in link is on its way.');
    setLoading(false);
  };

  return (
    <AuthShell>
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
    </AuthShell>
  );
}

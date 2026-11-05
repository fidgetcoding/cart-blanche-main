import { Check, Trash2 } from 'lucide-react';
import type { WaitlistSignup } from '@/hooks/use-product-waitlist';

interface Props {
  signups: WaitlistSignup[];
  onMarkFulfilled: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  showProductColumn?: boolean;
  productTitleById?: Record<string, string>;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function WaitlistTable({ signups, onMarkFulfilled, onDelete, showProductColumn, productTitleById }: Props) {
  if (signups.length === 0) {
    return (
      <div className="border border-border/50 rounded-lg p-6 text-center">
        <p className="text-xs text-muted-foreground font-display tracking-widest">No waitlist signups yet.</p>
      </div>
    );
  }
  return (
    <div className="border border-border/50 rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-secondary/30 border-b border-border/50">
            <th className="text-left px-3 py-2 text-[10px] font-display tracking-widest text-muted-foreground">NAME</th>
            <th className="text-left px-3 py-2 text-[10px] font-display tracking-widest text-muted-foreground">EMAIL</th>
            <th className="text-left px-3 py-2 text-[10px] font-display tracking-widest text-muted-foreground">SIZE</th>
            <th className="text-left px-3 py-2 text-[10px] font-display tracking-widest text-muted-foreground">COLOR</th>
            {showProductColumn && (
              <th className="text-left px-3 py-2 text-[10px] font-display tracking-widest text-muted-foreground">PRODUCT</th>
            )}
            <th className="text-left px-3 py-2 text-[10px] font-display tracking-widest text-muted-foreground">STATUS</th>
            <th className="text-left px-3 py-2 text-[10px] font-display tracking-widest text-muted-foreground">DATE</th>
            <th className="text-right px-3 py-2 text-[10px] font-display tracking-widest text-muted-foreground">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {signups.map((s) => (
            <tr key={s.id} className="border-b border-border/30 last:border-b-0 hover:bg-secondary/10">
              <td className="px-3 py-2 text-foreground">{s.name || <span className="text-muted-foreground/60">—</span>}</td>
              <td className="px-3 py-2 text-foreground/80">{s.email}</td>
              <td className="px-3 py-2 text-foreground/80">{s.size_preference || <span className="text-muted-foreground/60">—</span>}</td>
              <td className="px-3 py-2 text-foreground/80">{s.colorway_preference || <span className="text-muted-foreground/60">—</span>}</td>
              {showProductColumn && (
                <td className="px-3 py-2 text-foreground/80">{productTitleById?.[s.product_id] || s.product_id}</td>
              )}
              <td className="px-3 py-2">
                <span
                  className={`text-[10px] font-display tracking-widest px-2 py-0.5 rounded ${
                    s.status === 'fulfilled'
                      ? 'bg-success/20 text-success'
                      : s.status === 'cancelled'
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-warning/20 text-warning'
                  }`}
                >
                  {s.status.toUpperCase()}
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground text-xs">{formatDate(s.created_at)}</td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-1">
                  {s.status === 'pending' && (
                    <button
                      onClick={() => onMarkFulfilled(s.id)}
                      className="p-1 text-success hover:bg-success/20 rounded transition-colors"
                      title="Mark fulfilled"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(s.id)}
                    className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

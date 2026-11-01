import { useState, useMemo } from 'react';
import { Search, Mail, ArrowUpDown, Download, Trash2 } from 'lucide-react';
import { useSubscribers, type Subscriber } from '@/hooks/use-subscribers';
import { downloadCsv, toCsv } from '@/lib/csv';

type SortDir = 'desc' | 'asc';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function buildCsv(rows: Subscriber[]): string {
  return toCsv(['email', 'signed_up_at'], rows.map(r => [r.email, new Date(r.created_at).toISOString()]));
}

export default function AdminSubscribers() {
  const { subscribers, loading, deleteSubscriber } = useSubscribers();

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortDir>('desc');

  const filtered = useMemo(() => {
    let result = subscribers;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(s => s.email.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return sort === 'desc' ? bt - at : at - bt;
    });
    return result;
  }, [subscribers, search, sort]);

  const handleExport = () => {
    if (filtered.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const csv = buildCsv(filtered);
    downloadCsv(`subscribers-${today}.csv`, csv);
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Remove ${email} from subscribers?`)) return;
    await deleteSubscriber(id);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display tracking-wide text-foreground">Subscribers</h1>
          <p className="text-xs text-muted-foreground mt-1 font-display tracking-wide">
            {subscribers.length} total {subscribers.length === 1 ? 'subscriber' : 'subscribers'}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 text-xs font-display tracking-widest px-4 py-2 bg-foreground text-background rounded-md hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5" />
          EXPORT CSV
        </button>
      </div>

      {/* Card */}
      <div className="border border-border/50 rounded-lg bg-card/40">
        {/* Search + sort */}
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border/50">
          <div className="flex items-center gap-2 flex-1 min-w-[220px] px-3 py-1.5 bg-background/40 border border-border/50 rounded-md">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </div>

          <button
            onClick={() => setSort(s => s === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1.5 text-xs font-display tracking-wide px-3 py-1.5 bg-background/40 border border-border/50 rounded-md hover:bg-secondary transition-colors"
            title={sort === 'desc' ? 'Newest first' : 'Oldest first'}
          >
            <ArrowUpDown className="w-3 h-3" />
            {sort === 'desc' ? 'Newest' : 'Oldest'}
          </button>
        </div>

        {/* Body */}
        <div className="p-3">
          {loading ? (
            <p className="text-xs text-muted-foreground font-display tracking-widest text-center py-10">Loading subscribers...</p>
          ) : subscribers.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
              <Mail className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-foreground font-display tracking-wide">No subscribers yet.</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                When shoppers submit the email-capture popup on your storefront, they'll appear here.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground font-display tracking-widest text-center py-10">No subscribers match your search.</p>
          ) : (
            <div className="border border-border/50 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/30 border-b border-border/50">
                    <th className="text-left px-3 py-2 text-[10px] font-display tracking-widest text-muted-foreground">EMAIL</th>
                    <th className="text-left px-3 py-2 text-[10px] font-display tracking-widest text-muted-foreground">DATE</th>
                    <th className="text-right px-3 py-2 text-[10px] font-display tracking-widest text-muted-foreground">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id} className="border-b border-border/30 last:border-b-0 hover:bg-secondary/10">
                      <td className="px-3 py-2 text-foreground">{s.email}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{formatDate(s.created_at)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => handleDelete(s.id, s.email)}
                            className="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                            title="Remove subscriber"
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
          )}
        </div>
      </div>
    </div>
  );
}

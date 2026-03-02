import { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronRight, X, Check } from 'lucide-react';

// Common HS codes for apparel / fashion — structured like Shopify's picker
interface HsEntry {
  code: string;
  label: string;
  children?: HsEntry[];
}

const HS_TREE: HsEntry[] = [
  {
    code: '61', label: 'Knitted or crocheted clothing', children: [
      { code: '6101', label: 'Overcoats, cloaks — knitted (men)', children: [
        { code: '6101.20', label: 'Of cotton' },
        { code: '6101.30', label: 'Of man-made fibres' },
        { code: '6101.90', label: 'Of other textile materials' },
      ]},
      { code: '6102', label: 'Overcoats, cloaks — knitted (women)', children: [
        { code: '6102.20', label: 'Of cotton' },
        { code: '6102.30', label: 'Of man-made fibres' },
        { code: '6102.90', label: 'Of other textile materials' },
      ]},
      { code: '6103', label: 'Suits, jackets, trousers — knitted (men)', children: [
        { code: '6103.10', label: 'Suits' },
        { code: '6103.22', label: 'Ensembles — of cotton' },
        { code: '6103.31', label: 'Jackets — of wool' },
        { code: '6103.32', label: 'Jackets — of cotton' },
        { code: '6103.33', label: 'Jackets — of synthetic fibres' },
        { code: '6103.42', label: 'Trousers — of cotton' },
        { code: '6103.43', label: 'Trousers — of synthetic fibres' },
      ]},
      { code: '6104', label: 'Suits, dresses, skirts — knitted (women)', children: [
        { code: '6104.13', label: 'Suits — of synthetic fibres' },
        { code: '6104.22', label: 'Ensembles — of cotton' },
        { code: '6104.32', label: 'Jackets — of cotton' },
        { code: '6104.42', label: 'Dresses — of cotton' },
        { code: '6104.62', label: 'Trousers — of cotton' },
        { code: '6104.63', label: 'Trousers — of synthetic fibres' },
      ]},
      { code: '6105', label: 'Shirts — knitted (men)', children: [
        { code: '6105.10', label: 'Of cotton' },
        { code: '6105.20', label: 'Of man-made fibres' },
      ]},
      { code: '6106', label: 'Blouses, shirts — knitted (women)', children: [
        { code: '6106.10', label: 'Of cotton' },
        { code: '6106.20', label: 'Of man-made fibres' },
      ]},
      { code: '6109', label: 'T-shirts, singlets, tank tops', children: [
        { code: '6109.10', label: 'Of cotton' },
        { code: '6109.90', label: 'Of other textile materials' },
      ]},
      { code: '6110', label: 'Sweaters, pullovers, cardigans', children: [
        { code: '6110.11', label: 'Of wool' },
        { code: '6110.12', label: 'Of Kashmir goats' },
        { code: '6110.20', label: 'Of cotton' },
        { code: '6110.30', label: 'Of man-made fibres' },
      ]},
      { code: '6111', label: 'Babies\' garments — knitted' },
      { code: '6112', label: 'Track suits, ski suits, swimwear', children: [
        { code: '6112.11', label: 'Track suits — of cotton' },
        { code: '6112.12', label: 'Track suits — of synthetic fibres' },
        { code: '6112.31', label: 'Swimwear (men) — of synthetic fibres' },
        { code: '6112.41', label: 'Swimwear (women) — of synthetic fibres' },
      ]},
      { code: '6114', label: 'Other knitted garments', children: [
        { code: '6114.20', label: 'Of cotton' },
        { code: '6114.30', label: 'Of man-made fibres' },
      ]},
      { code: '6115', label: 'Hosiery, socks, stockings', children: [
        { code: '6115.21', label: 'Panty hose — of synthetic ≤67dtex' },
        { code: '6115.95', label: 'Socks — of cotton' },
        { code: '6115.96', label: 'Socks — of synthetic fibres' },
      ]},
      { code: '6116', label: 'Gloves — knitted' },
      { code: '6117', label: 'Other knitted accessories', children: [
        { code: '6117.10', label: 'Shawls, scarves' },
        { code: '6117.80', label: 'Other accessories' },
      ]},
    ],
  },
  {
    code: '62', label: 'Woven clothing (not knitted)', children: [
      { code: '6201', label: 'Overcoats, jackets — woven (men)', children: [
        { code: '6201.11', label: 'Of wool or fine animal hair' },
        { code: '6201.12', label: 'Of cotton' },
        { code: '6201.13', label: 'Of man-made fibres' },
        { code: '6201.91', label: 'Anoraks, windbreakers — of wool' },
        { code: '6201.92', label: 'Anoraks, windbreakers — of cotton' },
        { code: '6201.93', label: 'Anoraks, windbreakers — of man-made fibres' },
      ]},
      { code: '6202', label: 'Overcoats, jackets — woven (women)', children: [
        { code: '6202.11', label: 'Of wool or fine animal hair' },
        { code: '6202.12', label: 'Of cotton' },
        { code: '6202.13', label: 'Of man-made fibres' },
        { code: '6202.91', label: 'Anoraks, windbreakers — of wool' },
        { code: '6202.92', label: 'Anoraks, windbreakers — of cotton' },
        { code: '6202.93', label: 'Anoraks, windbreakers — of man-made fibres' },
      ]},
      { code: '6203', label: 'Suits, jackets, trousers — woven (men)', children: [
        { code: '6203.11', label: 'Suits — of wool' },
        { code: '6203.12', label: 'Suits — of synthetic fibres' },
        { code: '6203.22', label: 'Ensembles — of cotton' },
        { code: '6203.31', label: 'Jackets — of wool' },
        { code: '6203.32', label: 'Jackets — of cotton' },
        { code: '6203.33', label: 'Jackets — of synthetic fibres' },
        { code: '6203.41', label: 'Trousers — of wool' },
        { code: '6203.42', label: 'Trousers — of cotton' },
        { code: '6203.43', label: 'Trousers — of synthetic fibres' },
      ]},
      { code: '6204', label: 'Suits, dresses, skirts — woven (women)', children: [
        { code: '6204.11', label: 'Suits — of wool' },
        { code: '6204.12', label: 'Suits — of cotton' },
        { code: '6204.22', label: 'Ensembles — of cotton' },
        { code: '6204.32', label: 'Jackets — of cotton' },
        { code: '6204.42', label: 'Dresses — of cotton' },
        { code: '6204.52', label: 'Skirts — of cotton' },
        { code: '6204.62', label: 'Trousers — of cotton' },
        { code: '6204.63', label: 'Trousers — of synthetic fibres' },
      ]},
      { code: '6205', label: 'Shirts — woven (men)', children: [
        { code: '6205.20', label: 'Of cotton' },
        { code: '6205.30', label: 'Of man-made fibres' },
      ]},
      { code: '6206', label: 'Blouses, shirts — woven (women)', children: [
        { code: '6206.30', label: 'Of cotton' },
        { code: '6206.40', label: 'Of man-made fibres' },
      ]},
      { code: '6207', label: 'Underpants, pyjamas — woven (men)' },
      { code: '6211', label: 'Track suits, ski suits, swimwear — woven', children: [
        { code: '6211.11', label: 'Swimwear (men)' },
        { code: '6211.12', label: 'Swimwear (women)' },
        { code: '6211.32', label: 'Other garments (men) — of cotton' },
        { code: '6211.33', label: 'Other garments (men) — of man-made fibres' },
        { code: '6211.42', label: 'Other garments (women) — of cotton' },
        { code: '6211.43', label: 'Other garments (women) — of man-made fibres' },
      ]},
      { code: '6212', label: 'Bras, girdles, corsets' },
      { code: '6214', label: 'Shawls, scarves, veils — woven', children: [
        { code: '6214.20', label: 'Of wool or fine animal hair' },
        { code: '6214.30', label: 'Of synthetic fibres' },
        { code: '6214.40', label: 'Of artificial fibres' },
      ]},
      { code: '6215', label: 'Ties, bow ties, cravats' },
      { code: '6217', label: 'Other clothing accessories — woven' },
    ],
  },
  {
    code: '42', label: 'Leather articles', children: [
      { code: '4202', label: 'Bags, cases, wallets', children: [
        { code: '4202.11', label: 'Trunks, suitcases — leather' },
        { code: '4202.21', label: 'Handbags — leather' },
        { code: '4202.31', label: 'Wallets, purses — leather' },
      ]},
      { code: '4203', label: 'Leather clothing & accessories', children: [
        { code: '4203.10', label: 'Leather clothing' },
        { code: '4203.21', label: 'Gloves — leather' },
        { code: '4203.29', label: 'Other gloves — leather' },
        { code: '4203.30', label: 'Belts' },
        { code: '4203.40', label: 'Other leather accessories' },
      ]},
    ],
  },
  {
    code: '64', label: 'Footwear', children: [
      { code: '6401', label: 'Waterproof footwear — rubber/plastic' },
      { code: '6402', label: 'Footwear — rubber/plastic soles & uppers', children: [
        { code: '6402.19', label: 'Sports footwear — other' },
        { code: '6402.20', label: 'With strap/thong' },
        { code: '6402.91', label: 'Covering ankle' },
        { code: '6402.99', label: 'Other' },
      ]},
      { code: '6403', label: 'Footwear — leather uppers', children: [
        { code: '6403.19', label: 'Sports footwear — other' },
        { code: '6403.51', label: 'Covering ankle — leather sole' },
        { code: '6403.59', label: 'Covering ankle — other sole' },
        { code: '6403.91', label: 'Other — leather sole' },
        { code: '6403.99', label: 'Other — other sole' },
      ]},
      { code: '6404', label: 'Footwear — textile uppers', children: [
        { code: '6404.11', label: 'Sports footwear — rubber/plastic sole' },
        { code: '6404.19', label: 'Other — rubber/plastic sole' },
        { code: '6404.20', label: 'Leather or composition sole' },
      ]},
      { code: '6405', label: 'Other footwear' },
    ],
  },
  {
    code: '65', label: 'Headgear', children: [
      { code: '6504', label: 'Hats — plaited or strips' },
      { code: '6505', label: 'Hats — knitted, crocheted, lace', children: [
        { code: '6505.00', label: 'Knitted/crocheted hats & caps' },
      ]},
      { code: '6506', label: 'Other headgear', children: [
        { code: '6506.10', label: 'Safety headgear' },
        { code: '6506.91', label: 'Of rubber or plastic' },
        { code: '6506.99', label: 'Of other materials' },
      ]},
    ],
  },
  {
    code: '63', label: 'Other textile articles', children: [
      { code: '6301', label: 'Blankets and travel rugs' },
      { code: '6302', label: 'Bed, table, toilet & kitchen linen' },
      { code: '6304', label: 'Furnishing articles' },
      { code: '6305', label: 'Sacks and bags — packing' },
      { code: '6307', label: 'Made-up articles — other', children: [
        { code: '6307.10', label: 'Floor cloths, dish cloths' },
        { code: '6307.20', label: 'Life jackets, life belts' },
        { code: '6307.90', label: 'Other made-up articles' },
      ]},
    ],
  },
  {
    code: '71', label: 'Jewellery & precious metals', children: [
      { code: '7113', label: 'Jewellery of precious metals', children: [
        { code: '7113.11', label: 'Of silver' },
        { code: '7113.19', label: 'Of other precious metal' },
        { code: '7113.20', label: 'Of base metal clad with precious metal' },
      ]},
      { code: '7116', label: 'Articles of natural or cultured pearls' },
      { code: '7117', label: 'Imitation jewellery', children: [
        { code: '7117.11', label: 'Cuff links, studs — base metal' },
        { code: '7117.19', label: 'Other — base metal' },
        { code: '7117.90', label: 'Other imitation jewellery' },
      ]},
    ],
  },
];

// Flatten all entries for search
function flattenTree(entries: HsEntry[], parentPath: string[] = []): { code: string; label: string; path: string[] }[] {
  const result: { code: string; label: string; path: string[] }[] = [];
  for (const e of entries) {
    const currentPath = [...parentPath, e.label];
    result.push({ code: e.code, label: e.label, path: currentPath });
    if (e.children) result.push(...flattenTree(e.children, currentPath));
  }
  return result;
}

const FLAT_HS = flattenTree(HS_TREE);

interface HsCodePickerProps {
  value: string;
  onChange: (code: string) => void;
  compact?: boolean;
}

export function HsCodePicker({ value, onChange, compact = false }: HsCodePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [breadcrumb, setBreadcrumb] = useState<HsEntry[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Recalculate position when open
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropH = 380;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const top = spaceBelow >= dropH ? rect.bottom + 4 : rect.top - dropH - 4;
    setPos({ top: Math.max(4, top), left: rect.left });
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const currentLevel = breadcrumb.length > 0
    ? breadcrumb[breadcrumb.length - 1].children ?? []
    : HS_TREE;

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return FLAT_HS.filter(e =>
      e.code.includes(q) || e.label.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [search]);

  const displayItems = searchResults ?? currentLevel;

  const currentMatch = value ? FLAT_HS.find(e => e.code === value) : null;

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearch('');
    setBreadcrumb([]);
  };

  const handleDrillDown = (entry: HsEntry) => {
    if (entry.children && entry.children.length > 0) {
      setBreadcrumb(prev => [...prev, entry]);
      setSearch('');
    } else {
      handleSelect(entry.code);
    }
  };

  const handleBack = () => {
    setBreadcrumb(prev => prev.slice(0, -1));
  };

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { setIsOpen(!isOpen); setSearch(''); setBreadcrumb([]); }}
        className={`flex items-center gap-2 text-left transition-colors ${
          compact
            ? 'text-xs font-display hover:underline'
            : 'w-full mt-1 px-4 py-2.5 bg-background/40 border border-border/50 backdrop-blur-sm rounded-lg text-sm hover:border-foreground/30'
        }`}
      >
        {value ? (
          <span className="flex items-center gap-2">
            <span className="font-mono text-foreground">{value}</span>
            <span className="text-muted-foreground truncate">
              {currentMatch ? `— ${currentMatch.label}` : ''}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground italic">
            {compact ? 'Look up HS code' : 'Search HS codes…'}
          </span>
        )}
      </button>

      {isOpen && pos && createPortal(
        <div
          ref={ref}
          className="fixed z-[9999] w-80 max-h-[380px] bg-popover border border-border rounded-lg shadow-xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
          style={{ top: pos.top, left: pos.left }}
        >
          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-muted/30">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by code or description…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              autoFocus
            />
            {value && (
              <button
                onClick={() => { onChange(''); setIsOpen(false); }}
                className="p-0.5 hover:bg-destructive/20 rounded transition-colors"
                title="Clear"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Breadcrumb */}
          {breadcrumb.length > 0 && !searchResults && (
            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/50 bg-muted/20 text-[10px] font-display tracking-wider">
              <button
                onClick={() => setBreadcrumb([])}
                className="text-primary hover:underline"
              >
                ALL
              </button>
              {breadcrumb.map((b, i) => (
                <span key={b.code} className="flex items-center gap-1">
                  <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/40" />
                  <button
                    onClick={() => setBreadcrumb(prev => prev.slice(0, i + 1))}
                    className={i === breadcrumb.length - 1 ? 'text-foreground' : 'text-primary hover:underline'}
                  >
                    {b.code}
                  </button>
                </span>
              ))}
              <button onClick={handleBack} className="ml-auto text-muted-foreground hover:text-foreground">
                ← Back
              </button>
            </div>
          )}

          {/* Items list */}
          <div className="flex-1 overflow-y-auto">
            {displayItems.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No matching HS codes found
              </div>
            ) : (
              displayItems.map((item) => {
                const entry = 'children' in item ? item as HsEntry : null;
                const code = 'code' in item ? (item as any).code : '';
                const label = 'label' in item ? (item as any).label : '';
                const hasChildren = entry?.children && entry.children.length > 0;
                const isSelected = value === code;

                return (
                  <button
                    key={code + label}
                    type="button"
                    onClick={() => {
                      if (searchResults) {
                        handleSelect(code);
                      } else if (hasChildren) {
                        handleDrillDown(entry!);
                      } else {
                        handleSelect(code);
                      }
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/50 transition-colors text-sm ${
                      isSelected ? 'bg-primary/10' : ''
                    }`}
                  >
                    <span className="font-mono text-xs text-foreground/80 w-16 flex-shrink-0">{code}</span>
                    <span className="flex-1 truncate text-foreground/90">{label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                    {hasChildren && !searchResults && (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Manual entry footer */}
          <div className="border-t border-border/50 px-3 py-2 bg-muted/20">
            <p className="text-[9px] font-display tracking-widest text-muted-foreground mb-1">MANUAL ENTRY</p>
            <div className="flex items-center gap-1.5">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Type code directly…"
                className="flex-1 px-2 py-1 bg-background/60 border border-border/40 rounded text-xs outline-none focus:ring-1 focus:ring-ring font-mono"
                onKeyDown={e => {
                  if (e.key === 'Enter' && search.trim()) {
                    handleSelect(search.trim());
                  }
                }}
              />
              <button
                onClick={() => { if (search.trim()) handleSelect(search.trim()); }}
                disabled={!search.trim()}
                className="px-2 py-1 bg-primary text-primary-foreground text-[10px] font-display rounded disabled:opacity-40 hover:opacity-90"
              >
                SET
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

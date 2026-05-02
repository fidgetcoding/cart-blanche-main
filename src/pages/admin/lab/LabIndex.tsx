import { useEffect, useState } from 'react';
import { FlaskConical, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getActiveTemplate, setActiveTemplate, subscribeActiveTemplate, type ActiveTemplate } from '@/lib/active-template';

const TEMPLATES = [
  {
    id: 'yz' as const,
    name: 'YZ Template',
    subtitle: 'Spatial product grid. Built for streetwear and fashion.',
    to: '/admin/lab/yz',
  },
  {
    id: 'sl' as const,
    name: 'SL Template',
    subtitle: 'Editorial luxury grid. Built for high-end fashion and designer brands.',
    to: '/admin/lab/sl',
  },
];

export default function LabIndex() {
  const [activeId, setActiveId] = useState<ActiveTemplate>(() => getActiveTemplate());

  // Keep in sync if active template changes elsewhere (other tab, etc.)
  useEffect(() => {
    const unsub = subscribeActiveTemplate(setActiveId);
    return unsub;
  }, []);

  const handleSetActive = (id: ActiveTemplate) => {
    setActiveTemplate(id);
    setActiveId(id);
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold tracking-wide">Templates</h1>
        <p className="text-[11px] text-muted-foreground font-display tracking-wider">Choose which template publishes to your storefront</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {TEMPLATES.map((tmpl) => {
          const isActive = tmpl.id === activeId;
          return (
            <Link
              key={tmpl.id}
              to={tmpl.to}
              className="group relative flex items-center justify-between gap-4 p-5 rounded-xl liquid-glass hover:border-foreground/15 transition-all duration-300"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-foreground/5 border border-foreground/10 flex items-center justify-center">
                  <FlaskConical className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground/80 transition-colors" />
                </div>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="font-display text-xs tracking-[0.15em] text-foreground">{tmpl.name}</span>
                  <span className="text-[11px] text-muted-foreground/70">
                    {tmpl.subtitle}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isActive) handleSetActive(tmpl.id);
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-display tracking-wider transition-all backdrop-blur-sm ${
                    isActive
                      ? 'bg-success/15 text-[hsl(var(--success))] border border-[hsl(var(--success))]/20 cursor-default'
                      : 'bg-foreground/5 text-muted-foreground border border-foreground/10 hover:bg-foreground/10 hover:text-foreground cursor-pointer'
                  }`}
                >
                  {isActive ? 'ACTIVE' : 'SET ACTIVE'}
                </button>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground/50 transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

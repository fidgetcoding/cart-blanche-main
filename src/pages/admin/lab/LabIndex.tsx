import { useState } from 'react';
import { FlaskConical, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const TEMPLATES = [
  {
    id: 'yz',
    name: 'YZ Template',
    activeDescription: 'Your active storefront template. Customize in the visual builder.',
    inactiveDescription: 'Stripped-back brutalist grid. No chrome, no noise.',
    to: '/admin/lab/yz',
  },
  {
    id: 'sl',
    name: 'SL Template',
    activeDescription: 'Your active storefront template. Cinematic editorial layout.',
    inactiveDescription: 'High-fashion editorial. Cinematic pacing, full-bleed imagery.',
    to: '/admin/lab/sl',
  },
];

export default function LabIndex() {
  const [activeId, setActiveId] = useState('yz');

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-sm tracking-[0.25em] text-foreground/80">TEMPLATES</h2>
        <p className="text-xs text-muted-foreground font-display tracking-wider">Storefront templates in development</p>
      </div>

      <div className="flex flex-col gap-3">
        {TEMPLATES.map((tmpl) => {
          const isActive = tmpl.id === activeId;
          return (
            <Link
              key={tmpl.id}
              to={tmpl.to}
              className="group flex items-center justify-between gap-4 p-5 rounded-lg border border-sidebar-border bg-card hover:bg-sidebar-accent/40 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <FlaskConical className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground/70 transition-colors flex-shrink-0" />
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs tracking-[0.15em] text-foreground">{tmpl.name}</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveId(tmpl.id);
                      }}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-display tracking-wider transition-all ${
                        isActive
                          ? 'bg-success/20 text-[hsl(var(--success))] cursor-default'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer'
                      }`}
                    >
                      {isActive ? 'ACTIVE' : 'SET ACTIVE'}
                    </button>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {isActive ? tmpl.activeDescription : tmpl.inactiveDescription}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground/60 transition-colors flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

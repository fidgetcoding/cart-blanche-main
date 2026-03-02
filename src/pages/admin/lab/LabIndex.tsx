import { useState } from 'react';
import { FlaskConical, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const TEMPLATES = [
  {
    id: 'yz',
    name: 'YZ Template',
    subtitle: 'Spatial product grid. Built for streetwear and fashion.',
    activeDescription: 'Your active storefront template. Customize in the visual builder.',
    inactiveDescription: 'Stripped-back brutalist grid. No chrome, no noise.',
    to: '/admin/lab/yz',
  },
  {
    id: 'sl',
    name: 'SL Template',
    subtitle: 'High-fashion editorial. Cinematic pacing, full-bleed imagery.',
    activeDescription: 'Your active storefront template. Cinematic editorial layout.',
    inactiveDescription: 'High-fashion editorial. Cinematic pacing, full-bleed imagery.',
    to: '/admin/lab/sl',
  },
];

export default function LabIndex() {
  const [activeId, setActiveId] = useState('yz');

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-sm tracking-[0.25em] text-foreground/80">TEMPLATES</h2>
        <p className="text-[11px] text-muted-foreground font-display tracking-wider">Storefront templates in development</p>
      </div>

      <div className="flex flex-col gap-3">
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
                  <div className="flex items-center gap-2.5">
                    <span className="font-display text-xs tracking-[0.15em] text-foreground">{tmpl.name}</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveId(tmpl.id);
                      }}
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-display tracking-wider transition-all backdrop-blur-sm ${
                        isActive
                          ? 'bg-success/15 text-[hsl(var(--success))] border border-[hsl(var(--success))]/20 cursor-default'
                          : 'bg-foreground/5 text-muted-foreground border border-foreground/10 hover:bg-foreground/10 hover:text-foreground cursor-pointer'
                      }`}
                    >
                      {isActive ? 'ACTIVE' : 'SET ACTIVE'}
                    </button>
                  </div>
                  <span className="text-[11px] text-muted-foreground/70">
                    {tmpl.subtitle}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground/50 transition-colors flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

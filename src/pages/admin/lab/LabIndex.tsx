import { FlaskConical, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const EXPERIMENTS = [
  {
    id: 'yzy',
    name: 'YZY Template',
    description: 'Stripped-back brutalist grid. No chrome, no noise.',
    to: '/admin/lab/yzy',
  },
  {
    id: 'sl',
    name: 'SL Template',
    description: 'High-fashion editorial. Cinematic pacing, full-bleed imagery.',
    to: '/admin/lab/sl',
  },
];

export default function LabIndex() {
  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-sm tracking-[0.25em] text-foreground/80">EXPERIMENTS</h2>
        <p className="text-xs text-muted-foreground font-display tracking-wider">Storefront templates in development</p>
      </div>

      <div className="flex flex-col gap-3">
        {EXPERIMENTS.map((exp) => (
          <Link
            key={exp.id}
            to={exp.to}
            className="group flex items-center justify-between gap-4 p-5 rounded-lg border border-sidebar-border bg-card hover:bg-sidebar-accent/40 transition-colors"
          >
            <div className="flex items-center gap-4">
              <FlaskConical className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground/70 transition-colors" />
              <div className="flex flex-col gap-0.5">
                <span className="font-display text-xs tracking-[0.15em] text-foreground">{exp.name}</span>
                <span className="text-[11px] text-muted-foreground">{exp.description}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground/60 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}

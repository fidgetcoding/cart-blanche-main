import { useNavigate } from 'react-router-dom';
import { FlaskConical, Plus, ArrowRight, Beaker } from 'lucide-react';

interface LabEntry {
  id: string;
  label: string;
  description: string;
  status: 'active' | 'wip' | 'empty';
}

const LAB_ENTRIES: LabEntry[] = [
  { id: 'experiment-1', label: 'Experiment 1', description: 'Empty slot — ready to build', status: 'empty' },
  { id: 'experiment-2', label: 'Experiment 2', description: 'Empty slot — ready to build', status: 'empty' },
  { id: 'experiment-3', label: 'Experiment 3', description: 'Empty slot — ready to build', status: 'empty' },
];

const STATUS_STYLES: Record<LabEntry['status'], string> = {
  active: 'border-success/40 bg-success/5 text-success',
  wip: 'border-amber-500/40 bg-amber-500/5 text-amber-400',
  empty: 'border-border/30 bg-transparent text-muted-foreground/40',
};

const STATUS_LABEL: Record<LabEntry['status'], string> = {
  active: 'ACTIVE',
  wip: 'WIP',
  empty: 'EMPTY',
};

export default function LabIndex() {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-wide">THE LAB</h1>
        </div>
        <p className="text-sm text-muted-foreground font-display tracking-wider ml-11">
          Isolated sandbox for UI experiments, feature prototypes, and whatever else.
          <span className="text-muted-foreground/50"> Nothing here touches production.</span>
        </p>
      </div>

      {/* Warning badge */}
      <div className="mb-8 flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5 w-fit">
        <Beaker className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[11px] font-display tracking-widest text-amber-400/80">EXPERIMENTAL ZONE — CHANGES HERE ARE ISOLATED</span>
      </div>

      {/* Experiment cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {LAB_ENTRIES.map((entry) => (
          <button
            key={entry.id}
            onClick={() => navigate(`/admin/lab/${entry.id}`)}
            className={`group relative text-left p-5 rounded-xl border transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 ${
              entry.status === 'empty'
                ? 'border-border/30 bg-background/20 hover:border-primary/40'
                : 'border-border/50 bg-background/40'
            }`}
          >
            {/* Status pill */}
            <span className={`absolute top-3 right-3 text-[9px] font-display tracking-widest px-1.5 py-0.5 rounded border ${STATUS_STYLES[entry.status]}`}>
              {STATUS_LABEL[entry.status]}
            </span>

            <div className="flex flex-col gap-3">
              <div className="w-7 h-7 rounded-md bg-foreground/5 border border-border/30 flex items-center justify-center group-hover:border-primary/30 transition-colors">
                <FlaskConical className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="font-display text-sm font-semibold tracking-wide">{entry.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-display tracking-wider text-muted-foreground/50 group-hover:text-primary transition-colors">
                OPEN <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </button>
        ))}

        {/* Add new slot card */}
        <button
          className="group text-left p-5 rounded-xl border border-dashed border-border/30 bg-transparent transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 min-h-[140px]"
          onClick={() => {}} // placeholder — will add new entries over time
        >
          <div className="w-7 h-7 rounded-md border border-dashed border-border/40 flex items-center justify-center group-hover:border-primary/40 transition-colors">
            <Plus className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          </div>
          <span className="text-[11px] font-display tracking-widest text-muted-foreground/30 group-hover:text-primary/50 transition-colors">NEW EXPERIMENT</span>
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground/30 font-display tracking-widest">
        TIP: Ask me to duplicate any existing page into a lab slot to fork and test it safely.
      </p>
    </div>
  );
}

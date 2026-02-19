import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FlaskConical } from 'lucide-react';

// Registry of experiment components — add new ones here as you build them
const EXPERIMENTS: Record<string, { label: string; component: React.FC }> = {
  'experiment-1': {
    label: 'Experiment 1',
    component: () => (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
        <FlaskConical className="w-10 h-10 text-muted-foreground/20" />
        <p className="font-display text-sm tracking-widest text-muted-foreground/40">EMPTY SLOT — BUILD SOMETHING HERE</p>
        <p className="text-xs text-muted-foreground/30 max-w-xs">Ask me to add a UI experiment, duplicate a page, or scaffold a new feature inside this slot.</p>
      </div>
    ),
  },
  'experiment-2': {
    label: 'Experiment 2',
    component: () => (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
        <FlaskConical className="w-10 h-10 text-muted-foreground/20" />
        <p className="font-display text-sm tracking-widest text-muted-foreground/40">EMPTY SLOT — BUILD SOMETHING HERE</p>
        <p className="text-xs text-muted-foreground/30 max-w-xs">Ask me to add a UI experiment, duplicate a page, or scaffold a new feature inside this slot.</p>
      </div>
    ),
  },
  'experiment-3': {
    label: 'Experiment 3',
    component: () => (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
        <FlaskConical className="w-10 h-10 text-muted-foreground/20" />
        <p className="font-display text-sm tracking-widest text-muted-foreground/40">EMPTY SLOT — BUILD SOMETHING HERE</p>
        <p className="text-xs text-muted-foreground/30 max-w-xs">Ask me to add a UI experiment, duplicate a page, or scaffold a new feature inside this slot.</p>
      </div>
    ),
  },
};

export default function LabExperiment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const experiment = id ? EXPERIMENTS[id] : null;

  if (!experiment) {
    return (
      <div className="p-8">
        <button onClick={() => navigate('/admin/lab')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-display tracking-wider mb-8">
          <ArrowLeft className="w-4 h-4" /> BACK TO LAB
        </button>
        <p className="text-muted-foreground font-display tracking-widest text-sm">Experiment not found.</p>
      </div>
    );
  }

  const ExperimentComponent = experiment.component;

  return (
    <div className="p-8">
      {/* Sub-header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/admin/lab')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-display tracking-wider">
          <ArrowLeft className="w-4 h-4" /> LAB
        </button>
        <span className="text-border">/</span>
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-primary" />
          <h1 className="font-display text-sm font-bold tracking-widest">{experiment.label.toUpperCase()}</h1>
        </div>
        <span className="text-[9px] font-display tracking-widest px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/5 text-amber-400/70">ISOLATED</span>
      </div>

      {/* Experiment content */}
      <div className="liquid-glass rounded-xl p-6 min-h-[400px]">
        <ExperimentComponent />
      </div>
    </div>
  );
}

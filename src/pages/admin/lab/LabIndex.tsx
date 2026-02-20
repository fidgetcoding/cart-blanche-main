import { FlaskConical } from 'lucide-react';

export default function LabIndex() {
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <FlaskConical className="w-10 h-10 text-muted-foreground/40" />
      <h2 className="font-display text-lg tracking-widest text-muted-foreground/60">THE LAB</h2>
      <p className="text-sm text-muted-foreground/40 font-display tracking-wider">NO EXPERIMENTS YET</p>
    </div>
  );
}

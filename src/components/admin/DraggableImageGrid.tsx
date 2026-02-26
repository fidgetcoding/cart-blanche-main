import { useState, useRef } from 'react';
import { X, Plus, Loader2, GripVertical } from 'lucide-react';

interface DraggableImageGridProps {
  images: string[];
  onChange: (images: string[]) => void;
  onUpload: () => void;
  uploading: boolean;
  size?: 'sm' | 'md';
}

export function DraggableImageGrid({ images, onChange, onUpload, uploading, size = 'md' }: DraggableImageGridProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const dim = size === 'sm' ? 'w-16 h-16' : 'w-20 h-20';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const removeSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';

  function handleDragStart(e: React.DragEvent, idx: number) {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    // Make drag image semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  }

  function handleDragEnd(e: React.DragEvent) {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      const reordered = [...images];
      const [moved] = reordered.splice(dragIdx, 1);
      reordered.splice(overIdx, 0, moved);
      onChange(reordered);
    }
    setDragIdx(null);
    setOverIdx(null);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(idx);
  }

  return (
    <div ref={containerRef} className="flex flex-wrap gap-2">
      {images.map((img, i) => (
        <div
          key={`${img}-${i}`}
          draggable
          onDragStart={e => handleDragStart(e, i)}
          onDragEnd={handleDragEnd}
          onDragOver={e => handleDragOver(e, i)}
          className={`relative ${dim} rounded-lg overflow-hidden border transition-all cursor-grab active:cursor-grabbing ${
            overIdx === i && dragIdx !== null && dragIdx !== i
              ? 'border-primary ring-2 ring-primary/30 scale-105'
              : 'border-border/50'
          } bg-background/40 group`}
        >
          <img src={img} alt={`Image ${i + 1}`} className="w-full h-full object-cover pointer-events-none" />
          {/* Position badge */}
          {images.length > 1 && (
            <div className="absolute bottom-0.5 left-0.5 bg-background/80 backdrop-blur-sm rounded px-1 py-0.5 flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-2 h-2 text-muted-foreground" />
              <span className="text-[7px] font-display text-muted-foreground font-bold">{i + 1}</span>
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onChange(images.filter((_, idx) => idx !== i)); }}
            className="absolute top-0.5 right-0.5 p-0.5 bg-background/80 rounded-full hover:bg-destructive/80 transition-colors opacity-0 group-hover:opacity-100"
          >
            <X className={removeSize} />
          </button>
        </div>
      ))}
      <button
        onClick={onUpload}
        disabled={uploading}
        className={`${dim} rounded-lg border-2 border-dashed border-border/50 bg-background/20 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-50`}
      >
        {uploading ? <Loader2 className={`${iconSize} text-muted-foreground animate-spin`} /> : <Plus className={`${iconSize} text-muted-foreground/50`} />}
        <span className="text-[8px] font-display tracking-wider text-muted-foreground">{uploading ? 'UPLOADING' : 'ADD'}</span>
      </button>
    </div>
  );
}

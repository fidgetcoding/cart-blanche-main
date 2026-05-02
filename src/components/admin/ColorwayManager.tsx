import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Pencil, GripVertical, ChevronUp, ChevronDown, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import type { Colorway } from '@/data/demo-data';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  colorways: Colorway[];
  onChange: (next: Colorway[]) => void;
}

function makeId() {
  return `col-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function ColorwayManager({ colorways, onChange }: Props) {
  const [editing, setEditing] = useState<{ mode: 'add' } | { mode: 'edit'; colorway: Colorway } | null>(null);
  const [dragSrcIdx, setDragSrcIdx] = useState<number | null>(null);

  function moveUp(idx: number) {
    if (idx <= 0) return;
    const next = [...colorways];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  }
  function moveDown(idx: number) {
    if (idx >= colorways.length - 1) return;
    const next = [...colorways];
    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
    onChange(next);
  }
  function remove(idx: number) {
    onChange(colorways.filter((_, i) => i !== idx));
  }
  function handleDragStart(idx: number) {
    setDragSrcIdx(idx);
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }
  function handleDrop(targetIdx: number) {
    if (dragSrcIdx === null || dragSrcIdx === targetIdx) {
      setDragSrcIdx(null);
      return;
    }
    const next = [...colorways];
    const [moved] = next.splice(dragSrcIdx, 1);
    next.splice(targetIdx, 0, moved);
    onChange(next);
    setDragSrcIdx(null);
  }
  function handleSaveModal(payload: Omit<Colorway, 'id'>, existingId?: string) {
    if (existingId) {
      onChange(colorways.map(c => c.id === existingId ? { ...c, ...payload } : c));
    } else {
      onChange([...colorways, { id: makeId(), ...payload }]);
    }
    setEditing(null);
  }
  function handleDeleteFromModal(id: string) {
    onChange(colorways.filter(c => c.id !== id));
    setEditing(null);
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2 flex-wrap">
        {colorways.map((c, idx) => (
          <div
            key={c.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(idx)}
            className={`inline-flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded border border-border/60 bg-background/40 text-[10px] font-display ${dragSrcIdx === idx ? 'opacity-50' : ''}`}
          >
            <GripVertical className="w-3 h-3 text-muted-foreground/50 cursor-grab" />
            <span
              className="w-4 h-4 rounded-full border border-border/60 bg-cover bg-center"
              style={c.swatch_image
                ? { backgroundImage: `url(${c.swatch_image})` }
                : { backgroundColor: c.hex }}
            />
            <span className="tracking-wider">{c.name.toUpperCase()}</span>
            <button
              type="button"
              onClick={() => moveUp(idx)}
              disabled={idx === 0}
              className="p-0.5 text-muted-foreground/60 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              title="Move up"
            >
              <ChevronUp className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              onClick={() => moveDown(idx)}
              disabled={idx === colorways.length - 1}
              className="p-0.5 text-muted-foreground/60 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              title="Move down"
            >
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              onClick={() => setEditing({ mode: 'edit', colorway: c })}
              className="p-0.5 text-muted-foreground/60 hover:text-foreground"
              title="Edit"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="p-0.5 text-muted-foreground/60 hover:text-destructive"
              title="Remove"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setEditing({ mode: 'add' })}
          className="text-[10px] font-display px-2 py-1 rounded border border-dashed border-border text-muted-foreground transition-colors inline-flex items-center gap-1 hover:bg-secondary"
        >
          <Plus className="w-2.5 h-2.5" /> ADD COLOR
        </button>
      </div>

      <AnimatePresence>
        {editing && (
          <ColorwayEditModal
            initial={editing.mode === 'edit' ? editing.colorway : null}
            onClose={() => setEditing(null)}
            onSave={(payload) => handleSaveModal(payload, editing.mode === 'edit' ? editing.colorway.id : undefined)}
            onDelete={editing.mode === 'edit' ? () => handleDeleteFromModal(editing.colorway.id) : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ───── Edit Modal ─────

interface ModalProps {
  initial: Colorway | null;
  onClose: () => void;
  onSave: (payload: Omit<Colorway, 'id'>) => void;
  onDelete?: () => void;
}

function ColorwayEditModal({ initial, onClose, onSave, onDelete }: ModalProps) {
  const [name, setName] = useState(initial?.name || '');
  const [hex, setHex] = useState(initial?.hex || '#000000');
  const [swatchImage, setSwatchImage] = useState(initial?.swatch_image || '');
  const [useCustomImage, setUseCustomImage] = useState(!!initial?.swatch_image);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `colorways/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('product-media').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('product-media').getPublicUrl(path);
      setSwatchImage(publicUrl);
    } catch (e) {
      console.error('Swatch image upload failed:', e);
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit() {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      hex: useCustomImage ? '#000000' : hex,
      swatch_image: useCustomImage && swatchImage ? swatchImage : undefined,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-card border border-border rounded-xl p-5 space-y-4 shadow-2xl"
      >
        <h3 className="text-sm font-display tracking-widest text-foreground">
          {initial ? 'EDIT COLOR' : 'ADD COLOR'}
        </h3>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/40 border border-border/40">
          <span
            className="w-12 h-12 rounded-full border border-border/60 bg-cover bg-center flex-shrink-0"
            style={useCustomImage && swatchImage
              ? { backgroundImage: `url(${swatchImage})` }
              : { backgroundColor: hex }}
          />
          <div className="min-w-0">
            <p className="text-[9px] font-display tracking-widest text-muted-foreground">PREVIEW</p>
            <p className="text-sm font-display tracking-wider text-foreground truncate">
              {name.trim() || <span className="text-muted-foreground/50 italic">no name</span>}
            </p>
          </div>
        </div>

        <div>
          <label className="text-[9px] font-display tracking-widest text-muted-foreground">NAME</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Black"
            className="w-full mt-1 px-3 py-2 bg-background/40 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={useCustomImage}
            onChange={(e) => setUseCustomImage(e.target.checked)}
            className="rounded"
          />
          <span>Use custom image instead of solid color</span>
        </label>

        {useCustomImage ? (
          <div>
            <label className="text-[9px] font-display tracking-widest text-muted-foreground">SWATCH IMAGE</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full mt-1 px-3 py-2 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
              {uploading ? 'UPLOADING' : (swatchImage ? 'REPLACE IMAGE' : 'UPLOAD IMAGE')}
            </button>
          </div>
        ) : (
          <div>
            <label className="text-[9px] font-display tracking-widest text-muted-foreground">COLOR</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                className="w-12 h-9 rounded cursor-pointer border-0 bg-transparent p-0"
              />
              <input
                type="text"
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                className="flex-1 px-3 py-2 bg-background/40 border border-border/50 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-display tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            SAVE
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-2 border border-border rounded-lg text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

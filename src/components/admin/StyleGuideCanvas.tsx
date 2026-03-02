import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  Position,
  Handle,
  type NodeProps,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DEMO_PRODUCTS, getImageUrl } from '@/data/demo-data';
import type { DemoProduct } from '@/data/demo-data';
import { getBodyZone, type ProductPreset } from '@/lib/pairing-logic';
import { X, ChevronUp, ChevronDown, RotateCcw, Save } from 'lucide-react';

/* ── Types ── */

interface StyleGuideCanvasProps {
  presets: ProductPreset[];
  onPresetsChange: (presets: ProductPreset[]) => void;
  canvasLayout: { positions: Record<string, { x: number; y: number }>; zoom?: number; panX?: number; panY?: number } | null;
  onCanvasLayoutChange: (layout: any) => void;
  onSave: () => void;
  saving: boolean;
}

type BodyZoneGroup = 'TOPS' | 'BOTTOMS' | 'ACCESSORIES';

function classifyGroup(product: DemoProduct): BodyZoneGroup {
  const zone = getBodyZone(product);
  if (zone === 'top') return 'TOPS';
  if (zone === 'bottom') return 'BOTTOMS';
  return 'ACCESSORIES';
}

/* ── Custom Node ── */

function ProductNode({ data, selected }: NodeProps) {
  const d = data as { product: DemoProduct; zone: BodyZoneGroup };
  const borderColor =
    d.zone === 'TOPS' ? 'border-blue-500/30' :
    d.zone === 'BOTTOMS' ? 'border-amber-500/30' :
    'border-zinc-500/30';

  return (
    <div
      className={`relative bg-card rounded-lg border-2 ${borderColor} ${selected ? 'ring-2 ring-primary/50' : ''} p-2 flex flex-col items-center gap-1.5 w-[110px] transition-shadow`}
      style={{ boxShadow: selected ? '0 0 20px hsl(var(--primary) / 0.15)' : undefined }}
    >
      {/* Target handle – left side */}
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-foreground/20 !border-foreground/30" />
      {/* Pairs source – right top */}
      <Handle
        type="source"
        position={Position.Right}
        id="pairs"
        className="!w-3 !h-3 !border-2"
        style={{ top: '35%', background: '#06b6d4', borderColor: '#06b6d4' }}
      />
      {/* Extras source – right bottom */}
      <Handle
        type="source"
        position={Position.Right}
        id="extras"
        className="!w-3 !h-3 !border-2"
        style={{ top: '65%', background: '#f59e0b', borderColor: '#f59e0b' }}
      />
      <img
        src={getImageUrl(d.product.images[0], 'thumb')}
        alt={d.product.title}
        className="w-[80px] h-[80px] rounded object-cover"
      />
      <p className="text-[10px] font-display tracking-wide text-center leading-tight truncate w-full">{d.product.title}</p>
      <p className="text-[9px] text-muted-foreground">${d.product.price}</p>
    </div>
  );
}

const nodeTypes = { product: ProductNode };

/* ── Helpers ── */

function getDefaultPositions(): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const cols: Record<BodyZoneGroup, DemoProduct[]> = { TOPS: [], BOTTOMS: [], ACCESSORIES: [] };
  DEMO_PRODUCTS.forEach(p => cols[classifyGroup(p)].push(p));

  const colX: Record<BodyZoneGroup, number> = { TOPS: 0, BOTTOMS: 300, ACCESSORIES: 600 };
  (Object.keys(cols) as BodyZoneGroup[]).forEach(group => {
    cols[group].forEach((p, i) => {
      positions[p.id] = { x: colX[group], y: i * 160 };
    });
  });
  return positions;
}

function presetsToEdges(presets: ProductPreset[]): Edge[] {
  const edges: Edge[] = [];
  presets.forEach(preset => {
    preset.pairs.forEach((targetId, i) => {
      edges.push({
        id: `${preset.anchorProductId}-pairs-${targetId}`,
        source: preset.anchorProductId,
        target: targetId,
        sourceHandle: 'pairs',
        style: { stroke: '#06b6d4', strokeWidth: 2 },
        type: 'default',
      });
    });
    preset.extras.forEach((targetId, i) => {
      edges.push({
        id: `${preset.anchorProductId}-extras-${targetId}`,
        source: preset.anchorProductId,
        target: targetId,
        sourceHandle: 'extras',
        style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '6 4' },
        type: 'default',
      });
    });
  });
  return edges;
}

function edgesToPresets(edges: Edge[]): ProductPreset[] {
  const map = new Map<string, { pairs: string[]; extras: string[] }>();
  edges.forEach(e => {
    if (!map.has(e.source)) map.set(e.source, { pairs: [], extras: [] });
    const entry = map.get(e.source)!;
    if (e.sourceHandle === 'pairs') entry.pairs.push(e.target);
    else if (e.sourceHandle === 'extras') entry.extras.push(e.target);
  });
  const presets: ProductPreset[] = [];
  map.forEach((val, anchorProductId) => {
    presets.push({ anchorProductId, pairs: val.pairs, extras: val.extras });
  });
  return presets;
}

/* ── Main Component ── */

export default function StyleGuideCanvas({
  presets,
  onPresetsChange,
  canvasLayout,
  onCanvasLayoutChange,
  onSave,
  saving,
}: StyleGuideCanvasProps) {
  const positions = canvasLayout?.positions ?? getDefaultPositions();

  const initialNodes: Node[] = useMemo(() =>
    DEMO_PRODUCTS.map(p => ({
      id: p.id,
      type: 'product',
      position: positions[p.id] ?? { x: 0, y: 0 },
      data: { product: p, zone: classifyGroup(p) },
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const initialEdges = useMemo(() => presetsToEdges(presets), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Sync edges back to presets when they change
  const syncPresetsFromEdges = useCallback((currentEdges: Edge[]) => {
    onPresetsChange(edgesToPresets(currentEdges));
  }, [onPresetsChange]);

  const onConnect = useCallback((connection: Connection) => {
    const handle = connection.sourceHandle;
    const style = handle === 'pairs'
      ? { stroke: '#06b6d4', strokeWidth: 2 }
      : { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '6 4' };

    setEdges(eds => {
      const newEdges = addEdge({ ...connection, style, type: 'default' }, eds);
      syncPresetsFromEdges(newEdges);
      return newEdges;
    });
  }, [setEdges, syncPresetsFromEdges]);

  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChange(changes);
    // Defer sync to next tick so edges state is updated
    setTimeout(() => {
      setEdges(eds => {
        syncPresetsFromEdges(eds);
        return eds;
      });
    }, 0);
  }, [onEdgesChange, setEdges, syncPresetsFromEdges]);

  const handleNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const autoArrange = useCallback(() => {
    const defaultPos = getDefaultPositions();
    setNodes(nds => nds.map(n => ({ ...n, position: defaultPos[n.id] ?? n.position })));
  }, [setNodes]);

  const handleSave = useCallback(() => {
    const posMap: Record<string, { x: number; y: number }> = {};
    nodes.forEach(n => { posMap[n.id] = n.position; });
    onCanvasLayoutChange({ positions: posMap });
    onSave();
  }, [nodes, onCanvasLayoutChange, onSave]);

  // Sidebar helpers
  const selectedProduct = selectedNodeId ? DEMO_PRODUCTS.find(p => p.id === selectedNodeId) : null;
  const selectedPreset = selectedNodeId ? edgesToPresets(edges).find(p => p.anchorProductId === selectedNodeId) : null;

  const removeConnection = useCallback((targetId: string, type: 'pairs' | 'extras') => {
    setEdges(eds => {
      const filtered = eds.filter(e => !(e.source === selectedNodeId && e.target === targetId && e.sourceHandle === type));
      syncPresetsFromEdges(filtered);
      return filtered;
    });
  }, [selectedNodeId, setEdges, syncPresetsFromEdges]);

  const moveItem = useCallback((type: 'pairs' | 'extras', index: number, dir: -1 | 1) => {
    const items = type === 'pairs' ? [...(selectedPreset?.pairs ?? [])] : [...(selectedPreset?.extras ?? [])];
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= items.length) return;
    [items[index], items[newIndex]] = [items[newIndex], items[index]];

    // Rebuild edges for this source + type
    setEdges(eds => {
      const otherEdges = eds.filter(e => !(e.source === selectedNodeId && e.sourceHandle === type));
      const style = type === 'pairs'
        ? { stroke: '#06b6d4', strokeWidth: 2 }
        : { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '6 4' };
      const newEdges = items.map(targetId => ({
        id: `${selectedNodeId}-${type}-${targetId}`,
        source: selectedNodeId!,
        target: targetId,
        sourceHandle: type,
        style,
        type: 'default' as const,
      }));
      const result = [...otherEdges, ...newEdges];
      syncPresetsFromEdges(result);
      return result;
    });
  }, [selectedNodeId, selectedPreset, setEdges, syncPresetsFromEdges]);

  return (
    <div className="flex-1 flex relative">
      <div className="flex-1 relative">
        {/* Floating toolbar */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <button
            onClick={autoArrange}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-md text-[10px] font-display tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            AUTO ARRANGE
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-[10px] font-display tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'SAVING...' : 'SAVE'}
          </button>
          {/* Legend */}
          <div className="flex items-center gap-3 ml-3 text-[9px] text-muted-foreground font-display tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-[#06b6d4] rounded" />
              PAIRS
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 rounded" style={{ background: '#f59e0b', backgroundImage: 'repeating-linear-gradient(90deg, #f59e0b 0 4px, transparent 4px 7px)' }} />
              EXTRAS
            </span>
          </div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          fitView
          className="!bg-background"
          deleteKeyCode={['Backspace', 'Delete']}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--foreground) / 0.05)" />
          <Controls className="!bg-card !border-border !rounded-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
          <MiniMap
            className="!bg-card !border-border !rounded-lg"
            nodeColor="hsl(var(--foreground) / 0.2)"
            maskColor="hsl(var(--background) / 0.8)"
          />
        </ReactFlow>
      </div>

      {/* Selected node sidebar */}
      {selectedProduct && (
        <div className="w-[280px] border-l border-border bg-card overflow-y-auto flex-shrink-0 animate-slide-in-right">
          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={getImageUrl(selectedProduct.images[0], 'thumb')}
                  alt={selectedProduct.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div>
                  <p className="font-display text-xs tracking-wide font-bold">{selectedProduct.title}</p>
                  <p className="text-[11px] text-muted-foreground">${selectedProduct.price}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[8px] font-display tracking-widest bg-secondary rounded text-muted-foreground">
                    {classifyGroup(selectedProduct)}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedNodeId(null)} className="p-1 hover:bg-secondary rounded transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Pairs */}
            <div>
              <p className="text-[9px] font-display tracking-[0.2em] text-[#06b6d4] mb-2">PAIRS</p>
              {(selectedPreset?.pairs ?? []).length === 0 ? (
                <p className="text-[10px] text-muted-foreground/50 italic">No pairs connections</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {(selectedPreset?.pairs ?? []).map((id, i) => {
                    const p = DEMO_PRODUCTS.find(x => x.id === id);
                    if (!p) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-secondary/30">
                        <img src={getImageUrl(p.images[0], 'thumb')} alt={p.title} className="w-7 h-7 rounded object-cover" />
                        <span className="text-[10px] font-display tracking-wide flex-1 truncate">{p.title}</span>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => moveItem('pairs', i, -1)} className="p-0.5 hover:bg-secondary rounded"><ChevronUp className="w-3 h-3 text-muted-foreground" /></button>
                          <button onClick={() => moveItem('pairs', i, 1)} className="p-0.5 hover:bg-secondary rounded"><ChevronDown className="w-3 h-3 text-muted-foreground" /></button>
                          <button onClick={() => removeConnection(id, 'pairs')} className="p-0.5 hover:bg-destructive/20 rounded"><X className="w-3 h-3 text-muted-foreground" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Extras */}
            <div>
              <p className="text-[9px] font-display tracking-[0.2em] text-[#f59e0b] mb-2">EXTRAS</p>
              {(selectedPreset?.extras ?? []).length === 0 ? (
                <p className="text-[10px] text-muted-foreground/50 italic">No extras connections</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {(selectedPreset?.extras ?? []).map((id, i) => {
                    const p = DEMO_PRODUCTS.find(x => x.id === id);
                    if (!p) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-secondary/30">
                        <img src={getImageUrl(p.images[0], 'thumb')} alt={p.title} className="w-7 h-7 rounded object-cover" />
                        <span className="text-[10px] font-display tracking-wide flex-1 truncate">{p.title}</span>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => moveItem('extras', i, -1)} className="p-0.5 hover:bg-secondary rounded"><ChevronUp className="w-3 h-3 text-muted-foreground" /></button>
                          <button onClick={() => moveItem('extras', i, 1)} className="p-0.5 hover:bg-secondary rounded"><ChevronDown className="w-3 h-3 text-muted-foreground" /></button>
                          <button onClick={() => removeConnection(id, 'extras')} className="p-0.5 hover:bg-destructive/20 rounded"><X className="w-3 h-3 text-muted-foreground" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

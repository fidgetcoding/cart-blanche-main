import { useState, useCallback, useMemo, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
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
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DEMO_PRODUCTS, getImageUrl } from '@/data/demo-data';
import type { DemoProduct } from '@/data/demo-data';
import { getBodyZone, type ProductPreset } from '@/lib/pairing-logic';
import { X, ChevronUp, ChevronDown, Save } from 'lucide-react';

/* ── Types ── */

export interface StyleGuideCanvasHandle {
  addProduct: (p: DemoProduct) => void;
  selectProduct: (id: string) => void;
}

interface StyleGuideCanvasProps {
  presets: ProductPreset[];
  onPresetsChange: (presets: ProductPreset[]) => void;
  canvasLayout: { positions: Record<string, { x: number; y: number }>; nodeIds?: string[] } | null;
  onCanvasLayoutChange: (layout: any) => void;
  onSave: () => void;
  saving: boolean;
  onCanvasNodeIdsChange: (ids: Set<string>) => void;
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
      {/* Single target handle – left side */}
      <Handle type="target" position={Position.Left} id="target" className="!w-3 !h-3 !bg-foreground/20 !border-foreground/30" />
      {/* Single source handle – right side */}
      <Handle type="source" position={Position.Right} id="source" className="!w-3 !h-3 !bg-foreground/20 !border-foreground/30" />
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

function presetsToEdges(presets: ProductPreset[]): Edge[] {
  const edges: Edge[] = [];
  presets.forEach(preset => {
    preset.pairs.forEach(targetId => {
      edges.push({
        id: `pairs-${preset.anchorProductId}-${targetId}`,
        source: preset.anchorProductId,
        target: targetId,
        sourceHandle: 'source',
        targetHandle: 'target',
        style: { stroke: '#60a5fa', strokeWidth: 2, filter: 'drop-shadow(0 0 4px rgba(96, 165, 250, 0.5))' },
        type: 'default',
        data: { type: 'pairs' },
      });
    });
    preset.extras.forEach(targetId => {
      edges.push({
        id: `extras-${preset.anchorProductId}-${targetId}`,
        source: preset.anchorProductId,
        target: targetId,
        sourceHandle: 'source',
        targetHandle: 'target',
        style: { stroke: '#f472b6', strokeWidth: 2, strokeDasharray: '6 4', filter: 'drop-shadow(0 0 4px rgba(244, 114, 182, 0.5))' },
        type: 'default',
        data: { type: 'extras' },
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
    const edgeType = (e.data as any)?.type;
    if (edgeType === 'pairs') entry.pairs.push(e.target);
    else if (edgeType === 'extras') entry.extras.push(e.target);
  });
  const presets: ProductPreset[] = [];
  map.forEach((val, anchorProductId) => {
    presets.push({ anchorProductId, pairs: val.pairs, extras: val.extras });
  });
  return presets;
}

/* ── Inner component (needs ReactFlow context) ── */

const StyleGuideCanvasInner = forwardRef<StyleGuideCanvasHandle, StyleGuideCanvasProps>(({
  presets,
  onPresetsChange,
  canvasLayout,
  onCanvasLayoutChange,
  onSave,
  saving,
  onCanvasNodeIdsChange,
}, ref) => {
  const { fitView, setCenter } = useReactFlow();
  const nodeCountRef = useRef(0);

  // Initialize from saved layout
  const initialNodes: Node[] = useMemo(() => {
    if (!canvasLayout?.nodeIds || !canvasLayout.positions) return [];
    return canvasLayout.nodeIds
      .map(id => {
        const product = DEMO_PRODUCTS.find(p => p.id === id);
        if (!product) return null;
        return {
          id: product.id,
          type: 'product' as const,
          position: canvasLayout.positions[id] ?? { x: 0, y: 0 },
          data: { product, zone: classifyGroup(product) },
        };
      })
      .filter(Boolean) as Node[];
  }, []);

  const initialEdges = useMemo(() => {
    // Only include edges for nodes that are on the canvas
    const nodeIdSet = new Set(canvasLayout?.nodeIds ?? []);
    return presetsToEdges(presets).filter(e => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Sync node IDs to parent
  useEffect(() => {
    const ids = new Set(nodes.map(n => n.id));
    nodeCountRef.current = ids.size;
    onCanvasNodeIdsChange(ids);
  }, [nodes, onCanvasNodeIdsChange]);

  const syncPresetsFromEdges = useCallback((currentEdges: Edge[]) => {
    onPresetsChange(edgesToPresets(currentEdges));
  }, [onPresetsChange]);

  // Auto-detect pairs vs extras from body zone
  const onConnect = useCallback((connection: Connection) => {
    const sourceProduct = DEMO_PRODUCTS.find(p => p.id === connection.source);
    const targetProduct = DEMO_PRODUCTS.find(p => p.id === connection.target);
    if (!sourceProduct || !targetProduct) return;

    const sourceZone = getBodyZone(sourceProduct);
    const targetZone = getBodyZone(targetProduct);
    const connectionType = sourceZone === targetZone ? 'extras' : 'pairs';

    const newEdge = {
      ...connection,
      id: `${connectionType}-${connection.source}-${connection.target}`,
      style: connectionType === 'pairs'
        ? { stroke: '#60a5fa', strokeWidth: 2, filter: 'drop-shadow(0 0 4px rgba(96, 165, 250, 0.5))' }
        : { stroke: '#f472b6', strokeWidth: 2, strokeDasharray: '6 4', filter: 'drop-shadow(0 0 4px rgba(244, 114, 182, 0.5))' },
      data: { type: connectionType },
      type: 'default' as const,
    };

    setEdges(eds => {
      const newEdges = addEdge(newEdge as Edge, eds);
      syncPresetsFromEdges(newEdges);
      return newEdges;
    });
  }, [setEdges, syncPresetsFromEdges]);

  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChange(changes);
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

  const handleSave = useCallback(() => {
    const posMap: Record<string, { x: number; y: number }> = {};
    const nodeIds: string[] = [];
    nodes.forEach(n => {
      posMap[n.id] = n.position;
      nodeIds.push(n.id);
    });
    onCanvasLayoutChange({ positions: posMap, nodeIds });
    onSave();
  }, [nodes, onCanvasLayoutChange, onSave]);

  // Imperative handle for parent to add/select products
  useImperativeHandle(ref, () => ({
    addProduct: (product: DemoProduct) => {
      const count = nodeCountRef.current;
      const col = count % 4;
      const row = Math.floor(count / 4);
      const newNode: Node = {
        id: product.id,
        type: 'product',
        position: { x: col * 160 + 50, y: row * 170 + 50 },
        data: { product, zone: classifyGroup(product) },
      };
      setNodes(nds => [...nds, newNode]);
      setSelectedNodeId(product.id);
    },
    selectProduct: (id: string) => {
      setSelectedNodeId(id);
      // Pan to the node
      const node = nodes.find(n => n.id === id);
      if (node) {
        setCenter(node.position.x + 55, node.position.y + 60, { zoom: 1, duration: 400 });
      }
    },
  }), [nodes, setNodes, setCenter]);

  // Sidebar helpers
  const selectedProduct = selectedNodeId ? DEMO_PRODUCTS.find(p => p.id === selectedNodeId) : null;
  const selectedPreset = selectedNodeId ? edgesToPresets(edges).find(p => p.anchorProductId === selectedNodeId) : null;

  const removeConnection = useCallback((targetId: string, type: 'pairs' | 'extras') => {
    setEdges(eds => {
      const filtered = eds.filter(e => !(e.source === selectedNodeId && e.target === targetId && (e.data as any)?.type === type));
      syncPresetsFromEdges(filtered);
      return filtered;
    });
  }, [selectedNodeId, setEdges, syncPresetsFromEdges]);

  const moveItem = useCallback((type: 'pairs' | 'extras', index: number, dir: -1 | 1) => {
    const items = type === 'pairs' ? [...(selectedPreset?.pairs ?? [])] : [...(selectedPreset?.extras ?? [])];
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= items.length) return;
    [items[index], items[newIndex]] = [items[newIndex], items[index]];

    setEdges(eds => {
      const otherEdges = eds.filter(e => !(e.source === selectedNodeId && (e.data as any)?.type === type));
      const style = type === 'pairs'
        ? { stroke: '#60a5fa', strokeWidth: 2, filter: 'drop-shadow(0 0 4px rgba(96, 165, 250, 0.5))' }
        : { stroke: '#f472b6', strokeWidth: 2, strokeDasharray: '6 4', filter: 'drop-shadow(0 0 4px rgba(244, 114, 182, 0.5))' };
      const newEdges = items.map(targetId => ({
        id: `${type}-${selectedNodeId}-${targetId}`,
        source: selectedNodeId!,
        target: targetId,
        sourceHandle: 'source',
        targetHandle: 'target',
        style,
        type: 'default' as const,
        data: { type },
      }));
      const result = [...otherEdges, ...newEdges] as Edge[];
      syncPresetsFromEdges(result);
      return result;
    });
  }, [selectedNodeId, selectedPreset, setEdges, syncPresetsFromEdges]);

  const removeNodeFromCanvas = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => {
      const filtered = eds.filter(e => e.source !== nodeId && e.target !== nodeId);
      syncPresetsFromEdges(filtered);
      return filtered;
    });
    setSelectedNodeId(null);
  }, [setNodes, setEdges, syncPresetsFromEdges]);

  return (
    <div className="flex-1 flex relative h-full [&_.react-flow]:!bg-[#0a0a0a] [&_.react-flow__pane]:!bg-[#0a0a0a]">
      <div className="flex-1 relative">
        {/* Floating toolbar */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
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
              <span className="w-5 h-0.5 rounded" style={{ background: '#60a5fa', boxShadow: '0 0 6px rgba(96, 165, 250, 0.6)' }} />
              PAIRS
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 rounded" style={{ background: '#f472b6', backgroundImage: 'repeating-linear-gradient(90deg, #f472b6 0 4px, transparent 4px 7px)', boxShadow: '0 0 6px rgba(244, 114, 182, 0.6)' }} />
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
          style={{ background: '#0a0a0a' }}
          deleteKeyCode={['Backspace', 'Delete']}
          fitView={nodes.length > 0}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--foreground) / 0.05)" />
          <Controls className="!bg-card !border-border !rounded-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
          <MiniMap
            className="!bg-card !border-border !rounded-lg"
            nodeColor="hsl(var(--foreground) / 0.2)"
            maskColor="hsl(var(--background) / 0.8)"
          />
        </ReactFlow>

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-muted-foreground/50 font-display tracking-wider">
              Click products in the sidebar to add them to the canvas
            </p>
          </div>
        )}
      </div>

      {/* Selected node sidebar */}
      {selectedProduct && (
        <div className="w-[280px] border-l border-border bg-card overflow-y-auto flex-shrink-0">
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
              <div className="flex items-center gap-1">
                <button
                  onClick={() => removeNodeFromCanvas(selectedProduct.id)}
                  className="p-1 hover:bg-destructive/20 rounded transition-colors"
                  title="Remove from canvas"
                >
                  <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>

            {/* Pairs */}
            <div>
              <p className="text-[9px] font-display tracking-[0.2em] text-[#60a5fa] mb-2">PAIRS</p>
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
              <p className="text-[9px] font-display tracking-[0.2em] text-[#f472b6] mb-2">EXTRAS</p>
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
});

StyleGuideCanvasInner.displayName = 'StyleGuideCanvasInner';

/* ── Wrapper with ReactFlowProvider ── */

const StyleGuideCanvas = forwardRef<StyleGuideCanvasHandle, StyleGuideCanvasProps>((props, ref) => (
  <ReactFlowProvider>
    <StyleGuideCanvasInner ref={ref} {...props} />
  </ReactFlowProvider>
));

StyleGuideCanvas.displayName = 'StyleGuideCanvas';

export default StyleGuideCanvas;

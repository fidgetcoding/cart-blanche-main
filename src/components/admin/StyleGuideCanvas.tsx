import { useState, useCallback, useMemo, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  Position,
  Handle,
  type NodeProps,
  type EdgeProps,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  getBezierPath,
  BaseEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DEMO_PRODUCTS, getImageUrl } from '@/data/demo-data';
import type { DemoProduct } from '@/data/demo-data';
import { getBodyZone, type ProductPreset } from '@/lib/pairing-logic';
import { X, ChevronUp, ChevronDown, Save, Plus } from 'lucide-react';

/* ── Constants ── */
const BLANK_NODE_ID = '__blank__';
const PAIRS_STYLE = { stroke: '#60a5fa', strokeWidth: 2, filter: 'drop-shadow(0 0 4px rgba(96, 165, 250, 0.5))' };
const EXTRAS_STYLE = { stroke: '#f472b6', strokeWidth: 2, strokeDasharray: '6 4', filter: 'drop-shadow(0 0 4px rgba(244, 114, 182, 0.5))' };
const PENDING_STYLE = { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 2, strokeDasharray: '4 4' };

/* ── Types ── */

export interface StyleGuideCanvasHandle {
  addProduct: (p: DemoProduct) => void;
  addProductAtPosition: (p: DemoProduct, screenX: number, screenY: number) => void;
  selectProduct: (id: string) => void;
  fillBlankNode: (p: DemoProduct) => void;
  hasBlankNode: () => boolean;
}

interface StyleGuideCanvasProps {
  presets: ProductPreset[];
  onPresetsChange: (presets: ProductPreset[]) => void;
  canvasLayout: { positions: Record<string, { x: number; y: number }>; nodeIds?: string[] } | null;
  onCanvasLayoutChange: (layout: any) => void;
  onSave: () => void;
  saving: boolean;
  onCanvasNodeIdsChange: (ids: Set<string>) => void;
  onBlankNodeChange: (active: boolean) => void;
}

type BodyZoneGroup = 'TOPS' | 'BOTTOMS' | 'ACCESSORIES';

function classifyGroup(product: DemoProduct): BodyZoneGroup {
  const zone = getBodyZone(product);
  if (zone === 'top') return 'TOPS';
  if (zone === 'bottom') return 'BOTTOMS';
  return 'ACCESSORIES';
}

/* ── Custom Edge with offset for bidirectional connections ── */

function OffsetEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style, data, markerEnd, id,
}: EdgeProps) {
  const offset = (data as any)?.offset || 0;

  const [path] = getBezierPath({
    sourceX,
    sourceY: sourceY + offset,
    targetX,
    targetY: targetY + offset,
    sourcePosition,
    targetPosition,
  });

  return <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />;
}

const edgeTypes = { offset: OffsetEdge };

/* ── Custom Node ── */

function ProductNode({ data, selected }: NodeProps) {
  const d = data as { product?: DemoProduct; zone?: BodyZoneGroup; isBlank?: boolean; onDelete?: (id: string) => void };

  if (d.isBlank) {
    return (
      <div className="w-[120px] h-[130px] bg-foreground/3 border-2 border-dashed border-foreground/15 rounded-lg p-4 flex flex-col items-center justify-center gap-2 animate-scale-in">
        <Handle type="target" position={Position.Left} id="target" className="!w-2.5 !h-2.5 !bg-foreground/20 !border-foreground/20" />
        <Handle type="source" position={Position.Right} id="source" className="!w-2.5 !h-2.5 !bg-foreground/20 !border-foreground/20" />
        <Plus className="w-6 h-6 text-muted-foreground/40" />
        <span className="text-[8px] text-muted-foreground/50 font-display tracking-widest">SELECT PRODUCT FROM PANEL</span>
      </div>
    );
  }

  if (!d.product) return null;

  const borderColor =
    d.zone === 'TOPS' ? 'border-blue-500/30' :
    d.zone === 'BOTTOMS' ? 'border-amber-500/30' :
    'border-zinc-500/30';

  return (
    <div
      className={`relative rounded-lg border-2 ${borderColor} ${selected ? 'ring-2 ring-primary/50' : ''} p-2 flex flex-col items-center gap-1.5 w-[120px] transition-shadow group`}
      style={{
        background: '#141414',
        boxShadow: selected ? '0 0 20px hsl(var(--primary) / 0.15)' : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} id="target" className="!w-3 !h-3 !bg-foreground/20 !border-foreground/30" />
      <Handle type="source" position={Position.Right} id="source" className="!w-3 !h-3 !bg-foreground/20 !border-foreground/30" />
      {/* Hover delete button */}
      {d.onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); d.onDelete!(d.product!.id); }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      <img
        src={getImageUrl(d.product.images[0], 'thumb')}
        alt={d.product.title}
        className="w-[80px] h-[80px] rounded object-cover"
        draggable={false}
      />
      <p className="text-[10px] font-display tracking-wide text-center leading-tight truncate w-full" style={{ color: '#e5e5e5' }}>{d.product.title}</p>
      <p className="text-[9px]" style={{ color: '#888' }}>${d.product.price}</p>
    </div>
  );
}

const nodeTypes = { product: ProductNode };

/* ── Helpers ── */

function presetsToEdges(presets: ProductPreset[]): Edge[] {
  const edges: Edge[] = [];
  const edgeSet = new Set<string>(); // track "source-target" keys

  presets.forEach(preset => {
    const allTargets = [
      ...preset.pairs.map(id => ({ id, type: 'pairs' as const })),
      ...preset.extras.map(id => ({ id, type: 'extras' as const })),
    ];

    allTargets.forEach(({ id: targetId, type }) => {
      const key = `${preset.anchorProductId}-${targetId}`;
      const reverseKey = `${targetId}-${preset.anchorProductId}`;
      const hasReverse = edgeSet.has(reverseKey);
      edgeSet.add(key);

      const style = type === 'pairs' ? PAIRS_STYLE : EXTRAS_STYLE;

      edges.push({
        id: `${type}-${key}`,
        source: preset.anchorProductId,
        target: targetId,
        sourceHandle: 'source',
        targetHandle: 'target',
        style,
        type: 'offset',
        data: { type, offset: hasReverse ? -15 : 0 },
      });

      // If reverse already exists, update its offset
      if (hasReverse) {
        const reverseEdge = edges.find(e => e.id.endsWith(reverseKey));
        if (reverseEdge) {
          reverseEdge.data = { ...reverseEdge.data, offset: 15 };
        }
      }
    });
  });

  return edges;
}

function edgesToPresets(edges: Edge[]): ProductPreset[] {
  const map = new Map<string, { pairs: string[]; extras: string[] }>();
  edges.forEach(e => {
    if (e.source === BLANK_NODE_ID || e.target === BLANK_NODE_ID) return;
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
  onBlankNodeChange,
}, ref) => {
  const { fitView, setCenter, screenToFlowPosition } = useReactFlow();
  const nodeCountRef = useRef(0);
  // Track pending connection source for blank node flow
  const pendingConnectionSourceRef = useRef<string | null>(null);

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
          data: { product, zone: classifyGroup(product), onDelete: undefined as any },
        };
      })
      .filter(Boolean) as Node[];
  }, []);

  const initialEdges = useMemo(() => {
    const nodeIdSet = new Set(canvasLayout?.nodeIds ?? []);
    return presetsToEdges(presets).filter(e => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Keep onDelete callback fresh on all nodes
  const removeNodeFromCanvas = useCallback((nodeId: string) => {
    if (nodeId === BLANK_NODE_ID) {
      onBlankNodeChange(false);
      pendingConnectionSourceRef.current = null;
    }
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => {
      const filtered = eds.filter(e => e.source !== nodeId && e.target !== nodeId);
      syncPresetsFromEdges(filtered);
      return filtered;
    });
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [selectedNodeId]);

  // Inject onDelete into node data
  useEffect(() => {
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, onDelete: removeNodeFromCanvas },
    })));
  }, [removeNodeFromCanvas]);

  // Sync node IDs to parent (exclude blank node)
  useEffect(() => {
    const ids = new Set(nodes.filter(n => n.id !== BLANK_NODE_ID).map(n => n.id));
    nodeCountRef.current = ids.size;
    onCanvasNodeIdsChange(ids);
  }, [nodes, onCanvasNodeIdsChange]);

  const syncPresetsFromEdges = useCallback((currentEdges: Edge[]) => {
    onPresetsChange(edgesToPresets(currentEdges));
  }, [onPresetsChange]);

  const hasBlankNode = useCallback(() => {
    return nodes.some(n => n.id === BLANK_NODE_ID);
  }, [nodes]);

  const createBlankNode = useCallback((position: { x: number; y: number }, pendingSourceId?: string) => {
    // Only one blank node at a time
    if (nodes.some(n => n.id === BLANK_NODE_ID)) {
      // Pan to existing blank node
      const existing = nodes.find(n => n.id === BLANK_NODE_ID);
      if (existing) {
        setCenter(existing.position.x + 60, existing.position.y + 65, { zoom: 1, duration: 400 });
      }
      return;
    }
    
    const newNode: Node = {
      id: BLANK_NODE_ID,
      type: 'product',
      position,
      data: { isBlank: true, onDelete: removeNodeFromCanvas },
    };
    setNodes(nds => [...nds, newNode]);
    onBlankNodeChange(true);

    if (pendingSourceId) {
      pendingConnectionSourceRef.current = pendingSourceId;
      // Add a pending gray edge
      const pendingEdge: Edge = {
        id: `pending-${pendingSourceId}-blank`,
        source: pendingSourceId,
        target: BLANK_NODE_ID,
        sourceHandle: 'source',
        targetHandle: 'target',
        style: PENDING_STYLE,
        type: 'default',
        data: { type: 'pending' },
      };
      setEdges(eds => [...eds, pendingEdge]);
    }
  }, [nodes, setNodes, setEdges, setCenter, removeNodeFromCanvas, onBlankNodeChange]);

  const fillBlankNode = useCallback((product: DemoProduct) => {
    const blankNode = nodes.find(n => n.id === BLANK_NODE_ID);
    if (!blankNode) return;

    // Replace blank node with filled product node
    setNodes(nds => nds.map(n => {
      if (n.id !== BLANK_NODE_ID) return n;
      return {
        ...n,
        id: product.id,
        data: { product, zone: classifyGroup(product), onDelete: removeNodeFromCanvas },
      };
    }));

    // Complete pending connection if exists
    const pendingSourceId = pendingConnectionSourceRef.current;
    setEdges(eds => {
      // Remove pending edge
      let newEdges = eds.filter(e => !(e.data as any)?.type || (e.data as any).type !== 'pending');
      // Also update any edges referencing the blank node ID
      newEdges = newEdges.map(e => {
        if (e.target === BLANK_NODE_ID) return { ...e, target: product.id, id: e.id.replace(BLANK_NODE_ID, product.id) };
        if (e.source === BLANK_NODE_ID) return { ...e, source: product.id, id: e.id.replace(BLANK_NODE_ID, product.id) };
        return e;
      });

      if (pendingSourceId) {
        const sourceProduct = DEMO_PRODUCTS.find(p => p.id === pendingSourceId);
        if (sourceProduct) {
          const sourceZone = getBodyZone(sourceProduct);
          const targetZone = getBodyZone(product);
          const connectionType = sourceZone === targetZone ? 'extras' : 'pairs';
          const style = connectionType === 'pairs' ? PAIRS_STYLE : EXTRAS_STYLE;
          const newEdge: Edge = {
            id: `${connectionType}-${pendingSourceId}-${product.id}`,
            source: pendingSourceId,
            target: product.id,
            sourceHandle: 'source',
            targetHandle: 'target',
            style,
            type: 'offset',
            data: { type: connectionType, offset: 0 },
          };
          newEdges = addEdge(newEdge, newEdges);
        }
      }

      syncPresetsFromEdges(newEdges);
      return newEdges;
    });

    pendingConnectionSourceRef.current = null;
    onBlankNodeChange(false);
    setSelectedNodeId(product.id);
  }, [nodes, setNodes, setEdges, syncPresetsFromEdges, removeNodeFromCanvas, onBlankNodeChange]);

  // Auto-detect pairs vs extras from body zone
  const onConnect = useCallback((connection: Connection) => {
    const sourceProduct = DEMO_PRODUCTS.find(p => p.id === connection.source);
    const targetProduct = DEMO_PRODUCTS.find(p => p.id === connection.target);
    if (!sourceProduct || !targetProduct) return;

    const sourceZone = getBodyZone(sourceProduct);
    const targetZone = getBodyZone(targetProduct);
    const connectionType = sourceZone === targetZone ? 'extras' : 'pairs';

    // Check if reverse edge exists for offset
    const reverseKey = `${connection.target}-${connection.source}`;

    const newEdge = {
      ...connection,
      id: `${connectionType}-${connection.source}-${connection.target}`,
      style: connectionType === 'pairs' ? PAIRS_STYLE : EXTRAS_STYLE,
      data: { type: connectionType, offset: 0 },
      type: 'offset' as const,
    };

    setEdges(eds => {
      // Check if reverse edge exists
      const hasReverse = eds.some(e =>
        e.source === connection.target && e.target === connection.source
      );

      let newEdges = addEdge(
        { ...newEdge, data: { ...newEdge.data, offset: hasReverse ? -15 : 0 } } as Edge,
        eds,
      );

      // If reverse exists, update its offset
      if (hasReverse) {
        newEdges = newEdges.map(e =>
          e.source === connection.target && e.target === connection.source
            ? { ...e, data: { ...e.data, offset: 15 } }
            : e
        );
      }

      syncPresetsFromEdges(newEdges);
      return newEdges;
    });
  }, [setEdges, syncPresetsFromEdges]);

  // Drag-to-empty: create blank node at drop position
  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent, connectionState: any) => {
    if (connectionState?.isValid) return;
    const sourceId = connectionState?.fromNode?.id;
    if (!sourceId) return;

    const clientX = 'clientX' in event ? event.clientX : (event as TouchEvent).changedTouches?.[0]?.clientX;
    const clientY = 'clientY' in event ? event.clientY : (event as TouchEvent).changedTouches?.[0]?.clientY;
    if (clientX == null || clientY == null) return;

    const position = screenToFlowPosition({ x: clientX, y: clientY });
    createBlankNode(position, sourceId);
  }, [screenToFlowPosition, createBlankNode]);

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
    if (node.id === BLANK_NODE_ID) return;
    setSelectedNodeId(node.id);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Double-click on pane to create blank node
  const handleCanvasDoubleClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('.react-flow__node') || target.closest('[data-toolbar]')) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    createBlankNode(position);
  }, [screenToFlowPosition, createBlankNode]);

  // Drag-and-drop from sidebar
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const productId = event.dataTransfer.getData('application/product-id');
    if (!productId) return;
    const product = DEMO_PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    // Don't add duplicates
    if (nodes.some(n => n.id === productId)) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const newNode: Node = {
      id: product.id,
      type: 'product',
      position,
      data: { product, zone: classifyGroup(product), onDelete: removeNodeFromCanvas },
    };
    setNodes(nds => [...nds, newNode]);
    setSelectedNodeId(product.id);
  }, [screenToFlowPosition, nodes, setNodes, removeNodeFromCanvas]);

  const handleSave = useCallback(() => {
    const posMap: Record<string, { x: number; y: number }> = {};
    const nodeIds: string[] = [];
    nodes.forEach(n => {
      if (n.id === BLANK_NODE_ID) return;
      posMap[n.id] = n.position;
      nodeIds.push(n.id);
    });
    onCanvasLayoutChange({ positions: posMap, nodeIds });
    onSave();
  }, [nodes, onCanvasLayoutChange, onSave]);

  // Hotkeys
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.key === 'p' || e.key === 'n') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        createBlankNode({ x: 300, y: 300 });
      }
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        fitView({ duration: 400 });
      }
      if (e.key === 'Escape') {
        if (hasBlankNode()) {
          removeNodeFromCanvas(BLANK_NODE_ID);
        }
        setSelectedNodeId(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [createBlankNode, fitView, hasBlankNode, removeNodeFromCanvas, handleSave]);

  // Imperative handle for parent
  useImperativeHandle(ref, () => ({
    addProduct: (product: DemoProduct) => {
      const count = nodeCountRef.current;
      const col = count % 4;
      const row = Math.floor(count / 4);
      const newNode: Node = {
        id: product.id,
        type: 'product',
        position: { x: col * 160 + 50, y: row * 170 + 50 },
        data: { product, zone: classifyGroup(product), onDelete: removeNodeFromCanvas },
      };
      setNodes(nds => [...nds, newNode]);
      setSelectedNodeId(product.id);
    },
    addProductAtPosition: (product: DemoProduct, screenX: number, screenY: number) => {
      const position = screenToFlowPosition({ x: screenX, y: screenY });
      const newNode: Node = {
        id: product.id,
        type: 'product',
        position,
        data: { product, zone: classifyGroup(product), onDelete: removeNodeFromCanvas },
      };
      setNodes(nds => [...nds, newNode]);
      setSelectedNodeId(product.id);
    },
    selectProduct: (id: string) => {
      setSelectedNodeId(id);
      const node = nodes.find(n => n.id === id);
      if (node) {
        setCenter(node.position.x + 60, node.position.y + 65, { zoom: 1, duration: 400 });
      }
    },
    fillBlankNode,
    hasBlankNode,
  }), [nodes, setNodes, setCenter, removeNodeFromCanvas, fillBlankNode, hasBlankNode]);

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
      const style = type === 'pairs' ? PAIRS_STYLE : EXTRAS_STYLE;
      const newEdges = items.map(targetId => ({
        id: `${type}-${selectedNodeId}-${targetId}`,
        source: selectedNodeId!,
        target: targetId,
        sourceHandle: 'source',
        targetHandle: 'target',
        style,
        type: 'offset' as const,
        data: { type, offset: 0 },
      }));
      const result = [...otherEdges, ...newEdges] as Edge[];
      syncPresetsFromEdges(result);
      return result;
    });
  }, [selectedNodeId, selectedPreset, setEdges, syncPresetsFromEdges]);

  return (
    <div className="flex-1 flex relative h-full [&_.react-flow]:!bg-[#0a0a0a] [&_.react-flow__pane]:!bg-[#0a0a0a]">
      <div className="flex-1 relative" onDragOver={onDragOver} onDrop={onDrop}>
        {/* Floating toolbar */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 liquid-glass rounded-lg px-2 py-1.5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground/10 text-foreground border border-foreground/10 rounded-md text-[10px] font-display tracking-wider hover:bg-foreground/15 transition-all disabled:opacity-50"
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
          onConnectEnd={onConnectEnd}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onDoubleClick={handleCanvasDoubleClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          style={{ background: '#0a0a0a' }}
          deleteKeyCode={['Backspace', 'Delete']}
          fitView={initialNodes.length > 0}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.04)" />
        </ReactFlow>

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
            <p className="text-sm text-muted-foreground/50 font-display tracking-wider">
              Click products in the sidebar to add them to the canvas
            </p>
            <p className="text-[10px] text-muted-foreground/30 font-display tracking-wider">
              or press P to add · double-click empty space
            </p>
          </div>
        )}

        {/* Navigation instructions — fade like storefront footer */}
        <div className="absolute bottom-4 left-4 z-10 tracking-wider space-y-0.5 cursor-default transition-colors duration-500 text-muted-foreground/30 hover:text-foreground/80" style={{ fontSize: '10px', fontFamily: 'var(--font-body)' }}>
          <p>SCROLL TO ZOOM · DRAG TO PAN · CLICK TO SELECT</p>
          <p>P TO ADD · DEL TO REMOVE · F TO FIT · ⌘S TO SAVE</p>
          <p>DRAG PORT TO CONNECT · DOUBLE-CLICK TO ADD NODE</p>
        </div>
      </div>

      {/* Selected node sidebar */}
      {selectedProduct && (
        <div className="w-[280px] border-l border-foreground/5 liquid-glass overflow-y-auto flex-shrink-0">
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
                  <span className="inline-block mt-1 px-2 py-0.5 text-[8px] font-display tracking-widest bg-foreground/5 rounded text-muted-foreground">
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
                      <div key={id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-foreground/5">
                        <img src={getImageUrl(p.images[0], 'thumb')} alt={p.title} className="w-7 h-7 rounded object-cover" />
                        <span className="text-[10px] font-display tracking-wide flex-1 truncate">{p.title}</span>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => moveItem('pairs', i, -1)} className="p-0.5 hover:bg-foreground/10 rounded"><ChevronUp className="w-3 h-3 text-muted-foreground" /></button>
                          <button onClick={() => moveItem('pairs', i, 1)} className="p-0.5 hover:bg-foreground/10 rounded"><ChevronDown className="w-3 h-3 text-muted-foreground" /></button>
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
                      <div key={id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-foreground/5">
                        <img src={getImageUrl(p.images[0], 'thumb')} alt={p.title} className="w-7 h-7 rounded object-cover" />
                        <span className="text-[10px] font-display tracking-wide flex-1 truncate">{p.title}</span>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => moveItem('extras', i, -1)} className="p-0.5 hover:bg-foreground/10 rounded"><ChevronUp className="w-3 h-3 text-muted-foreground" /></button>
                          <button onClick={() => moveItem('extras', i, 1)} className="p-0.5 hover:bg-foreground/10 rounded"><ChevronDown className="w-3 h-3 text-muted-foreground" /></button>
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

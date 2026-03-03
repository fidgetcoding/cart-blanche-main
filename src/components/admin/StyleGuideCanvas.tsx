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
import { X, ChevronUp, ChevronDown, Save, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Constants ── */
const BLANK_NODE_ID = '__blank__';
const NODE_W = 120;
const NODE_H = 150;
const H_GAP = 80;
const V_GAP = 80;
const GROUP_GAP = 120;
const PAIRS_STYLE = { stroke: '#facc15', strokeWidth: 2, filter: 'drop-shadow(0 0 4px rgba(250, 204, 21, 0.5))' };
const EXTRAS_STYLE = { stroke: '#f472b6', strokeWidth: 2, strokeDasharray: '6 4', filter: 'drop-shadow(0 0 4px rgba(244, 114, 182, 0.5))' };
const PENDING_STYLE = { stroke: '#60a5fa', strokeWidth: 2, strokeDasharray: '4 4', filter: 'drop-shadow(0 0 4px rgba(96, 165, 250, 0.4))' };

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
  onManualSave: () => void;
  saving: boolean;
  isDirty: boolean;
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

/* ── Custom Edge with smart routing + offset for bidirectional connections ── */

function OffsetEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition: _sp, targetPosition: _tp,
  style, data, markerEnd, id,
}: EdgeProps) {
  const offset = (data as any)?.offset || 0;

  // Determine smart source/target positions based on relative node positions
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  let sourcePosition: Position;
  let targetPosition: Position;

  if (absDx >= absDy) {
    sourcePosition = dx > 0 ? Position.Right : Position.Left;
    targetPosition = dx > 0 ? Position.Left : Position.Right;
  } else {
    sourcePosition = dy > 0 ? Position.Bottom : Position.Top;
    targetPosition = dy > 0 ? Position.Top : Position.Bottom;
  }

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

  const handleClass = "!w-2.5 !h-2.5 !bg-foreground/20 !border-foreground/20";

  if (d.isBlank) {
    const blankHandleClass = "!w-3 !h-3 !bg-white/40 !border-white/30";
    return (
      <div
        className="w-[140px] h-[150px] rounded-lg p-4 flex flex-col items-center justify-center gap-3 animate-scale-in"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
          border: '2px dashed rgba(255,255,255,0.4)',
          boxShadow: '0 0 25px rgba(255,255,255,0.15), inset 0 0 20px rgba(255,255,255,0.05)',
        }}
      >
        <Handle type="target" position={Position.Left} id="target-left" className={blankHandleClass} />
        <Handle type="target" position={Position.Top} id="target-top" className={blankHandleClass} />
        <Handle type="target" position={Position.Right} id="target-right" className={blankHandleClass} />
        <Handle type="target" position={Position.Bottom} id="target-bottom" className={blankHandleClass} />
        <Handle type="source" position={Position.Left} id="source-left" className={blankHandleClass} />
        <Handle type="source" position={Position.Top} id="source-top" className={blankHandleClass} />
        <Handle type="source" position={Position.Right} id="source-right" className={blankHandleClass} />
        <Handle type="source" position={Position.Bottom} id="source-bottom" className={blankHandleClass} />
        <Plus className="w-7 h-7 text-white/60" />
        <span className="text-[9px] text-white/50 font-display tracking-widest text-center leading-tight">SELECT PRODUCT<br/>FROM PANEL</span>
      </div>
    );
  }

  if (!d.product) return null;

  // Zone-based color system
  const zoneColors = {
    TOPS: { border: 'rgba(96,165,250,0.4)', glow: 'rgba(96,165,250,0.2)', handle: '!bg-blue-400/40 !border-blue-400/30' },
    BOTTOMS: { border: 'rgba(74,222,128,0.4)', glow: 'rgba(74,222,128,0.2)', handle: '!bg-green-400/40 !border-green-400/30' },
    ACCESSORIES: { border: 'rgba(168,85,247,0.4)', glow: 'rgba(168,85,247,0.2)', handle: '!bg-purple-400/40 !border-purple-400/30' },
  };
  const colors = zoneColors[d.zone || 'TOPS'] || zoneColors.TOPS;
  const handleNodeClass = `!w-3 !h-3 ${colors.handle}`;

  return (
    <div
      className={`relative rounded-lg p-2 flex flex-col items-center gap-1.5 w-[120px] transition-shadow group ${selected ? 'ring-2 ring-primary/50' : ''}`}
      style={{
        background: '#141414',
        border: `2px solid ${colors.border}`,
        boxShadow: `0 0 20px ${colors.glow}${selected ? ', 0 0 25px hsl(var(--primary) / 0.15)' : ''}`,
      }}
    >
      <Handle type="target" position={Position.Left} id="target-left" className={handleNodeClass} />
      <Handle type="target" position={Position.Top} id="target-top" className={handleNodeClass} />
      <Handle type="target" position={Position.Right} id="target-right" className={handleNodeClass} />
      <Handle type="target" position={Position.Bottom} id="target-bottom" className={handleNodeClass} />
      <Handle type="source" position={Position.Left} id="source-left" className={handleNodeClass} />
      <Handle type="source" position={Position.Top} id="source-top" className={handleNodeClass} />
      <Handle type="source" position={Position.Right} id="source-right" className={handleNodeClass} />
      <Handle type="source" position={Position.Bottom} id="source-bottom" className={handleNodeClass} />
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
  const seen = new Set<string>();

  presets.forEach(preset => {
    const allTargets = [
      ...preset.pairs.map(id => ({ id, type: 'pairs' as const })),
      ...preset.extras.map(id => ({ id, type: 'extras' as const })),
    ];

    allTargets.forEach(({ id: targetId, type }) => {
      const canonicalKey = [preset.anchorProductId, targetId].sort().join('::');
      const edgeKey = `${type}-${canonicalKey}`;
      if (seen.has(edgeKey)) return;
      seen.add(edgeKey);

      const style = type === 'pairs' ? PAIRS_STYLE : EXTRAS_STYLE;
      edges.push({
        id: `${type}-${preset.anchorProductId}-${targetId}`,
        source: preset.anchorProductId,
        target: targetId,
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
        style,
        type: 'offset',
        data: { type, offset: 0 },
      });
    });
  });

  return edges;
}

function edgesToPresets(edges: Edge[]): ProductPreset[] {
  const map = new Map<string, { pairs: Set<string>; extras: Set<string> }>();

  edges.forEach(e => {
    if (e.source === BLANK_NODE_ID || e.target === BLANK_NODE_ID) return;
    const edgeType = (e.data as any)?.type;
    if (edgeType !== 'pairs' && edgeType !== 'extras') return;

    // Bidirectional: one edge creates entries for both directions
    [e.source, e.target].forEach((nodeId, i) => {
      const otherId = i === 0 ? e.target : e.source;
      if (!map.has(nodeId)) map.set(nodeId, { pairs: new Set(), extras: new Set() });
      map.get(nodeId)![edgeType].add(otherId);
    });
  });

  return Array.from(map.entries()).map(([anchorProductId, { pairs, extras }]) => ({
    anchorProductId,
    pairs: Array.from(pairs),
    extras: Array.from(extras),
  }));
}

/* ── Inner component (needs ReactFlow context) ── */

const StyleGuideCanvasInner = forwardRef<StyleGuideCanvasHandle, StyleGuideCanvasProps>(({
  presets,
  onPresetsChange,
  canvasLayout,
  onCanvasLayoutChange,
  onSave,
  onManualSave,
  saving,
  isDirty,
  onCanvasNodeIdsChange,
  onBlankNodeChange,
}, ref) => {
  const { fitView, setCenter, screenToFlowPosition } = useReactFlow();
  const nodeCountRef = useRef(0);
  // Track pending connection source for blank node flow
  const pendingConnectionSourceRef = useRef<string | null>(null);
  // Track whether we're the source of a preset change (avoid circular sync)
  const isInternalChangeRef = useRef(false);

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

  // Debounced auto-save for canvas layout changes
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveLayoutDebounced = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      const posMap: Record<string, { x: number; y: number }> = {};
      const nodeIds: string[] = [];
      nodes.forEach(n => {
        if (n.id === BLANK_NODE_ID) return;
        posMap[n.id] = n.position;
        nodeIds.push(n.id);
      });
      onCanvasLayoutChange({ positions: posMap, nodeIds });
      onSave();
    }, 800);
  }, [nodes, onCanvasLayoutChange, onSave]);

  useEffect(() => {
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, []);

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
    saveLayoutDebounced();
  }, [selectedNodeId, saveLayoutDebounced]);

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
    isInternalChangeRef.current = true;
    onPresetsChange(edgesToPresets(currentEdges));
  }, [onPresetsChange]);

  // Sync external preset changes (from list view) into canvas edges + auto-create missing nodes
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }

    // Collect all product IDs referenced in presets
    const presetProductIds = new Set<string>();
    presets.forEach(p => {
      if (p.pairs.length > 0 || p.extras.length > 0) {
        presetProductIds.add(p.anchorProductId);
        p.pairs.forEach(id => presetProductIds.add(id));
        p.extras.forEach(id => presetProductIds.add(id));
      }
    });

    // Find which ones are missing from canvas
    const existingNodeIds = new Set(nodes.filter(n => n.id !== BLANK_NODE_ID).map(n => n.id));
    const missingIds = Array.from(presetProductIds).filter(id => !existingNodeIds.has(id));

    if (missingIds.length > 0) {
      // Calculate starting position below existing nodes
      let startX = 100;
      let startY = 100;
      if (nodes.length > 0) {
        const maxY = Math.max(...nodes.map(n => n.position.y));
        startY = maxY + NODE_H + GROUP_GAP;
      }

      const newNodes: Node[] = [];
      const placed = new Set<string>();
      let currentY = startY;

      presets.forEach(p => {
        if (p.pairs.length === 0 && p.extras.length === 0) return;
        const anchorId = p.anchorProductId;
        const anchorAlreadyExists = !missingIds.includes(anchorId) || placed.has(anchorId);
        const newPairIds = p.pairs.filter(id => missingIds.includes(id) && !placed.has(id));
        const newExtraIds = p.extras.filter(id => missingIds.includes(id) && !placed.has(id));
        const needsAnchor = missingIds.includes(anchorId) && !placed.has(anchorId);

        if (!needsAnchor && newPairIds.length === 0 && newExtraIds.length === 0) return;

        let anchorX = startX;
        let anchorY = currentY;

        if (needsAnchor) {
          const product = DEMO_PRODUCTS.find(pr => pr.id === anchorId);
          if (product) {
            newNodes.push({
              id: product.id, type: 'product',
              position: { x: anchorX, y: anchorY },
              data: { product, zone: classifyGroup(product), onDelete: removeNodeFromCanvas },
            });
            placed.add(anchorId);
          }
        } else {
          const existingAnchor = nodes.find(n => n.id === anchorId);
          if (existingAnchor) { anchorX = existingAnchor.position.x; anchorY = existingAnchor.position.y; }
        }

        newPairIds.forEach((pairedId, i) => {
          const product = DEMO_PRODUCTS.find(pr => pr.id === pairedId);
          if (product) {
            newNodes.push({
              id: product.id, type: 'product',
              position: { x: anchorX + (NODE_W + H_GAP) * (i + 1), y: anchorY },
              data: { product, zone: classifyGroup(product), onDelete: removeNodeFromCanvas },
            });
            placed.add(pairedId);
          }
        });

        newExtraIds.forEach((extraId, i) => {
          const product = DEMO_PRODUCTS.find(pr => pr.id === extraId);
          if (product) {
            newNodes.push({
              id: product.id, type: 'product',
              position: { x: anchorX, y: anchorY + (NODE_H + V_GAP) * (i + 1) },
              data: { product, zone: classifyGroup(product), onDelete: removeNodeFromCanvas },
            });
            placed.add(extraId);
          }
        });

        const groupRows = 1 + newExtraIds.length;
        currentY += groupRows * (NODE_H + V_GAP) + GROUP_GAP;
      });

      missingIds.forEach(id => {
        if (placed.has(id)) return;
        const product = DEMO_PRODUCTS.find(pr => pr.id === id);
        if (!product) return;
        newNodes.push({
          id: product.id, type: 'product',
          position: { x: startX, y: currentY },
          data: { product, zone: classifyGroup(product), onDelete: removeNodeFromCanvas },
        });
        placed.add(id);
        currentY += NODE_H + V_GAP;
      });

      if (newNodes.length > 0) {
        setNodes(nds => {
          const allNodes = [...nds, ...newNodes];
          // Rebuild edges using the combined node list (avoids stale closure)
          const allNodeIds = new Set(allNodes.filter(n => n.id !== BLANK_NODE_ID).map(n => n.id));
          const newEdges = presetsToEdges(presets).filter(e => allNodeIds.has(e.source) && allNodeIds.has(e.target));
          setTimeout(() => {
            setEdges(eds => {
              const pendingEdges = eds.filter(e => (e.data as any)?.type === 'pending');
              return [...newEdges, ...pendingEdges];
            });
          }, 0);
          return allNodes;
        });
        return;
      }
    }

    // No missing nodes — rebuild edges immediately
    rebuildEdgesFromPresets();
  }, [presets]);

  const rebuildEdgesFromPresets = useCallback((currentNodes?: Node[]) => {
    const nodesForEdges = currentNodes ?? nodes;
    const nodeIds = new Set(nodesForEdges.filter(n => n.id !== BLANK_NODE_ID).map(n => n.id));
    const newPresetEdges = presetsToEdges(presets).filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
    setEdges(eds => {
      const pendingEdges = eds.filter(e => (e.data as any)?.type === 'pending' || e.source === BLANK_NODE_ID || e.target === BLANK_NODE_ID);
      return [...newPresetEdges, ...pendingEdges];
    });
  }, [nodes, presets, setEdges]);

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
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
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
          // Single edge (bidirectional by definition)
          const newEdge: Edge = {
            id: `${connectionType}-${pendingSourceId}-${product.id}`,
            source: pendingSourceId,
            target: product.id,
            sourceHandle: 'source-right',
            targetHandle: 'target-left',
            style,
            type: 'offset',
            data: { type: connectionType, offset: 0 },
          };
          if (!newEdges.some(e => e.id === newEdge.id)) newEdges = addEdge(newEdge, newEdges);
        }
      }

      syncPresetsFromEdges(newEdges);
      return newEdges;
    });

    pendingConnectionSourceRef.current = null;
    onBlankNodeChange(false);
    setSelectedNodeId(product.id);
    saveLayoutDebounced();
  }, [nodes, setNodes, setEdges, syncPresetsFromEdges, removeNodeFromCanvas, onBlankNodeChange, saveLayoutDebounced]);

  // Auto-detect pairs vs extras from body zone
  const onConnect = useCallback((connection: Connection) => {
    const isBlankSource = connection.source === BLANK_NODE_ID;
    const isBlankTarget = connection.target === BLANK_NODE_ID;

    // If either end is blank, create a pending (blue) edge
    if (isBlankSource || isBlankTarget) {
      const newEdge: Edge = {
        id: `pending-${connection.source}-${connection.target}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle || 'source-right',
        targetHandle: connection.targetHandle || 'target-left',
        style: PENDING_STYLE,
        data: { type: 'pending' },
        type: 'default',
      };
      setEdges(eds => addEdge(newEdge, eds));
      return;
    }

    const sourceProduct = DEMO_PRODUCTS.find(p => p.id === connection.source);
    const targetProduct = DEMO_PRODUCTS.find(p => p.id === connection.target);
    if (!sourceProduct || !targetProduct) return;

    const sourceZone = getBodyZone(sourceProduct);
    const targetZone = getBodyZone(targetProduct);
    const connectionType = sourceZone === targetZone ? 'extras' : 'pairs';

    // Create a single edge (bidirectional by definition)
    const newEdge: Edge = {
      id: `${connectionType}-${connection.source}-${connection.target}`,
      source: connection.source!,
      target: connection.target!,
      sourceHandle: connection.sourceHandle || 'source-right',
      targetHandle: connection.targetHandle || 'target-left',
      style: connectionType === 'pairs' ? PAIRS_STYLE : EXTRAS_STYLE,
      data: { type: connectionType, offset: 0 },
      type: 'offset' as const,
    };

    setEdges(eds => {
      if (eds.some(e => e.id === newEdge.id)) return eds;
      // Also check canonical reverse
      const reverseId = `${connectionType}-${connection.target}-${connection.source}`;
      if (eds.some(e => e.id === reverseId)) return eds;
      const newEdges = addEdge(newEdge, eds);
      syncPresetsFromEdges(newEdges);
      return newEdges;
    });
    saveLayoutDebounced();
  }, [setEdges, syncPresetsFromEdges, saveLayoutDebounced]);

  // Drag-to-empty: create blank node at drop position
  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent, connectionState: any) => {
    // If the connection was completed successfully, do nothing
    if (connectionState?.isValid) return;
    const sourceId = connectionState?.fromNode?.id;
    if (!sourceId) return;

    const clientX = 'clientX' in event ? event.clientX : (event as TouchEvent).changedTouches?.[0]?.clientX;
    const clientY = 'clientY' in event ? event.clientY : (event as TouchEvent).changedTouches?.[0]?.clientY;
    if (clientX == null || clientY == null) return;

    // Check if the drop landed on an existing node by checking element under cursor
    const targetElement = document.elementFromPoint(clientX, clientY);
    const nodeElement = targetElement?.closest('.react-flow__node');
    if (nodeElement) {
      // Dropped on an existing node — find its ID and create connection
      const targetNodeId = nodeElement.getAttribute('data-id');
      if (targetNodeId && targetNodeId !== sourceId && targetNodeId !== BLANK_NODE_ID) {
        const sourceProduct = DEMO_PRODUCTS.find(p => p.id === sourceId);
        const targetProduct = DEMO_PRODUCTS.find(p => p.id === targetNodeId);
        if (sourceProduct && targetProduct) {
          const sourceZone = getBodyZone(sourceProduct);
          const targetZone = getBodyZone(targetProduct);
          const connectionType = sourceZone === targetZone ? 'extras' : 'pairs';
          const style = connectionType === 'pairs' ? PAIRS_STYLE : EXTRAS_STYLE;

          setEdges(eds => {
            // Don't add duplicate (check both directions)
            if (eds.some(e => e.source === sourceId && e.target === targetNodeId && (e.data as any)?.type === connectionType)) return eds;
            if (eds.some(e => e.source === targetNodeId && e.target === sourceId && (e.data as any)?.type === connectionType)) return eds;

            const newEdge: Edge = {
              id: `${connectionType}-${sourceId}-${targetNodeId}`,
              source: sourceId,
              target: targetNodeId,
              style,
              type: 'offset',
              data: { type: connectionType, offset: 0 },
            };

            const newEdges = addEdge(newEdge, eds);
            syncPresetsFromEdges(newEdges);
            return newEdges;
          });
          return;
        }
      }
    }

    // Dropped on empty space — create blank node
    const position = screenToFlowPosition({ x: clientX, y: clientY });
    createBlankNode(position, sourceId);
  }, [screenToFlowPosition, createBlankNode, setEdges, syncPresetsFromEdges]);

  const handleEdgesChange = useCallback((changes: any) => {
    const removals = changes.filter((c: any) => c.type === 'remove');
    if (removals.length > 0) {
      const removedIds = new Set<string>(removals.map((c: any) => c.id as string));
      setEdges(eds => {
        const filtered = eds.filter(e => !removedIds.has(e.id));
        syncPresetsFromEdges(filtered);
        return filtered;
      });
      return;
    }
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

    // Check if dropped on a blank node
    const targetElement = document.elementFromPoint(event.clientX, event.clientY);
    const nodeElement = targetElement?.closest('.react-flow__node');
    if (nodeElement) {
      const targetNodeId = nodeElement.getAttribute('data-id');
      if (targetNodeId === BLANK_NODE_ID) {
        fillBlankNode(product);
        return;
      }
    }

    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const newNode: Node = {
      id: product.id,
      type: 'product',
      position,
      data: { product, zone: classifyGroup(product), onDelete: removeNodeFromCanvas },
    };
    setNodes(nds => [...nds, newNode]);
    setSelectedNodeId(product.id);
    saveLayoutDebounced();
  }, [screenToFlowPosition, nodes, setNodes, removeNodeFromCanvas, fillBlankNode, saveLayoutDebounced]);

  const handleSave = useCallback(() => {
    const posMap: Record<string, { x: number; y: number }> = {};
    const nodeIds: string[] = [];
    nodes.forEach(n => {
      if (n.id === BLANK_NODE_ID) return;
      posMap[n.id] = n.position;
      nodeIds.push(n.id);
    });
    onCanvasLayoutChange({ positions: posMap, nodeIds });
    onManualSave();
  }, [nodes, onCanvasLayoutChange, onSave]);

  // Auto-arrange all nodes by their connections (Shift+F)
  const autoArrangeNodes = useCallback(() => {
    const connections = new Map<string, Set<string>>();
    edges.forEach(e => {
      if (e.source === BLANK_NODE_ID || e.target === BLANK_NODE_ID) return;
      if (!connections.has(e.source)) connections.set(e.source, new Set());
      if (!connections.has(e.target)) connections.set(e.target, new Set());
      connections.get(e.source)!.add(e.target);
      connections.get(e.target)!.add(e.source);
    });

    const visited = new Set<string>();
    const groups: string[][] = [];
    nodes.forEach(n => {
      if (n.id === BLANK_NODE_ID || visited.has(n.id)) return;
      const group: string[] = [];
      const queue = [n.id];
      while (queue.length > 0) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        group.push(id);
        connections.get(id)?.forEach(neighbor => {
          if (!visited.has(neighbor)) queue.push(neighbor);
        });
      }
      groups.push(group);
    });
    nodes.forEach(n => {
      if (n.id !== BLANK_NODE_ID && !visited.has(n.id)) {
        groups.push([n.id]);
        visited.add(n.id);
      }
    });

    let currentY = 100;
    const newPositions: Record<string, { x: number; y: number }> = {};
    groups.forEach(group => {
      if (group.length === 1) {
        newPositions[group[0]] = { x: 100, y: currentY };
        currentY += NODE_H + V_GAP;
        return;
      }
      let hubId = group[0];
      let maxConns = 0;
      group.forEach(id => {
        const count = connections.get(id)?.size ?? 0;
        if (count > maxConns) { maxConns = count; hubId = id; }
      });
      newPositions[hubId] = { x: 100, y: currentY };
      const others = group.filter(id => id !== hubId);
      const maxPerRow = 3;
      others.forEach((id, i) => {
        const col = (i % maxPerRow) + 1;
        const row = Math.floor(i / maxPerRow);
        newPositions[id] = {
          x: 100 + col * (NODE_W + H_GAP),
          y: currentY + row * (NODE_H + V_GAP),
        };
      });
      const totalRows = Math.ceil(others.length / maxPerRow) + 1;
      currentY += totalRows * (NODE_H + V_GAP) + GROUP_GAP;
    });

    setNodes(nds => nds.map(n => ({
      ...n,
      position: newPositions[n.id] ?? n.position,
    })));
    setTimeout(() => fitView({ duration: 400, padding: selectedNodeId ? 1.2 : 0.7 }), 50);
    saveLayoutDebounced();
  }, [nodes, edges, setNodes, fitView, saveLayoutDebounced]);

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
        if (e.shiftKey) {
          autoArrangeNodes();
        } else {
          const hasPopup = selectedNodeId !== null;
          fitView({ duration: 400, padding: hasPopup ? 1.2 : 0.7 });
        }
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
  }, [createBlankNode, fitView, hasBlankNode, removeNodeFromCanvas, handleSave, autoArrangeNodes]);

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
      saveLayoutDebounced();
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
  const selectedPreset = selectedNodeId 
    ? (edgesToPresets(edges).find(p => p.anchorProductId === selectedNodeId) 
       ?? presets.find(p => p.anchorProductId === selectedNodeId))
    : null;

  const removeConnection = useCallback((targetId: string, type: 'pairs' | 'extras') => {
    setEdges(eds => {
      const filtered = eds.filter(e => {
        const edgeType = (e.data as any)?.type;
        if (edgeType !== type) return true;
        const isForward = e.source === selectedNodeId && e.target === targetId;
        const isReverse = e.source === targetId && e.target === selectedNodeId;
        return !isForward && !isReverse;
      });
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
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
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
      <div
        className="flex-1 relative"
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDoubleClick={(e) => {
          const target = e.target as HTMLElement;
          if (
            target.classList.contains('react-flow__pane') ||
            target.closest('.react-flow__pane')
          ) {
            if (target.closest('.react-flow__node') || target.closest('.react-flow__edge') || target.closest('[data-toolbar]') || target.closest('.react-flow__controls')) return;
            handleCanvasDoubleClick(e);
          }
        }}
      >
        {/* Floating toolbar — Add Node + Legend */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 liquid-glass rounded-lg px-2 py-1.5">
          <button
            onClick={() => createBlankNode({ x: 300, y: 300 })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground/10 text-foreground border border-foreground/10 rounded-md text-[10px] font-display tracking-wider hover:bg-foreground/15 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            ADD MATCH
          </button>
          {/* Legend */}
          <div className="flex items-center gap-3 ml-2 text-[9px] text-muted-foreground font-display tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 rounded" style={{ background: '#facc15', boxShadow: '0 0 6px rgba(250, 204, 21, 0.6)' }} />
              PAIRS
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 rounded" style={{ background: '#f472b6', backgroundImage: 'repeating-linear-gradient(90deg, #f472b6 0 4px, transparent 4px 7px)', boxShadow: '0 0 6px rgba(244, 114, 182, 0.6)' }} />
              EXTRAS
            </span>
          </div>
        </div>

        {/* Save button — top right */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-display tracking-wider transition-all disabled:opacity-50 ${
              isDirty
                ? 'bg-foreground text-background hover:bg-foreground/90'
                : 'bg-foreground/10 text-muted-foreground border border-foreground/10'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'SAVING...' : 'SAVE'}
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={saveLayoutDebounced}
          onConnectEnd={onConnectEnd}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          style={{ background: '#0a0a0a' }}
          connectionLineStyle={{ stroke: '#60a5fa', strokeWidth: 2, filter: 'drop-shadow(0 0 4px rgba(96, 165, 250, 0.4))' }}
          deleteKeyCode={['Backspace', 'Delete']}
          zoomOnDoubleClick={false}
          fitView={initialNodes.length > 0}
          fitViewOptions={{ padding: 0.5 }}
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

        {/* Navigation instructions — fade away when popup is open */}
        <div
          className="absolute bottom-4 left-4 z-10 tracking-wider space-y-0.5 cursor-default transition-all duration-500"
          style={{
            fontSize: '10px',
            fontFamily: 'var(--font-body)',
            opacity: selectedProduct ? 0 : undefined,
            pointerEvents: selectedProduct ? 'none' : undefined,
          }}
        >
          <p className="text-muted-foreground/30 hover:text-foreground/80 transition-colors duration-500">SCROLL OR PINCH TO ZOOM · DRAG TO PAN · CLICK TO SELECT</p>
          <p className="text-muted-foreground/30 hover:text-foreground/80 transition-colors duration-500">P TO ADD · DEL TO REMOVE · F TO FIT · ⌘S TO SAVE</p>
          <p className="text-muted-foreground/30 hover:text-foreground/80 transition-colors duration-500">DRAG PORT TO CONNECT · DOUBLE-CLICK TO ADD NODE</p>
        </div>
      </div>

      {/* Selected node popup — slides up from bottom */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="absolute bottom-4 left-4 right-4 mx-auto z-20 liquid-glass rounded-xl max-w-[520px]"
          >
            <div className="p-3 flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-center gap-3">
                <img
                  src={getImageUrl(selectedProduct.images[0], 'thumb')}
                  alt={selectedProduct.title}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-display text-xs tracking-wide font-bold truncate">{selectedProduct.title}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-muted-foreground">${selectedProduct.price}</p>
                    <span className="px-1.5 py-0.5 text-[7px] font-display tracking-widest bg-foreground/5 rounded text-muted-foreground">
                      {classifyGroup(selectedProduct)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => removeNodeFromCanvas(selectedProduct.id)}
                    className="p-1 hover:bg-destructive/20 rounded transition-colors"
                    title="Remove from canvas"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="p-1 hover:bg-foreground/10 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Pairs & Extras side by side */}
              <div className="flex gap-4">
                {/* Pairs */}
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] font-display tracking-[0.2em] text-[#facc15] mb-1.5">PAIRS</p>
                  {(selectedPreset?.pairs ?? []).length === 0 ? (
                    <p className="text-[9px] text-muted-foreground/40 italic">No connections</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {(selectedPreset?.pairs ?? []).map((id, i) => {
                        const p = DEMO_PRODUCTS.find(x => x.id === id);
                        if (!p) return null;
                        return (
                          <div key={id} className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-foreground/5">
                            <img src={getImageUrl(p.images[0], 'thumb')} alt={p.title} className="w-6 h-6 rounded object-cover" />
                            <span className="text-[9px] font-display tracking-wide flex-1 truncate">{p.title}</span>
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
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] font-display tracking-[0.2em] text-[#f472b6] mb-1.5">EXTRAS</p>
                  {(selectedPreset?.extras ?? []).length === 0 ? (
                    <p className="text-[9px] text-muted-foreground/40 italic">No connections</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {(selectedPreset?.extras ?? []).map((id, i) => {
                        const p = DEMO_PRODUCTS.find(x => x.id === id);
                        if (!p) return null;
                        return (
                          <div key={id} className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-foreground/5">
                            <img src={getImageUrl(p.images[0], 'thumb')} alt={p.title} className="w-6 h-6 rounded object-cover" />
                            <span className="text-[9px] font-display tracking-wide flex-1 truncate">{p.title}</span>
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
          </motion.div>
        )}
      </AnimatePresence>
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

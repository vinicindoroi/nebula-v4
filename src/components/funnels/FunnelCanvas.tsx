import { useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  reconnectEdge,
  Connection,
  Node,
  Edge,
  Viewport,
  ReactFlowInstance,
  ConnectionMode,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng, toSvg } from 'html-to-image';
import { toast } from 'sonner';
import { nodeTypes, FunnelNodeData } from './FunnelNodeTypes';
import { edgeTypes } from './FunnelEdgeTypes';
import { FunnelElementsSidebar } from './FunnelElementsSidebar';
import { FunnelNodeConfigSheet } from './FunnelNodeConfigSheet';
import { FunnelFloatingToolbar, InteractionMode } from './FunnelFloatingToolbar';
import { FunnelEducationalContext } from './FunnelEducationalContext';
import { FunnelTrackingDialog } from './FunnelTrackingDialog';
import { FunnelAnalyticsPanel } from './FunnelAnalyticsPanel';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Funnel } from '@/hooks/useFunnels';
import { useFunnelAnalytics } from '@/hooks/useFunnelAnalytics';

interface FunnelCanvasProps {
  funnel: Funnel;
  onSave: (nodes: Node[], edges: Edge[], viewport: Viewport) => void;
  isSaving?: boolean;
  onRegisterFlush?: (flush: () => void) => void;
}

// Magnetic snapping threshold in pixels
const SNAP_THRESHOLD = 10;

export function FunnelCanvas({ funnel, onSave, isSaving, onRegisterFlush }: FunnelCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<Node, Edge> | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [educationalMode, setEducationalMode] = useState(false);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('select');
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [trackingToken, setTrackingToken] = useState<string | null>(funnel.tracking_token || null);
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState(24);
  const currentFunnelIdRef = useRef<string | null>(null);
  const didApplyInitialViewportRef = useRef(false);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshotRef = useRef<string>('');
  const [helperLines, setHelperLines] = useState<{ horizontal: number | null; vertical: number | null }>({
    horizontal: null,
    vertical: null,
  });
  const edgeReconnectSuccessful = useRef(true);
  const copiedNodesRef = useRef<Node[]>([]);

  // Multi-connection: Shift+Click to select sources, then click target to connect all
  const [multiConnectSources, setMultiConnectSources] = useState<string[]>([]);
  const multiConnectModeRef = useRef(false);

  // Analytics hook - active when liveMode is on
  const {
    stats: analyticsStats,
    isLoading: analyticsLoading,
    getNodeStats,
    isNodeLive,
    getTotalVisitors,
    getTotalPageviews,
    getConversionRates,
    getNodeLiveVisitors,
    getSourceStatsForNodeType,
  } = useFunnelAnalytics({
    funnelId: funnel.id,
    enabled: liveMode,
    timeRangeHours: analyticsTimeRange,
  });

  // Load initial data ONLY when funnel ID changes (switching funnels)
  useEffect(() => {
    if (currentFunnelIdRef.current !== funnel.id) {
      currentFunnelIdRef.current = funnel.id;
      didApplyInitialViewportRef.current = false;

      const nextNodes = funnel.nodes || [];
      const nextEdges = funnel.edges || [];
      const nextViewport = funnel.viewport || { x: 0, y: 0, zoom: 1 };

      setNodes(nextNodes);
      setEdges(nextEdges);
      setTrackingToken(funnel.tracking_token || null);

      // Seed autosave snapshot to avoid re-saving immediately on mount/refetch
      lastSavedSnapshotRef.current = JSON.stringify({ nodes: nextNodes, edges: nextEdges, viewport: nextViewport });
    }
  }, [funnel.id, funnel.tracking_token, setNodes, setEdges]);

  // Apply initial viewport once the ReactFlow instance is ready
  useEffect(() => {
    if (!reactFlowInstance) return;
    if (currentFunnelIdRef.current !== funnel.id) return;
    if (didApplyInitialViewportRef.current) return;

    didApplyInitialViewportRef.current = true;
    const viewport = funnel.viewport || { x: 0, y: 0, zoom: 1 };
    reactFlowInstance.setViewport(viewport);
  }, [reactFlowInstance, funnel.id, funnel.viewport]);

  // Ref that always holds the latest state for flush (avoids stale closures)
  const latestFunnelStateRef = useRef({ nodes, edges, reactFlowInstance, onSave });
  latestFunnelStateRef.current = { nodes, edges, reactFlowInstance, onSave };

  // Stable flush function — reads from ref, never stale
  const flushSave = useCallback(() => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
    const { nodes: curNodes, edges: curEdges, reactFlowInstance: rfi, onSave: curOnSave } = latestFunnelStateRef.current;
    if (!rfi) return;
    const viewport = rfi.getViewport();
    const snapshot = JSON.stringify({ nodes: curNodes, edges: curEdges, viewport });
    if (snapshot === lastSavedSnapshotRef.current) return;
    lastSavedSnapshotRef.current = snapshot;
    curOnSave(curNodes, curEdges, viewport);
  }, []);

  // Debounced autosave to prevent losing edits on refresh/HMR
  const scheduleAutosave = useCallback(() => {
    if (!reactFlowInstance) return;

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      flushSave();
    }, 700);
  }, [reactFlowInstance, flushSave]);

  useEffect(() => {
    scheduleAutosave();
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [nodes, edges, scheduleAutosave]);

  // Flush on unmount
  useEffect(() => {
    return () => { flushSave(); };
  }, []);

  // Register flush with parent
  useEffect(() => {
    onRegisterFlush?.(flushSave);
    return () => onRegisterFlush?.(undefined as unknown as () => void);
  }, [onRegisterFlush, flushSave]);

  // Inject analytics data into nodes when liveMode is active
  // Passthrough logic: intermediate nodes with no direct events inherit stats from their downstream target
  useEffect(() => {
    if (!liveMode) return;

    setNodes((currentNodes) => {
      // Build a map of outgoing edges per node
      const outgoingEdges = new Map<string, string[]>();
      edges.forEach((e) => {
        const targets = outgoingEdges.get(e.source) || [];
        targets.push(e.target);
        outgoingEdges.set(e.source, targets);
      });

      // Traffic source node types
      const trafficSourceTypes = new Set(['facebook-ads', 'fb-campaign', 'fb-adset', 'fb-ad', 'google-ads', 'instagram', 'youtube', 'tiktok-ads']);

      // First pass: compute direct stats for each node
      const directStats = new Map<string, { pageviews: number; visitors: number; live: boolean }>();
      currentNodes.forEach((node) => {
        const nodeData = node.data as FunnelNodeData;
        const nodeType = nodeData.type;

        // For traffic source nodes, always use source-attributed stats (never passthrough)
        if (trafficSourceTypes.has(nodeType)) {
          const sourceData = getSourceStatsForNodeType(nodeType);
          directStats.set(node.id, {
            pageviews: sourceData?.pageviews || 0,
            visitors: sourceData?.recent_visitors || 0,
            live: (sourceData?.recent_visitors || 0) > 0,
          });
          return;
        }

        const nodeStat = getNodeStats(node.id);
        directStats.set(node.id, {
          pageviews: nodeStat?.pageviews || 0,
          visitors: getNodeLiveVisitors(node.id) || nodeStat?.recent_visitors || 0,
          live: isNodeLive(node.id),
        });
      });

      // Build a set of traffic source node IDs so passthrough skips them
      const trafficSourceNodeIds = new Set<string>();
      currentNodes.forEach((node) => {
        const nodeData = node.data as FunnelNodeData;
        if (trafficSourceTypes.has(nodeData.type)) {
          trafficSourceNodeIds.add(node.id);
        }
      });

      // Second pass: for nodes with 0 pageviews, inherit from downstream target(s)
      // Traffic source nodes NEVER use passthrough — they show only source-attributed stats
      const resolveStats = (nodeId: string, visited: Set<string>): { pageviews: number; visitors: number; live: boolean } => {
        const direct = directStats.get(nodeId);
        if (!direct) return { pageviews: 0, visitors: 0, live: false };
        if (direct.pageviews > 0) return direct;
        // Traffic source nodes must never inherit downstream stats
        if (trafficSourceNodeIds.has(nodeId)) return direct;
        if (visited.has(nodeId)) return direct;

        visited.add(nodeId);
        const targets = outgoingEdges.get(nodeId) || [];
        let totalPageviews = 0;
        let totalVisitors = 0;
        let anyLive = false;
        for (const targetId of targets) {
          const targetStats = resolveStats(targetId, visited);
          totalPageviews += targetStats.pageviews;
          totalVisitors += targetStats.visitors;
          if (targetStats.live) anyLive = true;
        }
        if (totalPageviews > 0) {
          return { pageviews: totalPageviews, visitors: totalVisitors, live: anyLive };
        }
        return direct;
      };

      return currentNodes.map((node) => {
        const nodeData = node.data as FunnelNodeData;
        const resolved = resolveStats(node.id, new Set());

        return {
          ...node,
          data: {
            ...nodeData,
            analyticsEnabled: true,
            analyticsPageviews: resolved.pageviews,
            analyticsVisitors: resolved.visitors,
            analyticsIsLive: resolved.live,
          },
        };
      });
    });
  }, [liveMode, analyticsStats, edges, getNodeStats, isNodeLive, setNodes, getNodeLiveVisitors, getSourceStatsForNodeType]);

  // Clear analytics data when liveMode is turned off
  useEffect(() => {
    if (liveMode) return;

    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const nodeData = node.data as FunnelNodeData;
        if (nodeData.analyticsEnabled) {
          const { analyticsEnabled, analyticsPageviews, analyticsVisitors, analyticsIsLive, ...rest } = nodeData;
          return { ...node, data: rest };
        }
        return node;
      })
    );
  }, [liveMode, setNodes]);

  // Auto-calculate conversion rates from analytics data
  useEffect(() => {
    if (!liveMode || analyticsStats.length === 0) return;

    const conversionRates = getConversionRates(edges.map((e) => ({ source: e.source, target: e.target })));

    setEdges((currentEdges) =>
      currentEdges.map((edge) => {
        // First try the standard conversion rate from stats array
        let cr = conversionRates.find(
          (c) => c.sourceNodeId === edge.source && c.targetNodeId === edge.target
        );

        // If no conversion found, try using injected analyticsPageviews from nodes
        // This handles traffic source nodes (Facebook, Instagram, etc.) whose stats come from source attribution
        if (!cr) {
          const sourceNode = nodes.find((n) => n.id === edge.source);
          const targetNode = nodes.find((n) => n.id === edge.target);
          const sourcePageviews = (sourceNode?.data as any)?.analyticsPageviews || 0;
          const targetPageviews = (targetNode?.data as any)?.analyticsPageviews || 0;
          if (sourcePageviews > 0) {
            cr = {
              sourceNodeId: edge.source,
              targetNodeId: edge.target,
              rate: Math.round((targetPageviews / sourcePageviews) * 100),
              sourceVisitors: sourcePageviews,
              targetVisitors: targetPageviews,
            };
          }
        }

        if (cr) {
          return {
            ...edge,
            data: {
              ...edge.data,
              analyticsConversion: cr.rate,
              analyticsEnabled: true,
            },
          };
        }
        // Clear analytics data if no conversion data
        if ((edge.data as any)?.analyticsEnabled) {
          const { analyticsConversion, analyticsEnabled, ...rest } = edge.data as any;
          return { ...edge, data: rest };
        }
        return edge;
      })
    );
  }, [liveMode, analyticsStats, edges.length, nodes, getConversionRates, setEdges]);

  // Helper function to find the nearest anchor between two nodes
  const findNearestAnchors = useCallback((sourceNode: Node, targetNode: Node) => {
    const sourceWidth = sourceNode.measured?.width || (sourceNode.width as number) || 80;
    const sourceHeight = sourceNode.measured?.height || (sourceNode.height as number) || 80;
    const targetWidth = targetNode.measured?.width || (targetNode.width as number) || 80;
    const targetHeight = targetNode.measured?.height || (targetNode.height as number) || 80;

    // Use center points for direction calculation
    const sourceCenterX = sourceNode.position.x + sourceWidth / 2;
    const sourceCenterY = sourceNode.position.y + sourceHeight / 2;
    const targetCenterX = targetNode.position.x + targetWidth / 2;
    const targetCenterY = targetNode.position.y + targetHeight / 2;

    const dx = targetCenterX - sourceCenterX;
    const dy = targetCenterY - sourceCenterY;

    let bestSourceHandle: string;
    let bestTargetHandle: string;

    // Determine primary direction based on angle
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal: use right/left
      if (dx > 0) {
        bestSourceHandle = 'right-source';
        bestTargetHandle = 'left-target';
      } else {
        bestSourceHandle = 'left-source';
        bestTargetHandle = 'right-target';
      }
    } else {
      // Vertical: use bottom/top
      if (dy > 0) {
        bestSourceHandle = 'bottom-source';
        bestTargetHandle = 'top-target';
      } else {
        bestSourceHandle = 'top-source';
        bestTargetHandle = 'bottom-target';
      }
    }

    return { sourceHandle: bestSourceHandle, targetHandle: bestTargetHandle };
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'funnel',
            data: { label: '' },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Multi-connection with Shift+Click
  // Shift+Click on nodes to mark them as sources, then click (without shift) on target to connect all
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (event.shiftKey) {
        // Shift+Click: toggle this node as a multi-connect source
        event.stopPropagation();
        setMultiConnectSources((prev) => {
          if (prev.includes(node.id)) {
            // Deselect if already selected
            const next = prev.filter((id) => id !== node.id);
            multiConnectModeRef.current = next.length > 0;
            return next;
          }
          multiConnectModeRef.current = true;
          return [...prev, node.id];
        });
      } else if (multiConnectModeRef.current && multiConnectSources.length > 0) {
        // Normal click while in multi-connect mode: connect all sources to this target
        event.stopPropagation();
        const targetId = node.id;

        setNodes((currentNodes) => {
          const targetNode = currentNodes.find((n) => n.id === targetId);
          if (!targetNode) return currentNodes;

          const newEdges: Edge[] = [];
          for (const sourceId of multiConnectSources) {
            if (sourceId === targetId) continue; // Don't self-connect
            const sourceNode = currentNodes.find((n) => n.id === sourceId);
            if (!sourceNode) continue;

            const { sourceHandle, targetHandle } = findNearestAnchors(sourceNode, targetNode);
            const edgeId = `e-${sourceId}-${targetId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

            newEdges.push({
              id: edgeId,
              source: sourceId,
              target: targetId,
              sourceHandle,
              targetHandle,
              type: 'funnel',
              data: { label: '' },
            });
          }

          if (newEdges.length > 0) {
            setEdges((eds) => [...eds, ...newEdges]);
          }
          return currentNodes;
        });

        // Reset multi-connect mode
        setMultiConnectSources([]);
        multiConnectModeRef.current = false;
      }
    },
    [multiConnectSources, setEdges, setNodes, findNearestAnchors]
  );

  // Cancel multi-connect on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && multiConnectModeRef.current) {
        setMultiConnectSources([]);
        multiConnectModeRef.current = false;
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Update edge anchors ONLY for edges connected to the moved node
  const updateEdgeAnchorsForNode = useCallback((movedNodeId: string) => {
    setNodes((currentNodes) => {
      setEdges((currentEdges) => {
        return currentEdges.map((edge) => {
          // Only update edges connected to the moved node
          if (edge.source !== movedNodeId && edge.target !== movedNodeId) {
            return edge;
          }

          const sourceNode = currentNodes.find((n) => n.id === edge.source);
          const targetNode = currentNodes.find((n) => n.id === edge.target);

          if (sourceNode && targetNode) {
            const { sourceHandle, targetHandle } = findNearestAnchors(sourceNode, targetNode);
            
            // Only update if handles changed
            if (edge.sourceHandle !== sourceHandle || edge.targetHandle !== targetHandle) {
              return {
                ...edge,
                sourceHandle,
                targetHandle,
              };
            }
          }
          return edge;
        });
      });
      return currentNodes; // Return unchanged nodes
    });
  }, [setNodes, setEdges, findNearestAnchors]);

  // Edge reconnection handlers
  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeReconnectSuccessful.current = true;
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
    },
    [setEdges]
  );

  const onReconnectEnd = useCallback(
    (_: MouseEvent | TouchEvent, edge: Edge) => {
      if (!edgeReconnectSuccessful.current) {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }
      edgeReconnectSuccessful.current = true;
    },
    [setEdges]
  );

  // Magnetic snapping on node drag - store intended snap position
  const snapPositionRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  
  // Store initial positions when drag starts for group movement
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const isDraggingGroupRef = useRef(false);

  const onNodeDragStart = useCallback(
    (_: React.MouseEvent, draggedNode: Node) => {
      const draggedData = draggedNode.data as FunnelNodeData;
      const groupId = draggedData.groupId;
      
      // Store initial positions of all nodes in the group
      dragStartPositionsRef.current.clear();
      isDraggingGroupRef.current = false;
      
      if (groupId) {
        isDraggingGroupRef.current = true;
        nodes.forEach(node => {
          if ((node.data as FunnelNodeData).groupId === groupId) {
            dragStartPositionsRef.current.set(node.id, { ...node.position });
          }
        });
      }
    },
    [nodes]
  );

  const onNodeDrag = useCallback(
    (event: React.MouseEvent, draggedNode: Node, draggedNodes: Node[]) => {
      // Ctrl held = free movement, no snapping
      if (event.ctrlKey || event.metaKey) {
        setHelperLines({ horizontal: null, vertical: null });
        snapPositionRef.current = { x: null, y: null };
        return;
      }

      const draggedWidth = draggedNode.measured?.width ?? 160;
      const draggedHeight = draggedNode.measured?.height ?? 80;
      const draggedCenterX = draggedNode.position.x + draggedWidth / 2;
      const draggedCenterY = draggedNode.position.y + draggedHeight / 2;

      let snapX: number | null = null;
      let snapY: number | null = null;
      let helperLineX: number | null = null;
      let helperLineY: number | null = null;

      // Get the IDs of all nodes being dragged
      const draggedNodeIds = new Set(draggedNodes.map(n => n.id));

      // Check if any dragged node is in a group - if so, add all group members to draggedNodes
      const draggedData = draggedNode.data as FunnelNodeData;
      const groupId = draggedData.groupId;
      
      if (groupId && isDraggingGroupRef.current) {
        // Get all nodes in the same group
        const groupNodes = nodes.filter(n => (n.data as FunnelNodeData).groupId === groupId);
        groupNodes.forEach(n => draggedNodeIds.add(n.id));
        
        // Calculate delta from the INITIAL position (stored at drag start)
        const initialPosition = dragStartPositionsRef.current.get(draggedNode.id);
        if (initialPosition) {
          const deltaX = draggedNode.position.x - initialPosition.x;
          const deltaY = draggedNode.position.y - initialPosition.y;
          
          // Move all group nodes together based on their initial positions
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === draggedNode.id) return node; // Already moved by React Flow
              const nodeInitialPos = dragStartPositionsRef.current.get(node.id);
              if ((node.data as FunnelNodeData).groupId === groupId && nodeInitialPos) {
                return {
                  ...node,
                  position: {
                    x: nodeInitialPos.x + deltaX,
                    y: nodeInitialPos.y + deltaY,
                  },
                };
              }
              return node;
            })
          );
        }
      }

      nodes.forEach((node) => {
        // Skip if this node is being dragged
        if (draggedNodeIds.has(node.id)) return;

        const nodeWidth = node.measured?.width ?? 160;
        const nodeHeight = node.measured?.height ?? 80;
        const nodeCenterX = node.position.x + nodeWidth / 2;
        const nodeCenterY = node.position.y + nodeHeight / 2;

        // Check horizontal center alignment (priority)
        if (snapX === null && Math.abs(draggedCenterX - nodeCenterX) < SNAP_THRESHOLD) {
          snapX = nodeCenterX - draggedWidth / 2;
          helperLineX = nodeCenterX;
        }

        // Check vertical center alignment (priority)
        if (snapY === null && Math.abs(draggedCenterY - nodeCenterY) < SNAP_THRESHOLD) {
          snapY = nodeCenterY - draggedHeight / 2;
          helperLineY = nodeCenterY;
        }

        // Check left edge alignment (only if center didn't snap)
        if (snapX === null && Math.abs(draggedNode.position.x - node.position.x) < SNAP_THRESHOLD) {
          snapX = node.position.x;
          helperLineX = node.position.x;
        }

        // Check top edge alignment (only if center didn't snap)
        if (snapY === null && Math.abs(draggedNode.position.y - node.position.y) < SNAP_THRESHOLD) {
          snapY = node.position.y;
          helperLineY = node.position.y;
        }
      });

      setHelperLines({ horizontal: helperLineY, vertical: helperLineX });
      
      // Store snap position and apply immediately during drag
      snapPositionRef.current = { x: snapX, y: snapY };
      
      // Apply snap position immediately while dragging
      if (snapX !== null || snapY !== null) {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === draggedNode.id) {
              return {
                ...node,
                position: {
                  x: snapX !== null ? snapX : draggedNode.position.x,
                  y: snapY !== null ? snapY : draggedNode.position.y,
                },
              };
            }
            return node;
          })
        );
      }
    },
    [nodes, setNodes]
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, draggedNode: Node, draggedNodes: Node[]) => {
      setHelperLines({ horizontal: null, vertical: null });
      
      // Apply the snap position on drag stop to ensure it sticks
      const { x: snapX, y: snapY } = snapPositionRef.current;
      if (snapX !== null || snapY !== null) {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === draggedNode.id) {
              return {
                ...node,
                position: {
                  x: snapX !== null ? snapX : node.position.x,
                  y: snapY !== null ? snapY : node.position.y,
                },
              };
            }
            return node;
          })
        );
      }
      
      // Reset snap position ref
      snapPositionRef.current = { x: null, y: null };
    },
    [nodes, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow/type');
      const label = event.dataTransfer.getData('application/reactflow/label');

      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Handle standalone line - create two anchor nodes and an edge
      if (type === 'standalone-line') {
        const timestamp = Date.now();
        const startId = `line-anchor-${timestamp}-start`;
        const endId = `line-anchor-${timestamp}-end`;
        const edgeId = `line-edge-${timestamp}`;
        
        const startNode: Node = {
          id: startId,
          type: 'funnel',
          position,
          data: { label: '', type: 'line-anchor' } as FunnelNodeData,
          draggable: true,
          selectable: true,
        };
        
        const endNode: Node = {
          id: endId,
          type: 'funnel',
          position: { x: position.x + 150, y: position.y },
          data: { label: '', type: 'line-anchor' } as FunnelNodeData,
          draggable: true,
          selectable: true,
        };
        
        const newEdge: Edge = {
          id: edgeId,
          source: startId,
          target: endId,
          sourceHandle: 'right-source',
          targetHandle: 'left-target',
          type: 'funnel',
          data: { label: '', style: 'solid' },
        };
        
        setNodes((nds) => [...nds, startNode, endNode]);
        setEdges((eds) => [...eds, newEdge]);
        return;
      }

      // Use different node type for free-text and message
      const nodeType = type === 'free-text' ? 'free-text' : type === 'message' ? 'message' : 'funnel';

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: nodeType,
        position,
        data: { label, type } as FunnelNodeData,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, setEdges]
  );

  // Double-click to open config (skip for free-text nodes)
  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    const nodeData = node.data as FunnelNodeData;
    if (nodeData.type === 'free-text') {
      // Dispatch custom event to notify FreeTextNode to enter edit mode
      window.dispatchEvent(new CustomEvent('freetext-edit', { detail: { nodeId: node.id } }));
    } else {
      setSelectedNode(node);
    }
  }, []);

  const onMoveEnd = useCallback(() => {
    scheduleAutosave();
  }, [scheduleAutosave]);

  // Copy selected nodes (Ctrl+C)
  const handleCopy = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    if (selectedNodes.length > 0) {
      copiedNodesRef.current = selectedNodes.map((node) => ({
        ...node,
        data: { ...node.data },
      }));
      toast.success(`${selectedNodes.length} bloco(s) copiado(s)`);
    }
  }, [nodes]);

  // Paste copied nodes (Ctrl+V)
  const handlePaste = useCallback(() => {
    if (copiedNodesRef.current.length === 0) return;

    const PASTE_OFFSET = 50;
    const timestamp = Date.now();

    const newNodes = copiedNodesRef.current.map((node, index) => ({
      ...node,
      id: `${node.data.type}-${timestamp}-${index}`,
      position: {
        x: node.position.x + PASTE_OFFSET,
        y: node.position.y + PASTE_OFFSET,
      },
      selected: true,
      data: { ...node.data },
    }));

    // Deselect all existing nodes and add new ones
    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      ...newNodes,
    ]);

    // Update copied nodes positions for next paste
    copiedNodesRef.current = newNodes.map((node) => ({
      ...node,
      selected: false,
    }));

    toast.success(`${newNodes.length} bloco(s) colado(s)`);
  }, [setNodes]);

  // Undo/Redo history
  const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

  // Save to history
  const saveToHistory = useCallback(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    const newEntry = { nodes: [...nodes], edges: [...edges] };
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(newEntry);
    historyIndexRef.current = historyRef.current.length - 1;
    // Limit history to 50 entries
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
  }, [nodes, edges]);

  useEffect(() => {
    const timeout = setTimeout(saveToHistory, 500);
    return () => clearTimeout(timeout);
  }, [nodes, edges, saveToHistory]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      isUndoRedoRef.current = true;
      const entry = historyRef.current[historyIndexRef.current];
      setNodes(entry.nodes);
      setEdges(entry.edges);
    }
  }, [setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      isUndoRedoRef.current = true;
      const entry = historyRef.current[historyIndexRef.current];
      setNodes(entry.nodes);
      setEdges(entry.edges);
    }
  }, [setNodes, setEdges]);

  // Listen for delete-line-anchors events from edge deletion
  useEffect(() => {
    const handleDeleteLineAnchors = (event: CustomEvent<{ nodeIds: string[] }>) => {
      const { nodeIds } = event.detail;
      if (nodeIds && nodeIds.length > 0) {
        setNodes((nds) => nds.filter((node) => !nodeIds.includes(node.id)));
      }
    };
    
    window.addEventListener('delete-line-anchors', handleDeleteLineAnchors as EventListener);
    return () => {
      window.removeEventListener('delete-line-anchors', handleDeleteLineAnchors as EventListener);
    };
  }, [setNodes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // V - Selection mode
      if (event.key === 'v' || event.key === 'V') {
        setInteractionMode('select');
      }

      // H - Hand/Pan mode
      if (event.key === 'h' || event.key === 'H') {
        setInteractionMode('pan');
      }

      // Ctrl+Z / Cmd+Z - Undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z - Redo
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z') {
        event.preventDefault();
        handleRedo();
      }

      // Ctrl+C / Cmd+C - Copy
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        event.preventDefault();
        handleCopy();
      }

      // Ctrl+V / Cmd+V - Paste
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        event.preventDefault();
        handlePaste();
      }

      // Ctrl+D / Cmd+D - Duplicate
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault();
        handleCopy();
        setTimeout(() => handlePaste(), 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy, handlePaste, handleUndo, handleRedo, setInteractionMode]);

  // Count selected nodes
  const selectedNodesCount = nodes.filter((node) => node.selected).length;

  // Check if any selected node is part of a group
  const hasGroupedSelection = nodes.some(
    (node) => node.selected && (node.data as FunnelNodeData).groupId
  );

  // Group selected nodes
  const handleGroupNodes = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    if (selectedNodes.length < 2) return;

    const groupId = `group-${Date.now()}`;
    
    setNodes((nds) =>
      nds.map((node) => {
        if (node.selected) {
          return {
            ...node,
            data: {
              ...node.data,
              groupId,
            },
          };
        }
        return node;
      })
    );

    toast.success(`${selectedNodes.length} blocos agrupados!`);
  }, [nodes, setNodes]);

  // Ungroup selected nodes
  const handleUngroupNodes = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    const groupedNodes = selectedNodes.filter(
      (node) => (node.data as FunnelNodeData).groupId
    );
    
    if (groupedNodes.length === 0) return;

    // Get all unique group IDs from selected nodes
    const groupIds = new Set(
      groupedNodes.map((node) => (node.data as FunnelNodeData).groupId)
    );

    setNodes((nds) =>
      nds.map((node) => {
        const nodeData = node.data as FunnelNodeData;
        if (nodeData.groupId && groupIds.has(nodeData.groupId)) {
          const { groupId: _, ...restData } = nodeData;
          return {
            ...node,
            data: restData,
          };
        }
        return node;
      })
    );

    toast.success('Blocos desagrupados!');
  }, [nodes, setNodes]);

  // Export funnel as JSON
  const handleExportJson = useCallback(() => {
    if (!reactFlowInstance) return;

    const viewport = reactFlowInstance.getViewport();
    const exportData = {
      name: funnel.name,
      funnel_type: funnel.funnel_type || 'funnelytics',
      nodes,
      edges,
      viewport,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${funnel.name || 'funnel'}-backup.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Funil exportado como JSON!');
  }, [funnel.name, nodes, edges, reactFlowInstance]);

  // Import funnel from JSON
  const handleImportJson = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);

          if (!data.nodes || !data.edges) {
            toast.error('Arquivo JSON inválido');
            return;
          }

          setNodes(data.nodes);
          setEdges(data.edges);

          if (data.viewport && reactFlowInstance) {
            reactFlowInstance.setViewport(data.viewport);
          }

          toast.success('Funil importado com sucesso!');
        } catch (error) {
          toast.error('Erro ao importar funil');
        }
      };
      reader.readAsText(file);
    },
    [setNodes, setEdges, reactFlowInstance]
  );

  const handleExport = async (format: 'png' | 'svg') => {
    if (!reactFlowWrapper.current) return;

    try {
      const dataUrl =
        format === 'png'
          ? await toPng(reactFlowWrapper.current, {
              backgroundColor: '#0f0f12',
              quality: 1,
            })
          : await toSvg(reactFlowWrapper.current, {
              backgroundColor: '#0f0f12',
            });

      const link = document.createElement('a');
      link.download = `${funnel.name || 'funnel'}.${format}`;
      link.href = dataUrl;
      link.click();
      toast.success(`Funil exportado como ${format.toUpperCase()}!`);
    } catch (error) {
      toast.error('Erro ao exportar funil');
    }
  };

  return (
    <div className="flex h-full">
      <FunnelElementsSidebar collapsed={sidebarCollapsed} />

      <div className="flex-1 relative">
        {/* Toggle sidebar button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-4 left-4 z-10 bg-[#1a1a1f]/80 hover:bg-[#2a2a30] border border-[#2a2a30]"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>

        {/* Floating Toolbar */}
        <FunnelFloatingToolbar
          onExport={handleExport}
          onExportJson={handleExportJson}
          onImportJson={handleImportJson}
          isSaving={isSaving}
          liveMode={liveMode}
          onLiveModeChange={setLiveMode}
          interactionMode={interactionMode}
          onInteractionModeChange={setInteractionMode}
          selectedNodesCount={selectedNodesCount}
          onGroupNodes={handleGroupNodes}
          onUngroupNodes={handleUngroupNodes}
          hasGroupedSelection={hasGroupedSelection}
          educationalMode={educationalMode}
          onEducationalModeChange={setEducationalMode}
          onOpenTracking={() => setTrackingDialogOpen(true)}
          hasTrackingToken={!!trackingToken}
        />

        {/* React Flow Canvas wrapped in Educational Context */}
        <FunnelEducationalContext.Provider value={{ educationalMode }}>
          <div ref={reactFlowWrapper} className="h-full">
            <ReactFlow
              nodes={nodes.map((n) => multiConnectSources.includes(n.id) ? { ...n, className: `${n.className || ''} multi-connect-source`.trim() } : n)}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onReconnectStart={onReconnectStart}
              onReconnect={onReconnect}
              onReconnectEnd={onReconnectEnd}
              onNodeDragStart={onNodeDragStart}
              onNodeDrag={onNodeDrag}
              onNodeDragStop={onNodeDragStop}
              onMoveEnd={onMoveEnd}
              onInit={(instance) => setReactFlowInstance(instance as ReactFlowInstance<Node, Edge>)}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeDoubleClick={onNodeDoubleClick}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={{ type: 'funnel' }}
              connectionMode={ConnectionMode.Loose}
              panOnDrag={interactionMode === 'pan' ? true : [1, 2]}
              panOnScroll={false}
              zoomOnScroll
              selectionOnDrag={interactionMode === 'select'}
              selectionMode={SelectionMode.Partial}
              edgesReconnectable
              edgesFocusable
              elementsSelectable
              deleteKeyCode={['Delete', 'Backspace']}
              snapToGrid
              snapGrid={[20, 20]}
              className="bg-[#0f0f12]"
              proOptions={{ hideAttribution: true }}
            >
              <Controls 
                className="!bg-[#1a1a1f] !border-[#2a2a30] !rounded-lg !shadow-xl"
                showInteractive={false}
              />
              <Background
                variant={BackgroundVariant.Dots}
                gap={24}
                size={1.5}
                color="rgba(255,255,255,0.05)"
              />
            </ReactFlow>

            {/* Multi-connect mode indicator */}
            {multiConnectSources.length > 0 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-primary/90 text-primary-foreground text-sm font-medium shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>{multiConnectSources.length} {multiConnectSources.length === 1 ? 'bloco selecionado' : 'blocos selecionados'} — clique no destino para conectar</span>
                <button
                  onClick={() => { setMultiConnectSources([]); multiConnectModeRef.current = false; }}
                  className="ml-1 w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </FunnelEducationalContext.Provider>

        {/* Analytics Panel - shown when liveMode is active */}
        {liveMode && (
          <FunnelAnalyticsPanel
            totalVisitors={getTotalVisitors()}
            totalPageviews={getTotalPageviews()}
            timeRangeHours={analyticsTimeRange}
            onTimeRangeChange={setAnalyticsTimeRange}
            isLoading={analyticsLoading}
            hasTrackingToken={!!trackingToken}
          />
        )}

        {/* Node Config Sheet */}
        <FunnelNodeConfigSheet
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          funnelId={funnel.id}
          liveMode={liveMode}
          analyticsTimeRange={analyticsTimeRange}
        />

        {/* Tracking Script Dialog */}
        <FunnelTrackingDialog
          open={trackingDialogOpen}
          onOpenChange={setTrackingDialogOpen}
          funnel={funnel}
          nodes={nodes}
          onTokenGenerated={(token) => setTrackingToken(token)}
        />
      </div>
    </div>
  );
}

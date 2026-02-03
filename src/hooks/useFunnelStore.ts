import { useCallback, useState, useEffect, useRef } from 'react';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
} from '@xyflow/react';
import type { FunnelNode, FunnelEdge, FunnelState, NodeType } from '@/types/funnel';
import { NODE_TYPE_CONFIG } from '@/types/funnel';

interface HistoryState {
  nodes: FunnelNode[];
  edges: FunnelEdge[];
}

const MAX_HISTORY_SIZE = 50;

const STORAGE_KEY = 'funnel-builder-state';

const initialNodes: FunnelNode[] = [
  {
    id: 'sales-1',
    type: 'funnelNode',
    position: { x: 250, y: 50 },
    data: {
      label: 'Sales Page',
      nodeType: 'salesPage',
      buttonLabel: 'Buy Now',
    },
  },
  {
    id: 'order-1',
    type: 'funnelNode',
    position: { x: 250, y: 300 },
    data: {
      label: 'Order Page',
      nodeType: 'orderPage',
      buttonLabel: 'Complete Order',
    },
  },
  {
    id: 'thankyou-1',
    type: 'funnelNode',
    position: { x: 250, y: 550 },
    data: {
      label: 'Thank You',
      nodeType: 'thankYou',
      buttonLabel: 'Continue',
    },
  },
];

const initialEdges: FunnelEdge[] = [
  { id: 'e-sales-order', source: 'sales-1', target: 'order-1', animated: true },
  { id: 'e-order-thankyou', source: 'order-1', target: 'thankyou-1', animated: true },
];

// Track counts for auto-incrementing labels
const createLabelCounter = () => {
  const counts: Record<NodeType, number> = {
    salesPage: 1,
    orderPage: 1,
    upsell: 0,
    downsell: 0,
    thankYou: 1,
  };
  return counts;
};

export function useFunnelStore() {
  const [nodes, setNodes] = useState<FunnelNode[]>([]);
  const [edges, setEdges] = useState<FunnelEdge[]>([]);
  const [labelCounts, setLabelCounts] = useState(createLabelCounter);
  const [isInitialized, setIsInitialized] = useState(false);

  // Undo/Redo state - use React state so changes are reactive
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const currentIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const isValidationUpdateRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep ref in sync with state for reading in callbacks
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (dragDebounceTimerRef.current) {
        clearTimeout(dragDebounceTimerRef.current);
      }
    };
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state: FunnelState = JSON.parse(saved);
        setNodes(state.nodes);
        setEdges(state.edges);

        // Reconstruct label counts from saved nodes
        const counts = createLabelCounter();
        state.nodes.forEach((node) => {
          const match = node.data.label.match(/(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num >= counts[node.data.nodeType]) {
              counts[node.data.nodeType] = num;
            }
          } else {
            counts[node.data.nodeType] = Math.max(counts[node.data.nodeType], 1);
          }
        });
        setLabelCounts(counts);
      } else {
        setNodes(initialNodes);
        setEdges(initialEdges);
      }
    } catch (e) {
      console.error('Failed to load funnel state:', e);
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage on changes and track history
  useEffect(() => {
    if (isInitialized) {
      const state: FunnelState = { nodes, edges };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      // Skip history tracking during initial load or undo/redo
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        // Initialize history with first state
        const initialState: HistoryState = {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
        };
        setHistory([initialState]);
        setCurrentIndex(0);
        return;
      }

      if (isUndoRedoRef.current) {
        isUndoRedoRef.current = false;
        return;
      }

      // Skip history entries for internal validation-only node updates
      if (isValidationUpdateRef.current) {
        isValidationUpdateRef.current = false;
        return;
      }

      // If dragging, debounce history snapshot to avoid creating entry per pixel
      if (isDraggingRef.current) {
        // Clear existing timer
        if (dragDebounceTimerRef.current) {
          clearTimeout(dragDebounceTimerRef.current);
        }

        // Capture current state for the timer callback
        const currentNodes = JSON.parse(JSON.stringify(nodes));
        const currentEdges = JSON.parse(JSON.stringify(edges));

        // Set new timer to create history after drag ends (300ms delay)
        dragDebounceTimerRef.current = setTimeout(() => {
          isDraggingRef.current = false;
          dragDebounceTimerRef.current = null;

          // Create history snapshot after drag ends using captured state
          const currentState: HistoryState = {
            nodes: currentNodes,
            edges: currentEdges,
          };

          setHistory((prevHistory) => {
            const sliced = prevHistory.slice(0, currentIndexRef.current + 1);
            const nextHistory = [...sliced, currentState];

            let nextIndex: number;
            if (nextHistory.length > MAX_HISTORY_SIZE) {
              nextHistory.shift();
              nextIndex = MAX_HISTORY_SIZE - 1;
            } else {
              nextIndex = nextHistory.length - 1;
            }

            setCurrentIndex(nextIndex);
            return nextHistory;
          });
        }, 300);

        return;
      }

      // Take snapshot for undo/redo (non-dragging changes)
      const currentState: HistoryState = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      };

      // Build new history array, dropping any \"future\" states if we've undone
      setHistory((prevHistory) => {
        const sliced = prevHistory.slice(0, currentIndexRef.current + 1);
        const nextHistory = [...sliced, currentState];

        // Enforce max history size and compute new index
        let nextIndex: number;
        if (nextHistory.length > MAX_HISTORY_SIZE) {
          nextHistory.shift();
          nextIndex = MAX_HISTORY_SIZE - 1;
        } else {
          nextIndex = nextHistory.length - 1;
        }

        setCurrentIndex(nextIndex);
        return nextHistory;
      });
    }
  }, [nodes, edges, isInitialized]);

  // Validate funnel and update warnings
  useEffect(() => {
    if (!isInitialized) return;

    // Mark that the next nodes update comes from validation logic
    isValidationUpdateRef.current = true;

    setNodes((nds) =>
      nds.map((node) => {
        const outgoingEdges = edges.filter((e) => e.source === node.id);
        let hasWarning = false;
        let warningMessage = '';

        // Sales page should have exactly one outgoing edge
        if (node.data.nodeType === 'salesPage') {
          if (outgoingEdges.length === 0) {
            hasWarning = true;
            warningMessage = 'Sales page should connect to an Order page';
          } else if (outgoingEdges.length > 1) {
            hasWarning = true;
            warningMessage = 'Sales page should have only one outgoing connection';
          }
        }

        // Check for orphan nodes (no incoming edges except sales page)
        if (node.data.nodeType !== 'salesPage') {
          const incomingEdges = edges.filter((e) => e.target === node.id);
          if (incomingEdges.length === 0) {
            hasWarning = true;
            warningMessage = 'This node is not connected to the funnel';
          }
        }

        if (node.data.hasWarning !== hasWarning || node.data.warningMessage !== warningMessage) {
          return {
            ...node,
            data: { ...node.data, hasWarning, warningMessage },
          };
        }
        return node;
      })
    );
  }, [edges, isInitialized]);

  const onNodesChange: OnNodesChange<FunnelNode> = useCallback(
    (changes) => {
      // Detect position changes - these indicate dragging
      const hasPositionChange = changes.some(
        (change) => change.type === 'position' && change.position !== undefined
      );

      if (hasPositionChange) {
        // Mark as dragging - history will be debounced
        isDraggingRef.current = true;
      } else {
        // Non-position change (select, remove, etc.) - not dragging
        isDraggingRef.current = false;
      }

      setNodes((nds) => applyNodeChanges(changes, nds) as FunnelNode[]);
    },
    []
  );

  const onEdgesChange: OnEdgesChange<FunnelEdge> = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      // Prevent connecting from Thank You nodes
      const sourceNode = nodes.find((n) => n.id === connection.source);
      if (sourceNode?.data.nodeType === 'thankYou') {
        return;
      }

      setEdges((eds) =>
        addEdge({ ...connection, animated: true }, eds)
      );
    },
    [nodes]
  );

  const addNode = useCallback(
    (nodeType: NodeType, position: { x: number; y: number }) => {
      const config = NODE_TYPE_CONFIG[nodeType];

      setLabelCounts((prev) => {
        const newCount = prev[nodeType] + 1;
        const newCounts = { ...prev, [nodeType]: newCount };

        // Create the label
        let label = config.label;
        if (nodeType === 'upsell' || nodeType === 'downsell') {
          label = `${config.label} ${newCount}`;
        } else if (newCount > 1) {
          label = `${config.label} ${newCount}`;
        }

        const newNode: FunnelNode = {
          id: `${nodeType}-${Date.now()}`,
          type: 'funnelNode',
          position,
          data: {
            label,
            nodeType,
            buttonLabel: config.defaultButtonLabel,
          },
        };

        setNodes((nds) => [...nds, newNode]);

        return newCounts;
      });
    },
    []
  );

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, []);

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
  }, []);

  const exportFunnel = useCallback(() => {
    const state: FunnelState = { nodes, edges };
    return JSON.stringify(state, null, 2);
  }, [nodes, edges]);

  const importFunnel = useCallback((json: string) => {
    try {
      const state: FunnelState = JSON.parse(json);
      if (!state.nodes || !state.edges) {
        throw new Error('Invalid funnel format');
      }
      setNodes(state.nodes);
      setEdges(state.edges);

      // Reset history to imported state
      const importedState: HistoryState = {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      };
      setHistory([importedState]);
      setCurrentIndex(0);

      // Reconstruct label counts
      const counts = createLabelCounter();
      state.nodes.forEach((node) => {
        const match = node.data.label.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= counts[node.data.nodeType]) {
            counts[node.data.nodeType] = num;
          }
        }
      });
      setLabelCounts(counts);

      return true;
    } catch (e) {
      console.error('Failed to import funnel:', e);
      return false;
    }
  }, []);

  const clearFunnel = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setLabelCounts(createLabelCounter());

    // Reset history to empty state
    const emptyState: HistoryState = { nodes: [], edges: [] };
    setHistory([emptyState]);
    setCurrentIndex(0);
  }, []);

  const getValidationErrors = useCallback(() => {
    const errors: string[] = [];

    // Check for orphan nodes
    const orphanNodes = nodes.filter((node) => {
      if (node.data.nodeType === 'salesPage') return false;
      return !edges.some((e) => e.target === node.id);
    });

    if (orphanNodes.length > 0) {
      errors.push(`${orphanNodes.length} orphan node(s) not connected to funnel`);
    }

    // Check for missing Thank You page
    const hasThankYou = nodes.some((n) => n.data.nodeType === 'thankYou');
    if (!hasThankYou && nodes.length > 0) {
      errors.push('No Thank You page in funnel');
    }

    // Check for Sales Page connection
    const salesPages = nodes.filter((n) => n.data.nodeType === 'salesPage');
    salesPages.forEach((sp) => {
      const outgoing = edges.filter((e) => e.source === sp.id);
      if (outgoing.length === 0) {
        errors.push(`${sp.data.label} has no outgoing connection`);
      }
    });

    return errors;
  }, [nodes, edges]);

  // Undo function
  const undo = useCallback(() => {
    if (currentIndex <= 0) return;

    isUndoRedoRef.current = true;
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    const previousState = history[newIndex];

    if (previousState) {
      setNodes(JSON.parse(JSON.stringify(previousState.nodes)));
      setEdges(JSON.parse(JSON.stringify(previousState.edges)));
    }
  }, [currentIndex, history]);

  // Redo function
  const redo = useCallback(() => {
    if (currentIndex >= history.length - 1) return;

    isUndoRedoRef.current = true;
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    const nextState = history[newIndex];

    if (nextState) {
      setNodes(JSON.parse(JSON.stringify(nextState.nodes)));
      setEdges(JSON.parse(JSON.stringify(nextState.edges)));
    }
  }, [currentIndex, history]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    deleteNode,
    deleteEdge,
    exportFunnel,
    importFunnel,
    clearFunnel,
    getValidationErrors,
    isInitialized,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}

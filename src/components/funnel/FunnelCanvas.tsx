import { useCallback, useRef, type DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  MarkerType,
  type NodeTypes,
  type DefaultEdgeOptions,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { FunnelNode } from './FunnelNode';
import { NodePalette } from './NodePalette';
import { FunnelToolbar } from './FunnelToolbar';
import { useFunnelStore } from '@/hooks/useFunnelStore';
import type { NodeType } from '@/types/funnel';

const nodeTypes: NodeTypes = {
  funnelNode: FunnelNode,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
  },
  style: {
    strokeWidth: 2,
  },
};

export function FunnelCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow();
  
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    exportFunnel,
    importFunnel,
    clearFunnel,
    getValidationErrors,
    isInitialized,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useFunnelStore();

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!nodeType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(nodeType, position);
    },
    [screenToFlowPosition, addNode]
  );

  const validationErrors = getValidationErrors();

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <div className="text-muted-foreground">Loading funnel...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      <NodePalette />
      
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <FunnelToolbar
          onExport={exportFunnel}
          onImport={importFunnel}
          onClear={clearFunnel}
          validationErrors={validationErrors}
          onZoomIn={() => zoomIn()}
          onZoomOut={() => zoomOut()}
          onFitView={() => fitView({ padding: 0.2 })}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          className="canvas-container"
          deleteKeyCode={['Backspace', 'Delete']}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            className="!bg-canvas"
          />
          <Controls 
            showInteractive={false}
            className="!bg-card !border-border !shadow-md"
          />
          <MiniMap 
            nodeStrokeWidth={3}
            className="!bg-card !border-border !shadow-md"
            maskColor="hsl(var(--muted) / 0.5)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

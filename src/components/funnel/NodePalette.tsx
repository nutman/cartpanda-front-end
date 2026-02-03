import { type DragEvent } from 'react';
import { Megaphone, ShoppingCart, TrendingUp, TrendingDown, Heart, GripVertical } from 'lucide-react';
import { NODE_TYPE_CONFIG, type NodeType } from '@/types/funnel';
import { cn } from '@/lib/utils';

const iconMap = {
  Megaphone,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Heart,
};

const getNodeColorClasses = (nodeType: NodeType) => {
  const colorMap: Record<NodeType, { bg: string; text: string }> = {
    salesPage: { bg: 'bg-node-sales/10', text: 'text-node-sales' },
    orderPage: { bg: 'bg-node-order/10', text: 'text-node-order' },
    upsell: { bg: 'bg-node-upsell/10', text: 'text-node-upsell' },
    downsell: { bg: 'bg-node-downsell/10', text: 'text-node-downsell' },
    thankYou: { bg: 'bg-node-thankyou/10', text: 'text-node-thankyou' },
  };
  return colorMap[nodeType];
};

const getNodeSolidColorClass = (nodeType: NodeType) => {
  const colorMap: Record<NodeType, string> = {
    salesPage: 'bg-node-sales',
    orderPage: 'bg-node-order',
    upsell: 'bg-node-upsell',
    downsell: 'bg-node-downsell',
    thankYou: 'bg-node-thankyou',
  };
  return colorMap[nodeType];
};

interface NodePaletteItemProps {
  nodeType: NodeType;
}

function NodePaletteItem({ nodeType }: NodePaletteItemProps) {
  const config = NODE_TYPE_CONFIG[nodeType];
  const IconComponent = iconMap[config.icon as keyof typeof iconMap];
  const colors = getNodeColorClasses(nodeType);

  const onDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="palette-item group"
      draggable
      onDragStart={onDragStart}
    >
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', getNodeSolidColorClass(nodeType))}>
        <IconComponent className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-foreground">{config.label}</h4>
        <p className="text-xs text-muted-foreground truncate">{config.description}</p>
      </div>
      <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export function NodePalette() {
  const nodeTypes: NodeType[] = ['salesPage', 'orderPage', 'upsell', 'downsell', 'thankYou'];

  return (
    <div className="w-72 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="font-semibold text-lg text-sidebar-foreground">Funnel Steps</h2>
        <p className="text-sm text-muted-foreground mt-1">Drag elements to the canvas</p>
      </div>
      
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {nodeTypes.map((nodeType) => (
          <NodePaletteItem key={nodeType} nodeType={nodeType} />
        ))}
      </div>
      
      <div className="p-4 border-t border-sidebar-border bg-secondary/30 space-y-2">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Tip:</span> Connect nodes by dragging from one handle to another
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Delete:</span> Select a node or edge and press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Delete</kbd> or <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Backspace</kbd>
        </p>
      </div>
    </div>
  );
}

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Megaphone, ShoppingCart, TrendingUp, TrendingDown, Heart, AlertTriangle } from 'lucide-react';
import type { FunnelNode as FunnelNodeType, NodeType } from '@/types/funnel';
import { NODE_TYPE_CONFIG } from '@/types/funnel';
import { cn } from '@/lib/utils';

const iconMap = {
  Megaphone,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Heart,
};

const getNodeColorClasses = (nodeType: NodeType) => {
  const colorMap: Record<NodeType, { bg: string; text: string; border: string }> = {
    salesPage: { bg: 'bg-node-sales/10', text: 'text-node-sales', border: 'border-node-sales/30' },
    orderPage: { bg: 'bg-node-order/10', text: 'text-node-order', border: 'border-node-order/30' },
    upsell: { bg: 'bg-node-upsell/10', text: 'text-node-upsell', border: 'border-node-upsell/30' },
    downsell: { bg: 'bg-node-downsell/10', text: 'text-node-downsell', border: 'border-node-downsell/30' },
    thankYou: { bg: 'bg-node-thankyou/10', text: 'text-node-thankyou', border: 'border-node-thankyou/30' },
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

function FunnelNodeComponent({ data, selected }: NodeProps<FunnelNodeType>) {
  const config = NODE_TYPE_CONFIG[data.nodeType];
  const IconComponent = iconMap[config.icon as keyof typeof iconMap];
  const colors = getNodeColorClasses(data.nodeType);
  const canHaveOutgoing = config.canHaveOutgoing;

  return (
    <div
      className={cn(
        'funnel-node w-56 overflow-hidden',
        selected && 'selected ring-2 ring-primary ring-offset-2'
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="node-handle !-top-1.5"
      />

      {/* Header */}
      <div className={cn('px-4 py-3 flex items-center gap-3', colors.bg, colors.border, 'border-b')}>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', getNodeSolidColorClass(data.nodeType))}>
          <IconComponent className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">{data.label}</h3>
          <p className={cn('text-xs', colors.text)}>{config.label}</p>
        </div>
        {data.hasWarning && (
          <div className="flex-shrink-0" title={data.warningMessage}>
            <AlertTriangle className="w-4 h-4 text-warning" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Placeholder thumbnail */}
        <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', colors.bg)}>
            <IconComponent className={cn('w-5 h-5', colors.text)} />
          </div>
        </div>

        {/* Button preview */}
        <div 
          className={cn(
            'w-full py-2 px-3 rounded-lg text-center text-xs font-medium text-white',
            getNodeSolidColorClass(data.nodeType)
          )}
        >
          {data.buttonLabel}
        </div>
      </div>

      {/* Output Handle */}
      {canHaveOutgoing && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="node-handle !-bottom-1.5"
        />
      )}
    </div>
  );
}

export const FunnelNode = memo(FunnelNodeComponent);

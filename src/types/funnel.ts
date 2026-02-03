import type { Node, Edge, BuiltInNode } from '@xyflow/react';

export type NodeType = 'salesPage' | 'orderPage' | 'upsell' | 'downsell' | 'thankYou';

export interface FunnelNodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeType;
  buttonLabel: string;
  hasWarning?: boolean;
  warningMessage?: string;
}

export type FunnelNode = Node<FunnelNodeData, 'funnelNode'>;
export type FunnelEdge = Edge;
export type AppNode = FunnelNode | BuiltInNode;

export interface FunnelState {
  nodes: FunnelNode[];
  edges: FunnelEdge[];
}

export const NODE_TYPE_CONFIG: Record<NodeType, {
  label: string;
  defaultButtonLabel: string;
  color: string;
  icon: string;
  canHaveOutgoing: boolean;
  description: string;
}> = {
  salesPage: {
    label: 'Sales Page',
    defaultButtonLabel: 'Buy Now',
    color: 'node-sales',
    icon: 'Megaphone',
    canHaveOutgoing: true,
    description: 'Landing page to pitch your offer',
  },
  orderPage: {
    label: 'Order Page',
    defaultButtonLabel: 'Complete Order',
    color: 'node-order',
    icon: 'ShoppingCart',
    canHaveOutgoing: true,
    description: 'Checkout form for the purchase',
  },
  upsell: {
    label: 'Upsell',
    defaultButtonLabel: 'Yes, Add This!',
    color: 'node-upsell',
    icon: 'TrendingUp',
    canHaveOutgoing: true,
    description: 'Additional offer after purchase',
  },
  downsell: {
    label: 'Downsell',
    defaultButtonLabel: 'Get This Instead',
    color: 'node-downsell',
    icon: 'TrendingDown',
    canHaveOutgoing: true,
    description: 'Alternative offer if upsell declined',
  },
  thankYou: {
    label: 'Thank You',
    defaultButtonLabel: 'Continue',
    color: 'node-thankyou',
    icon: 'Heart',
    canHaveOutgoing: false,
    description: 'Confirmation page after purchase',
  },
};

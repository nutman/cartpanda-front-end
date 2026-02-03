import { ReactFlowProvider } from '@xyflow/react';
import { FunnelCanvas } from '@/components/funnel/FunnelCanvas';

const Index = () => {
  return (
    <ReactFlowProvider>
      <FunnelCanvas />
    </ReactFlowProvider>
  );
};

export default Index;

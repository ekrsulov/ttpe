import React from 'react';
import { Tooltip } from '@chakra-ui/react';
import type { TooltipProps } from '@chakra-ui/react';
import { useCanvasStore } from '../store/canvasStore';
import { useIsMobile } from '../hooks/useIsMobile';

const ConditionalTooltip: React.FC<TooltipProps> = ({ children, ...props }) => {
  const isMobile = useIsMobile();
  const showTooltips = useCanvasStore(state => state.settings.showTooltips);

  // Hide tooltips on mobile or when disabled in settings
  if (!showTooltips || isMobile) {
    return <>{children}</>;
  }

  return <Tooltip {...props}>{children}</Tooltip>;
};

export default ConditionalTooltip;
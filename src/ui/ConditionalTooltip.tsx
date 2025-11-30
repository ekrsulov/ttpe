import React from 'react';
import { Tooltip } from '@chakra-ui/react';
import type { TooltipProps } from '@chakra-ui/react';
import { useCanvasStore } from '../store/canvasStore';
import { useResponsive } from '../hooks';

const ConditionalTooltip: React.FC<TooltipProps> = ({ children, ...props }) => {
  const { isMobile } = useResponsive();
  const showTooltips = useCanvasStore(state => state.settings.showTooltips);

  // Hide tooltips on mobile or when disabled in settings
  if (!showTooltips || isMobile) {
    return <>{children}</>;
  }

  return <Tooltip {...props}>{children}</Tooltip>;
};

export default ConditionalTooltip;
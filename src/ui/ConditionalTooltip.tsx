import React, { useState, useEffect } from 'react';
import { Tooltip } from '@chakra-ui/react';
import type { TooltipProps } from '@chakra-ui/react';
import { useCanvasStore } from '../store/canvasStore';

const ConditionalTooltip: React.FC<TooltipProps> = ({ children, ...props }) => {
  const [isMobile, setIsMobile] = useState(false);
  const showTooltips = useCanvasStore(state => state.settings.showTooltips);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // If tooltips are disabled in settings, just return the children directly
  if (!showTooltips) {
    return <>{children}</>;
  }

  if (isMobile) {
    return <>{children}</>;
  }

  return <Tooltip {...props}>{children}</Tooltip>;
};

export default ConditionalTooltip;
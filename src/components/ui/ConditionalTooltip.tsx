import React, { useState, useEffect } from 'react';
import { Tooltip } from '@chakra-ui/react';
import type { TooltipProps } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';

const ConditionalTooltip: React.FC<TooltipProps> = ({ children, ...props }) => {
  const [isMobile, setIsMobile] = useState(false);
  const showTooltips = useCanvasStore(state => state.settings.showTooltips);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const content = <span style={{ whiteSpace: 'pre' }}>{children}</span>;

  // If tooltips are disabled in settings, just return the content
  if (!showTooltips) {
    return content;
  }

  if (isMobile) {
    return content;
  }

  return <Tooltip {...props}>{content}</Tooltip>;
};

export default ConditionalTooltip;
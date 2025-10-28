import React, { useState, useEffect } from 'react';
import { Tooltip } from '@chakra-ui/react';
import type { TooltipProps } from '@chakra-ui/react';

const ConditionalTooltip: React.FC<TooltipProps> = ({ children, ...props }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const content = <span style={{ whiteSpace: 'pre' }}>{children}</span>;

  if (isMobile) {
    return content;
  }

  return <Tooltip {...props}>{content}</Tooltip>;
};

export default ConditionalTooltip;
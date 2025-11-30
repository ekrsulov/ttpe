import React, { useState } from 'react';
import {
  Box,
  VStack,
  IconButton,
  Collapse,
} from '@chakra-ui/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { pluginManager } from '../utils/pluginManager';
import { useExpandablePanelColors, useToolbarPosition } from '../hooks';

interface ExpandableToolPanelProps {
  activePlugin: string | null;
  sidebarWidth?: number;
}

export const ExpandableToolPanel: React.FC<ExpandableToolPanelProps> = ({ activePlugin, sidebarWidth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { bg, borderColor, iconColor, hoverBg } = useExpandablePanelColors();
  const { isSidebarPinned } = useToolbarPosition(sidebarWidth);
  
  const PanelComponent = activePlugin ? pluginManager.getExpandablePanel(activePlugin) : null;
  
  if (!PanelComponent || isSidebarPinned) {
    return null;
  }
  
  const toggleExpand = () => setIsExpanded(!isExpanded);
  
  const leftPosition = sidebarWidth > 0
    ? `calc(50% - ${sidebarWidth / 2}px)`
    : '50%';
  
  return (
    <Box
      position="fixed"
      bottom={{ base: isExpanded ? "48px" : "44px", md: isExpanded ? "60px" : "56px" }}
      left={leftPosition}
      transform="translateX(-50%)"
      zIndex={998}
      maxW={{ base: '90vw', md: '600px' }}
      w="auto"
      transition="left 0.3s ease-in-out"
    >
      <VStack spacing={0} align="stretch">
        <Box
          bg={bg}
          borderRadius={isExpanded ? "12px 12px 0 0" : "full"}
          borderWidth="1px"
          borderColor={borderColor}
          borderBottom={isExpanded ? "0.5" : "mone"}
          display="flex"
          justifyContent="center"
          cursor="pointer"
          onClick={toggleExpand}
          _hover={{ bg: hoverBg }}
          transition="background 0.2s"
        >
          <IconButton
            icon={isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand();
            }}
            aria-label={isExpanded ? "Collapse options" : "Expand options"}
            size={isExpanded ? "xxs" : "xs"}
            variant="ghost"
            color={iconColor}
            _hover={{ bg: 'transparent' }}
            pointerEvents="none"
          />
        </Box>
        
        <Collapse in={isExpanded} animateOpacity>
          <Box
            bg={bg}
            borderWidth="1px"
            borderColor={borderColor}
            borderTop="none"
            p={{ base: 2, md: 3 }}
            boxShadow="0 -2px 8px rgba(0, 0, 0, 0.1)"
            minW="250px"
            overflow="hidden"
          >
            <PanelComponent />
          </Box>
        </Collapse>
      </VStack>
    </Box>
  );
};

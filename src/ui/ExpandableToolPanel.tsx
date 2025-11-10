import React, { useState } from 'react';
import {
  Box,
  VStack,
  IconButton,
  Collapse,
  useColorModeValue,
} from '@chakra-ui/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { pluginManager } from '../utils/pluginManager';

interface ExpandableToolPanelProps {
  activePlugin: string | null;
  sidebarWidth?: number;
}

export const ExpandableToolPanel: React.FC<ExpandableToolPanelProps> = ({ activePlugin, sidebarWidth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const bg = useColorModeValue('rgba(255, 255, 255, 0.95)', 'rgba(26, 32, 44, 0.95)');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const iconColor = useColorModeValue('gray.600', 'gray.300');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.100');
  
  const isSidebarPinned = sidebarWidth > 0;
  
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
      bottom={{ base: '50px', md: '60px' }}
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
          backdropFilter="blur(10px)"
          borderRadius="12px 12px 0 0"
          borderWidth="1px"
          borderColor={borderColor}
          borderBottom="none"
          display="flex"
          justifyContent="center"
          px={2}
          py={0.5}
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
            size="xs"
            variant="ghost"
            color={iconColor}
            _hover={{ bg: 'transparent' }}
            pointerEvents="none"
          />
        </Box>
        
        <Collapse in={isExpanded} animateOpacity>
          <Box
            bg={bg}
            backdropFilter="blur(10px)"
            borderRadius="0 0 12px 12px"
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

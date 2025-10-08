import React, { useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Copy, Clipboard } from 'lucide-react';
import { VStack, HStack, Box, Text, IconButton as ChakraIconButton } from '@chakra-ui/react';
import { extractEditablePoints, extractSubpaths, commandsToString, translateCommands } from '../../utils/path';
import type { CanvasElement, PathData, Command } from '../../types';
import { logger } from '../../utils';
import { RenderCountBadgeWrapper } from '../ui/RenderCountBadgeWrapper';
import { PathThumbnail } from '../ui/PathThumbnail';

// Helper to extract subpath data from an element
const getSubpathData = (element: CanvasElement, subpathIndex: number) => {
  if (element.type !== 'path') return null;
  
  const commands = (element.data as PathData).subPaths.flat();
  const subpaths = extractSubpaths(commands);
  return subpaths[subpathIndex] || null;
};

// Helper to calculate bounding box coordinates
const getBoundingBoxCoords = (commands: Command[]) => {
  if (commands.length === 0) return null;
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  commands.forEach(cmd => {
    const points: number[] = [];
    
    switch (cmd.type) {
      case 'M':
      case 'L':
        points.push(cmd.position.x, cmd.position.y);
        break;
      case 'C':
        points.push(
          cmd.controlPoint1.x, cmd.controlPoint1.y,
          cmd.controlPoint2.x, cmd.controlPoint2.y,
          cmd.position.x, cmd.position.y
        );
        break;
      case 'Z':
        // Z command doesn't add new points
        break;
    }

    for (let i = 0; i < points.length; i += 2) {
      const x = points[i];
      const y = points[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  });

  return {
    topLeft: { x: Math.round(minX), y: Math.round(minY) },
    bottomRight: { x: Math.round(maxX), y: Math.round(maxY) }
  };
};

const SelectPanelComponent: React.FC = () => {
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);
  const addElement = useCanvasStore(state => state.addElement);
  
  // Subscribe to elements and selectedIds separately to avoid infinite re-renders
  const elements = useCanvasStore(state => state.elements);
  const selectedIds = useCanvasStore(state => state.selectedIds);
  
  // Memoize the filtered selected elements to prevent unnecessary re-renders
  const selectedElements = useMemo(() => 
    elements.filter(el => selectedIds.includes(el.id)),
    [elements, selectedIds]
  );

  // Build list of items to display
  const items: Array<{
    type: 'element' | 'subpath';
    element: CanvasElement;
    subpathIndex?: number;
    pointCount: number;
  }> = [];

  selectedElements.forEach(el => {
    if (el.type === 'path') {
      const commands = (el.data as PathData).subPaths.flat();
      const pointCount = extractEditablePoints(commands).length;
      items.push({ type: 'element', element: el, pointCount });

      // Add selected subpaths for this element
      const elementSubpaths = selectedSubpaths.filter(sp => sp.elementId === el.id);
      const subpaths = extractSubpaths(commands);
      elementSubpaths.forEach(sp => {
        const subpathData = subpaths[sp.subpathIndex];
        if (subpathData) {
          const subPointCount = extractEditablePoints(subpathData.commands).length;
          items.push({ type: 'subpath', element: el, subpathIndex: sp.subpathIndex, pointCount: subPointCount });
        }
      });
    } else {
      // For non-path elements, just add them
      items.push({ type: 'element', element: el, pointCount: 0 });
    }
  });

  const duplicateItem = (item: typeof items[0]) => {
    if (item.type === 'element') {
      // Duplicate the entire element
      const { id: _id, zIndex: _zIndex, ...elementData } = item.element;
      
      // If it's a path, translate it to make duplication visible
      if (elementData.type === 'path') {
        const pathData = elementData.data as PathData;
        const translatedSubPaths = pathData.subPaths.map(subPath => 
          translateCommands(subPath, 20, 20)
        );
        
        addElement({
          ...elementData,
          data: {
            ...pathData,
            subPaths: translatedSubPaths
          }
        });
      } else {
        addElement(elementData);
      }
    } else if (item.type === 'subpath' && item.subpathIndex !== undefined) {
      // Duplicate the subpath as a new element
      const subpathData = getSubpathData(item.element, item.subpathIndex);
      if (subpathData) {
        // Translate the subpath commands to make duplication visible
        const translatedCommands = translateCommands(subpathData.commands, 20, 20);
        
        // Create new path element from subpath
        addElement({
          type: 'path',
          data: {
            ...item.element.data,
            subPaths: [translatedCommands],
          },
        });
      }
    }
  };

  const copyPathToClipboard = async (item: typeof items[0]) => {
    let pathData = '';

    if (item.type === 'element') {
      // Copy the entire element's path
      if (item.element.type === 'path') {
        pathData = commandsToString((item.element.data as PathData).subPaths.flat());
      }
    } else if (item.type === 'subpath' && item.subpathIndex !== undefined) {
      // Copy the subpath's path
      const subpathData = getSubpathData(item.element, item.subpathIndex);
      if (subpathData) {
        pathData = commandsToString(subpathData.commands);
      }
    }

    if (pathData) {
      try {
        await navigator.clipboard.writeText(pathData);
        logger.info('Path copied to clipboard', pathData);
      } catch (err) {
        logger.error('Failed to copy path to clipboard', err);
      }
    }
  };

  return (
    <Box bg="white" px={2} position="relative">
      <RenderCountBadgeWrapper componentName="SelectPanel" position="top-right" />
      <Box h="94px" overflowY="auto">
        {items.length > 0 ? (
          <VStack spacing={1} align="stretch">
            {items.map((item) => {
              // Get commands for thumbnail and bbox
              let thumbnailCommands: Command[] = [];
              if (item.type === 'element' && item.element.type === 'path') {
                thumbnailCommands = (item.element.data as PathData).subPaths.flat();
              } else if (item.type === 'subpath' && item.subpathIndex !== undefined) {
                const subpathData = getSubpathData(item.element, item.subpathIndex);
                if (subpathData) {
                  thumbnailCommands = subpathData.commands;
                }
              }

              // Calculate bbox coordinates
              const bbox = getBoundingBoxCoords(thumbnailCommands);

              return (
                <HStack
                  key={`${item.element.id}-${item.type}-${item.subpathIndex || 0}`}
                  spacing={2}
                  px={1}
                  py={1}
                  bg="gray.50"
                  borderRadius="sm"
                  fontSize="10px"
                  align="flex-start"
                >
                  {/* Thumbnail */}
                  {thumbnailCommands.length > 0 && (
                    <PathThumbnail 
                      commands={thumbnailCommands} 
                      size={32}
                      element={item.element}
                    />
                  )}
                  
                  {/* Text info */}
                  <Box flex={1}>
                    <Text fontWeight="500" fontSize="10px">
                      {item.type === 'element'
                        ? `${item.element.type} (z: ${item.element.zIndex}) - ${item.pointCount} points`
                        : `Subpath ${item.subpathIndex} - ${item.pointCount} points`
                      }
                    </Text>
                    {bbox && (
                      <Text fontSize="9px" color="gray.600">
                        ({bbox.topLeft.x}, {bbox.topLeft.y}) → ({bbox.bottomRight.x}, {bbox.bottomRight.y})
                      </Text>
                    )}
                  </Box>
                  
                  {/* Action buttons - always aligned to the right */}
                  <HStack spacing={1}>
                    <ChakraIconButton
                      aria-label="Duplicate"
                      icon={<Copy size={10} />}
                      onClick={() => duplicateItem(item)}
                      size="xs"
                      minW="auto"
                      h="auto"
                      p={1}
                    />
                    <ChakraIconButton
                      aria-label="Copy Path to Clipboard"
                      icon={<Clipboard size={10} />}
                      onClick={() => copyPathToClipboard(item)}
                      size="xs"
                      minW="auto"
                      h="auto"
                      p={1}
                    />
                  </HStack>
                </HStack>
              );
            })}
          </VStack>
        ) : (
          <Box
            fontSize="11px"
            color="gray.600"
            textAlign="center"
            p={2}
            h="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            Select elements to see details and options
          </Box>
        )}
      </Box>
    </Box>
  );
};

// Export memoized version to prevent unnecessary re-renders
export const SelectPanel = React.memo(SelectPanelComponent);
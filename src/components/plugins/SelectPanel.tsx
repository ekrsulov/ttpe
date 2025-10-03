import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Pen, Minus, Copy, Clipboard } from 'lucide-react';
import { VStack, HStack, Box, Text, IconButton as ChakraIconButton } from '@chakra-ui/react';
import { extractEditablePoints, extractSubpaths, commandsToString, translateCommands } from '../../utils/path';
import type { CanvasElement, PathData } from '../../types';
import { logger } from '../../utils';

export const SelectPanel: React.FC = () => {
  const { elements, selectedIds, selectedSubpaths, addElement } = useCanvasStore();

  const selectedElements = elements.filter(el => selectedIds.includes(el.id));

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
      const commands = (item.element.data as PathData).subPaths.flat();
      const subpaths = extractSubpaths(commands);
      const subpathData = subpaths[item.subpathIndex];
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
      const commands = (item.element.data as PathData).subPaths.flat();
      const subpaths = extractSubpaths(commands);
      const subpathData = subpaths[item.subpathIndex];
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
    <Box bg="white" px={2}>
      <Box h="94px" overflowY="auto">
        {items.length > 0 ? (
          <VStack spacing={1} align="stretch">
            {items.map((item) => (
              <HStack
                key={`${item.element.id}-${item.type}-${item.subpathIndex || 0}`}
                spacing={1}
                px={item.type === 'subpath' ? 4 : 1}
                pl={item.type === 'subpath' ? 4 : 1}
                py={0.5}
                bg="gray.50"
                borderRadius="sm"
                fontSize="11px"
              >
                {item.type === 'element' ? (
                  item.element.type === 'path' ? <Pen size={12} /> : <Pen size={12} />
                ) : (
                  <Minus size={12} />
                )}
                <Box flex={1}>
                  <Text fontWeight="500" fontSize="11px">
                    {item.type === 'element'
                      ? `${item.element.type} (z: ${item.element.zIndex})`
                      : `Subpath ${item.subpathIndex}`
                    }
                  </Text>
                  <Text fontSize="10px" color="gray.600">
                    {item.pointCount} points
                  </Text>
                </Box>
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
            ))}
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
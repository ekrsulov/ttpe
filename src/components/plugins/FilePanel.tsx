import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button as ChakraButton, HStack, VStack, Input, InputGroup, InputLeftAddon, useToast, FormControl, FormLabel, Text, Box, Collapse, useDisclosure, IconButton as ChakraIconButton } from '@chakra-ui/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ConditionalTooltip from '../ui/ConditionalTooltip';
import { useCanvasStore } from '../../store/canvasStore';
import { logger, importSVGWithDimensions, measurePath, translateCommands, performPathUnion, transformCommands, calculateScaledStrokeWidth, flattenImportedElements } from '../../utils';
import { Panel } from '../ui/Panel';
import { PanelToggle } from '../ui/PanelToggle';
import type { PathData, CanvasElement } from '../../types';
import type { ImportedElement } from '../../utils';

type AddElementFn = (element: Omit<CanvasElement, 'id' | 'zIndex'>) => string;
type UpdateElementFn = (id: string, updates: Partial<CanvasElement>) => void;

const mapImportedElements = (
  elements: ImportedElement[],
  mapFn: (pathData: PathData) => PathData,
): ImportedElement[] => {
  return elements.map(element => {
    if (element.type === 'path') {
      return {
        ...element,
        data: mapFn(element.data),
      };
    }

    return {
      ...element,
      children: mapImportedElements(element.children, mapFn),
    };
  });
};

const translateImportedElements = (
  elements: ImportedElement[],
  deltaX: number,
  deltaY: number,
): ImportedElement[] => {
  if (deltaX === 0 && deltaY === 0) {
    return elements;
  }

  return mapImportedElements(elements, (pathData) => ({
    ...pathData,
    subPaths: pathData.subPaths.map(subPath => translateCommands(subPath, deltaX, deltaY)),
  }));
};

const addImportedElementsToCanvas = (
  elements: ImportedElement[],
  addElement: AddElementFn,
  updateElement: UpdateElementFn,
  getNextGroupName: () => string,
  parentId: string | null = null,
): { createdIds: string[]; childIds: string[] } => {
  const createdIds: string[] = [];
  const childIds: string[] = [];

  elements.forEach(element => {
    if (element.type === 'group') {
      const groupName = element.name?.trim().length ? element.name : getNextGroupName();
      const groupId = addElement({
        type: 'group',
        parentId: parentId ?? undefined,
        data: {
          childIds: [],
          name: groupName,
          isLocked: false,
          isHidden: false,
          isExpanded: true,
          transform: {
            translateX: 0,
            translateY: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
        },
      });

      const { createdIds: nestedCreatedIds, childIds: nestedChildIds } = addImportedElementsToCanvas(
        element.children,
        addElement,
        updateElement,
        getNextGroupName,
        groupId,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateElement(groupId, { data: { childIds: nestedChildIds } } as any);

      createdIds.push(groupId, ...nestedCreatedIds);
      childIds.push(groupId);
      return;
    }

    const pathId = addElement({
      type: 'path',
      parentId: parentId ?? undefined,
      data: element.data,
    });

    createdIds.push(pathId);
    childIds.push(pathId);
  });

  return { createdIds, childIds };
};

export const FilePanel: React.FC = () => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const saveDocument = useCanvasStore(state => state.saveDocument);
  const loadDocument = useCanvasStore(state => state.loadDocument);
  const saveAsSvg = useCanvasStore(state => state.saveAsSvg);
  const addElement = useCanvasStore(state => state.addElement);
  const updateElement = useCanvasStore(state => state.updateElement);
  const clearSelection = useCanvasStore(state => state.clearSelection);
  const selectElements = useCanvasStore(state => state.selectElements);
  const setActivePlugin = useCanvasStore(state => state.setActivePlugin);
  
  const [appendMode, setAppendMode] = useState(false);
  const [addFrame, setAddFrame] = useState(false);
  const [applyUnion, setApplyUnion] = useState(false);
  const [resizeImport, setResizeImport] = useState(false);
  const [resizeWidth, setResizeWidth] = useState(64);
  const [resizeHeight, setResizeHeight] = useState(64);
  const [pngSelectedOnly, setPngSelectedOnly] = useState(true);
  const [svgSelectedOnly, setSvgSelectedOnly] = useState(false);
  const svgInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Document name state
  const documentName = useCanvasStore(state => state.documentName);
  const setDocumentName = useCanvasStore(state => state.setDocumentName);
  const [localDocumentName, setLocalDocumentName] = useState(documentName);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Collapsible Advanced section state
  const { isOpen: isAdvancedOpen, onToggle: onAdvancedToggle } = useDisclosure();

  // Sync local state with store
  useEffect(() => {
    setLocalDocumentName(documentName);
  }, [documentName]);

  // Handle document name change with throttling
  const handleDocumentNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setLocalDocumentName(newName);
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set saving indicator immediately
    setIsSaving(true);
    
    // Throttle the save operation
    saveTimeoutRef.current = setTimeout(() => {
      setDocumentName(newName);
      setIsSaving(false);
    }, 500); // 500ms delay
  }, [setDocumentName]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Helper function to create a frame rectangle
  const createFrame = (width: number, height: number): PathData => {
    return {
      subPaths: [[
        { type: 'M', position: { x: 0, y: 0 } },
        { type: 'L', position: { x: width, y: 0 } },
        { type: 'L', position: { x: width, y: height } },
        { type: 'L', position: { x: 0, y: height } },
        { type: 'Z' }
      ]],
      strokeWidth: 1,
      strokeColor: '#000000',
      strokeOpacity: 1,
      fillColor: 'none',
      fillOpacity: 1,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    };
  };

  const handleSave = () => {
    saveDocument();
  };

  const handleSaveAsSvg = () => {
    saveAsSvg(svgSelectedOnly);
  };

  const handleSaveAsPng = () => {
    // We need to get the SVG element from the Canvas component
    // For now, we'll dispatch a custom event that the Canvas can listen to
    const event = new CustomEvent('saveAsPng', { 
      detail: { selectedOnly: pngSelectedOnly } 
    });
    window.dispatchEvent(event);
  };

  const handleLoad = async () => {
    try {
      await loadDocument(appendMode);
    } catch (error) {
      logger.error('Failed to load document', error);
      alert('Failed to load document. Please check the file format.');
    }
  };

  const handleImportSVG = () => {
    svgInputRef.current?.click();
  };

  const handleSVGFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      logger.info('Importing SVG files', { fileCount: files.length });

      // Clear selection if not in append mode
      if (!appendMode) {
        clearSelection();
      }

      const selectionIds: string[] = [];
      let importedPathCount = 0;

      // Grid layout variables for organizing imported SVGs
      let currentXOffset = 0;        // Current horizontal position in the row
      let currentYOffset = 0;        // Current vertical position (row start)
      let currentRowMaxHeight = 0;   // Maximum height in current row
      const margin = 160;            // Margin between imported groups (4x increased for maximum spacing)
      const maxRowWidth = 12288;     // Maximum horizontal width per row (3x 4096px for very wide rows)
      let importedGroupCounter = 1;
      const getNextGroupName = () => `Imported Group ${importedGroupCounter++}`;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        logger.info('Processing SVG file', { fileName: file.name, index: i });

        const { dimensions, elements: importedElements } = await importSVGWithDimensions(file);

        if (!importedElements || importedElements.length === 0) {
          logger.warn('No paths found in SVG file', { fileName: file.name });
          continue;
        }

        let workingElements = importedElements;
        let pathDataArray = flattenImportedElements(workingElements);

        if (pathDataArray.length === 0) {
          logger.warn('No paths found after parsing SVG elements', { fileName: file.name });
          continue;
        }

        // Apply resize if requested
        if (resizeImport && dimensions.width > 0 && dimensions.height > 0) {
          const scaleX = resizeWidth / dimensions.width;
          const scaleY = resizeHeight / dimensions.height;

          workingElements = mapImportedElements(workingElements, (pathData) => {
            const scaledSubPaths = pathData.subPaths.map(subPath =>
              transformCommands(subPath, {
                scaleX,
                scaleY,
                originX: 0,
                originY: 0,
                rotation: 0,
                rotationCenterX: 0,
                rotationCenterY: 0,
              })
            );

            return {
              ...pathData,
              subPaths: scaledSubPaths,
              strokeWidth: calculateScaledStrokeWidth(pathData.strokeWidth, scaleX, scaleY),
            };
          });

          pathDataArray = flattenImportedElements(workingElements);
        } else if (resizeImport) {
          logger.warn('Resize requested but SVG dimensions are missing or zero', { fileName: file.name });
        }

        // Apply union if requested
        if (applyUnion) {
          const unionSource = flattenImportedElements(workingElements);
          if (unionSource.length > 1) {
            const unionResult = performPathUnion(unionSource);
            if (unionResult) {
              workingElements = [{ type: 'path', data: unionResult }];
              pathDataArray = flattenImportedElements(workingElements);
            }
          }
        }

        // Recalculate bounds after resize and union operations
        let finalGroupMinX = Infinity;
        let finalGroupMaxX = -Infinity;
        let finalGroupMinY = Infinity;
        let finalGroupMaxY = -Infinity;

        pathDataArray.forEach(pathData => {
          const bounds = measurePath(pathData.subPaths, pathData.strokeWidth, 1);
          finalGroupMinX = Math.min(finalGroupMinX, bounds.minX);
          finalGroupMaxX = Math.max(finalGroupMaxX, bounds.maxX);
          finalGroupMinY = Math.min(finalGroupMinY, bounds.minY);
          finalGroupMaxY = Math.max(finalGroupMaxY, bounds.maxY);
        });

        const finalGroupWidth = finalGroupMaxX - finalGroupMinX;
        const finalGroupHeight = finalGroupMaxY - finalGroupMinY;

        // Grid layout: Check if current SVG fits in the current row
        if (currentXOffset > 0 && currentXOffset + finalGroupWidth > maxRowWidth) {
          currentXOffset = 0;
          currentYOffset += currentRowMaxHeight + margin;
          currentRowMaxHeight = 0;
        }

        // Apply translation to position this group in the grid
        const translateX = currentXOffset - finalGroupMinX;
        const translateY = currentYOffset - finalGroupMinY;

        workingElements = translateImportedElements(workingElements, translateX, translateY);
        pathDataArray = flattenImportedElements(workingElements);

        // Add frame if requested (add it first so it appears "below" the SVG content)
        if (addFrame) {
          const frameWidth = resizeImport ? resizeWidth : (dimensions.width || finalGroupWidth);
          const frameHeight = resizeImport ? resizeHeight : (dimensions.height || finalGroupHeight);
          const frame = createFrame(frameWidth, frameHeight);
          const translatedFrameSubPaths = frame.subPaths.map(subPath =>
            translateCommands(subPath, translateX, translateY)
          );
          const translatedFrame = {
            ...frame,
            subPaths: translatedFrameSubPaths,
          };

          const frameId = addElement({
            type: 'path',
            data: translatedFrame,
          });
          selectionIds.push(frameId);
          importedPathCount += 1;
        }

        const { createdIds, childIds } = addImportedElementsToCanvas(
          workingElements,
          addElement,
          updateElement,
          getNextGroupName,
        );

        selectionIds.push(...childIds);
        importedPathCount += pathDataArray.length;

        // Update grid position for next SVG
        currentXOffset += finalGroupWidth + margin;
        currentRowMaxHeight = Math.max(currentRowMaxHeight, finalGroupHeight);

        logger.info('SVG file processed', {
          fileName: file.name,
          createdElementCount: createdIds.length,
          pathCount: pathDataArray.length,
          bounds: { width: finalGroupWidth, height: finalGroupHeight },
          position: { x: currentXOffset - finalGroupWidth - margin, y: currentYOffset },
          offset: currentXOffset,
        });
      }

      if (selectionIds.length > 0) {
        selectElements(selectionIds);
        setActivePlugin('select');
      }

      toast({
        title: 'SVGs Imported',
        description: `Successfully imported ${importedPathCount} path${importedPathCount !== 1 ? 's' : ''} from ${files.length} file${files.length !== 1 ? 's' : ''}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      logger.info('All elements added to canvas', { totalPathCount: importedPathCount, selectionCount: selectionIds.length });
    } catch (error) {
      logger.error('Failed to import SVGs', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import SVG files',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      // Reset the input so the same files can be imported again
      event.target.value = '';
    }
  };

  return (
    <Panel>
      <VStack spacing={2} align="stretch" pt={2}>
        {/* Document Name */}
        <FormControl position="relative">
          <FormLabel fontSize="12px" fontWeight="medium" color="gray.600" mb={1}>
            Document Name
          </FormLabel>
          <Input
            value={localDocumentName}
            onChange={handleDocumentNameChange}
            placeholder="Enter document name"
            size="sm"
          />
          {isSaving && (
            <Text
              position="absolute"
              right={2}
              top="28px"
              fontSize="12px"
              color="gray.500"
              bg="white"
              px={1}
              pointerEvents="none"
            >
              Saving...
            </Text>
          )}
        </FormControl>

        <HStack spacing={1}>
          <ChakraButton
            onClick={handleSave}
            variant="outline"
            colorScheme="gray"
            flex={1}
            size="sm"
          >
            Save
          </ChakraButton>

          <ChakraButton
            onClick={handleSaveAsSvg}
            variant="outline"
            colorScheme="gray"
            flex={1}
            size="sm"
          >
            Svg
          </ChakraButton>

          <ChakraButton
            onClick={handleSaveAsPng}
            variant="outline"
            colorScheme="gray"
            flex={1}
            size="sm"
          >
            Png
          </ChakraButton>
        </HStack>

        <HStack spacing={1}>
          <ChakraButton
            onClick={handleLoad}
            variant="outline"
            colorScheme="gray"
            flex={1}
            size="sm"
          >
            Load
          </ChakraButton>

          <ChakraButton
            onClick={handleImportSVG}
            variant="outline"
            colorScheme="gray"
            flex={1}
            size="sm"
          >
            Import SVG
          </ChakraButton>
        </HStack>

        {/* Hidden file input for SVG import */}
        <input
          ref={svgInputRef}
          type="file"
          accept=".svg,image/svg+xml"
          multiple
          style={{ display: 'none' }}
          onChange={handleSVGFileSelected}
        />

        {/* Advanced Section - Collapsible */}
        <Box mt={1}>
          <HStack
            justify="space-between"
            py={1}
          >
            <Text 
              color="gray.600"
              cursor="pointer"
              onClick={onAdvancedToggle}
              _hover={{ color: "gray.800" }}
            >
              Advanced
            </Text>
            <ConditionalTooltip label={isAdvancedOpen ? "Collapse Advanced" : "Expand Advanced"}>
              <ChakraIconButton
                aria-label={isAdvancedOpen ? "Collapse Advanced" : "Expand Advanced"}
                icon={isAdvancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                onClick={onAdvancedToggle}
                variant="ghost"
                size="xs"
                h="20px"
                minW="20px"
                flexShrink={0}
                bg="transparent"
              />
            </ConditionalTooltip>
          </HStack>

          <Collapse in={isAdvancedOpen} animateOpacity>
            <VStack spacing={2} align="stretch" mt={2}>

        <PanelToggle
          isChecked={appendMode}
          onChange={(e) => setAppendMode(e.target.checked)}
        >
          Append to current document
        </PanelToggle>

        <PanelToggle
          isChecked={pngSelectedOnly}
          onChange={(e) => setPngSelectedOnly(e.target.checked)}
          accentColor="green"
        >
          Save selected elements only (PNG)
        </PanelToggle>

        <PanelToggle
          isChecked={svgSelectedOnly}
          onChange={(e) => setSvgSelectedOnly(e.target.checked)}
        >
          Save selected elements only (SVG)
        </PanelToggle>

        <PanelToggle
          isChecked={addFrame}
          onChange={(e) => setAddFrame(e.target.checked)}
          accentColor="green"
        >
          Add frame to imported SVG
        </PanelToggle>

        <PanelToggle
          isChecked={applyUnion}
          onChange={(e) => setApplyUnion(e.target.checked)}
          accentColor="purple"
        >
          Apply union to imported paths
        </PanelToggle>

        <PanelToggle
          isChecked={resizeImport}
          onChange={(e) => setResizeImport(e.target.checked)}
          accentColor="orange"
        >
          Resize imported SVG
        </PanelToggle>

        {resizeImport && (
          <HStack spacing={2}>
            <InputGroup size="sm">
              <InputLeftAddon>W</InputLeftAddon>
              <Input
                type="number"
                value={resizeWidth}
                onChange={(e) => setResizeWidth(parseInt(e.target.value) || 64)}
                min={1}
                max={1000}
                placeholder="64"
              />
            </InputGroup>
            <InputGroup size="sm">
              <InputLeftAddon>H</InputLeftAddon>
              <Input
                type="number"
                value={resizeHeight}
                onChange={(e) => setResizeHeight(parseInt(e.target.value) || 64)}
                min={1}
                max={1000}
                placeholder="64"
              />
            </InputGroup>
          </HStack>
        )}

            </VStack>
          </Collapse>
        </Box>

        {/* Reset Application */}
        <Box pt={3}>
          <ChakraButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              useCanvasStore.persist.clearStorage();
              window.location.reload();
            }}
            colorScheme="gray"
            size="sm"
            width="full"
            variant="outline"
            title="Reset Application - This will clear all data and reload the page"
          >
            Reset App
          </ChakraButton>
        </Box>
      </VStack>
    </Panel>
  );
};
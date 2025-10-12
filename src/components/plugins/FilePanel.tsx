import React, { useState, useRef } from 'react';
import { Button as ChakraButton, Checkbox as ChakraCheckbox, HStack, VStack, Input, InputGroup, InputLeftAddon, useToast } from '@chakra-ui/react';
import { File } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { logger, importSVGWithDimensions, measurePath, translateCommands, performPathUnion, transformCommands, calculateScaledStrokeWidth } from '../../utils';
import { Panel } from '../ui/Panel';
import type { PathData } from '../../types';

export const FilePanel: React.FC = () => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const saveDocument = useCanvasStore(state => state.saveDocument);
  const loadDocument = useCanvasStore(state => state.loadDocument);
  const saveAsSvg = useCanvasStore(state => state.saveAsSvg);
  const addElement = useCanvasStore(state => state.addElement);
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

      const allAddedIds: string[] = [];
      
      // Grid layout variables for organizing imported SVGs
      let currentXOffset = 0;        // Current horizontal position in the row
      let currentYOffset = 0;        // Current vertical position (row start)
      let currentRowMaxHeight = 0;   // Maximum height in current row
      const margin = 160;            // Margin between imported groups (4x increased for maximum spacing)
      const maxRowWidth = 12288;     // Maximum horizontal width per row (3x 4096px for very wide rows)

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        logger.info('Processing SVG file', { fileName: file.name, index: i });
        
        // Import SVG and get PathData array and dimensions
        const { dimensions, paths: pathDataArray } = await importSVGWithDimensions(file);
        
        if (pathDataArray.length === 0) {
          logger.warn('No paths found in SVG file', { fileName: file.name });
          continue;
        }

        // Calculate initial bounds for this group of paths
        let groupMinX = Infinity;
        let groupMaxX = -Infinity;
        let groupMinY = Infinity;
        let groupMaxY = -Infinity;

        pathDataArray.forEach(pathData => {
          const bounds = measurePath(pathData.subPaths, pathData.strokeWidth, 1);
          groupMinX = Math.min(groupMinX, bounds.minX);
          groupMaxX = Math.max(groupMaxX, bounds.maxX);
          groupMinY = Math.min(groupMinY, bounds.minY);
          groupMaxY = Math.max(groupMaxY, bounds.maxY);
        });

        let finalPathDataArray = pathDataArray;

        // Apply resize if requested
        if (resizeImport) {
          const scaleX = resizeWidth / dimensions.width;
          const scaleY = resizeHeight / dimensions.height;
          
          finalPathDataArray = pathDataArray.map(pathData => {
            const scaledSubPaths = pathData.subPaths.map(subPath => 
              transformCommands(subPath, {
                scaleX,
                scaleY,
                originX: 0,
                originY: 0,
                rotation: 0,
                rotationCenterX: 0,
                rotationCenterY: 0
              })
            );
            
            return {
              ...pathData,
              subPaths: scaledSubPaths,
              strokeWidth: calculateScaledStrokeWidth(pathData.strokeWidth, scaleX, scaleY)
            };
          });
        }

        // Apply union if requested
        if (applyUnion && finalPathDataArray.length > 1) {
          const unionResult = performPathUnion(finalPathDataArray);
          if (unionResult) {
            finalPathDataArray = [unionResult];
          }
        }

        // Recalculate bounds after resize and union operations
        let finalGroupMinX = Infinity;
        let finalGroupMaxX = -Infinity;
        let finalGroupMinY = Infinity;
        let finalGroupMaxY = -Infinity;

        finalPathDataArray.forEach(pathData => {
          const bounds = measurePath(pathData.subPaths, pathData.strokeWidth, 1);
          finalGroupMinX = Math.min(finalGroupMinX, bounds.minX);
          finalGroupMaxX = Math.max(finalGroupMaxX, bounds.maxX);
          finalGroupMinY = Math.min(finalGroupMinY, bounds.minY);
          finalGroupMaxY = Math.max(finalGroupMaxY, bounds.maxY);
        });

        const finalGroupWidth = finalGroupMaxX - finalGroupMinX;
        const finalGroupHeight = finalGroupMaxY - finalGroupMinY;

        // Grid layout: Check if current SVG fits in the current row
        // If not, wrap to next row to maintain maxRowWidth limit
        if (currentXOffset > 0 && currentXOffset + finalGroupWidth > maxRowWidth) {
          // Move to next row
          currentXOffset = 0;
          currentYOffset += currentRowMaxHeight + margin;
          currentRowMaxHeight = 0;
        }

        // Apply translation to position this group in the grid
        const translateX = currentXOffset - finalGroupMinX;
        const translateY = currentYOffset - finalGroupMinY;

        // Add frame if requested (add it first so it appears "below" the SVG content)
        if (addFrame) {
          // Use resize dimensions if resize is applied, otherwise use original SVG dimensions
          const frameWidth = resizeImport ? resizeWidth : dimensions.width;
          const frameHeight = resizeImport ? resizeHeight : dimensions.height;
          const frame = createFrame(frameWidth, frameHeight);
          // Frame is positioned at (0,0) with the same translation as the SVG content
          const translatedFrameSubPaths = frame.subPaths.map(subPath =>
            translateCommands(subPath, translateX, translateY)
          );
          const translatedFrame = {
            ...frame,
            subPaths: translatedFrameSubPaths
          };
          
          // Add frame first (so it appears below the SVG content)
          const frameId = addElement({
            type: 'path',
            data: translatedFrame
          });
          allAddedIds.push(frameId);
        }

        // Add each path as a new element with translation applied directly to subPaths
        const fileAddedIds: string[] = [];
        finalPathDataArray.forEach(pathData => {
          // Apply translation to the subPaths directly
          const translatedSubPaths = pathData.subPaths.map(subPath => 
            translateCommands(subPath, translateX, translateY)
          );

          const translatedPathData = {
            ...pathData,
            subPaths: translatedSubPaths
          };

          const id = addElement({
            type: 'path',
            data: translatedPathData
          });
          fileAddedIds.push(id);
        });

        allAddedIds.push(...fileAddedIds);
        
        // Update grid position for next SVG
        currentXOffset += finalGroupWidth + margin;  // Move right
        currentRowMaxHeight = Math.max(currentRowMaxHeight, finalGroupHeight);  // Track row height

        logger.info('SVG file processed', { 
          fileName: file.name, 
          pathCount: pathDataArray.length,
          bounds: { width: finalGroupWidth, height: finalGroupHeight },
          position: { x: currentXOffset - finalGroupWidth - margin, y: currentYOffset },
          offset: currentXOffset
        });
      }

      // Select all newly imported elements
      if (allAddedIds.length > 0) {
        selectElements(allAddedIds);
        // Switch to select mode to allow immediate manipulation of imported elements
        setActivePlugin('select');
      }

      toast({
        title: 'SVGs Imported',
        description: `Successfully imported ${allAddedIds.length} path${allAddedIds.length !== 1 ? 's' : ''} from ${files.length} file${files.length !== 1 ? 's' : ''}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      logger.info('All elements added to canvas', { totalCount: allAddedIds.length });
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
    <Panel icon={<File size={16} />} title="File">
      <VStack spacing={2} align="stretch">
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

        <ChakraCheckbox
          id="append-mode"
          isChecked={appendMode}
          onChange={(e) => setAppendMode(e.target.checked)}
          size="sm"
          sx={{
            '& .chakra-checkbox__control': {
              bg: appendMode ? 'blue.500' : 'transparent',
              borderColor: appendMode ? 'blue.500' : 'gray.400',
              _checked: {
                bg: 'blue.500',
                borderColor: 'blue.500',
                color: 'white',
                _hover: {
                  bg: 'blue.600',
                  borderColor: 'blue.600',
                }
              },
              _hover: {
                bg: appendMode ? 'blue.600' : 'gray.50',
                borderColor: appendMode ? 'blue.600' : 'gray.400',
              }
            }
          }}
        >
          Append to current document
        </ChakraCheckbox>

        <ChakraCheckbox
          id="png-selected-only"
          isChecked={pngSelectedOnly}
          onChange={(e) => setPngSelectedOnly(e.target.checked)}
          size="sm"
          sx={{
            '& .chakra-checkbox__control': {
              bg: pngSelectedOnly ? 'green.500' : 'transparent',
              borderColor: pngSelectedOnly ? 'green.500' : 'gray.400',
              _checked: {
                bg: 'green.500',
                borderColor: 'green.500',
                color: 'white',
                _hover: {
                  bg: 'green.600',
                  borderColor: 'green.600',
                }
              },
              _hover: {
                bg: pngSelectedOnly ? 'green.600' : 'gray.50',
                borderColor: pngSelectedOnly ? 'green.600' : 'gray.400',
              }
            }
          }}
        >
          Save selected elements only (PNG)
        </ChakraCheckbox>

        <ChakraCheckbox
          id="svg-selected-only"
          isChecked={svgSelectedOnly}
          onChange={(e) => setSvgSelectedOnly(e.target.checked)}
          size="sm"
          sx={{
            '& .chakra-checkbox__control': {
              bg: svgSelectedOnly ? 'blue.500' : 'transparent',
              borderColor: svgSelectedOnly ? 'blue.500' : 'gray.400',
              _checked: {
                bg: 'blue.500',
                borderColor: 'blue.500',
                color: 'white',
                _hover: {
                  bg: 'blue.600',
                  borderColor: 'blue.600',
                }
              },
              _hover: {
                bg: svgSelectedOnly ? 'blue.600' : 'gray.50',
                borderColor: svgSelectedOnly ? 'blue.600' : 'gray.400',
              }
            }
          }}
        >
          Save selected elements only (SVG)
        </ChakraCheckbox>

        <ChakraCheckbox
          id="add-frame"
          isChecked={addFrame}
          onChange={(e) => setAddFrame(e.target.checked)}
          size="sm"
          sx={{
            '& .chakra-checkbox__control': {
              bg: addFrame ? 'green.500' : 'transparent',
              borderColor: addFrame ? 'green.500' : 'gray.400',
              _checked: {
                bg: 'green.500',
                borderColor: 'green.500',
                color: 'white',
                _hover: {
                  bg: 'green.600',
                  borderColor: 'green.600',
                }
              },
              _hover: {
                bg: addFrame ? 'green.600' : 'gray.50',
                borderColor: addFrame ? 'green.600' : 'gray.400',
              }
            }
          }}
        >
          Add frame to imported SVG
        </ChakraCheckbox>

        <ChakraCheckbox
          id="apply-union"
          isChecked={applyUnion}
          onChange={(e) => setApplyUnion(e.target.checked)}
          size="sm"
          sx={{
            '& .chakra-checkbox__control': {
              bg: applyUnion ? 'purple.500' : 'transparent',
              borderColor: applyUnion ? 'purple.500' : 'gray.400',
              _checked: {
                bg: 'purple.500',
                borderColor: 'purple.500',
                color: 'white',
                _hover: {
                  bg: 'purple.600',
                  borderColor: 'purple.600',
                }
              },
              _hover: {
                bg: applyUnion ? 'purple.600' : 'gray.50',
                borderColor: applyUnion ? 'purple.600' : 'gray.400',
              }
            }
          }}
        >
          Apply union to imported paths
        </ChakraCheckbox>

        <ChakraCheckbox
          id="resize-import"
          isChecked={resizeImport}
          onChange={(e) => setResizeImport(e.target.checked)}
          size="sm"
          sx={{
            '& .chakra-checkbox__control': {
              bg: resizeImport ? 'orange.500' : 'transparent',
              borderColor: resizeImport ? 'orange.500' : 'gray.400',
              _checked: {
                bg: 'orange.500',
                borderColor: 'orange.500',
                color: 'white',
                _hover: {
                  bg: 'orange.600',
                  borderColor: 'orange.600',
                }
              },
              _hover: {
                bg: resizeImport ? 'orange.600' : 'gray.50',
                borderColor: resizeImport ? 'orange.600' : 'gray.400',
              }
            }
          }}
        >
          Resize imported SVG
        </ChakraCheckbox>

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
    </Panel>
  );
};
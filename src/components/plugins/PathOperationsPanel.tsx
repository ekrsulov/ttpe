import React from 'react';
import { HStack, IconButton as ChakraIconButton, Tooltip } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Plus, Scissors, Zap, Minus, CirclePlus, Square, X, SplitSquareHorizontal } from 'lucide-react';
import { Panel } from '../ui/Panel';
import type { PathData } from '../../types';

export const PathOperationsPanel: React.FC = () => {
  const { selectedIds, selectedSubpaths, elements, performPathUnion, performPathSubtraction, performPathSimplify, performPathUnionPaperJS, performPathIntersect, performPathExclude, performPathDivide } = useCanvasStore();

  // Get selected paths/subpaths
  const selectedPaths = elements.filter(el =>
    selectedIds.includes(el.id) && el.type === 'path'
  );

  const selectedSubpathElements = selectedSubpaths.map(sp => {
    const element = elements.find(el => el.id === sp.elementId);
    if (element && element.type === 'path') {
      return { element, subpathIndex: sp.subpathIndex };
    }
    return null;
  }).filter(Boolean);

  const totalSelectedItems = selectedPaths.length + selectedSubpathElements.length;

  // Check if any selected path has more than one subpath
  const hasPathWithMultipleSubpaths = selectedPaths.some(pathEl => (pathEl.data as PathData).subPaths?.length > 1);

  // Show panel only if there are buttons to display
  if (!hasPathWithMultipleSubpaths && totalSelectedItems < 2) {
    return null;
  }

  const performUnion = () => {
    performPathUnion();
  };

  const performUnionPaperJS = () => {
    performPathUnionPaperJS();
  };

  const performSubtraction = () => {
    performPathSubtraction();
  };

  const performIntersect = () => {
    performPathIntersect();
  };

  const performExclude = () => {
    performPathExclude();
  };

  const performDivide = () => {
    performPathDivide();
  };

  const performSimplify = () => {
    performPathSimplify();
  };

  return (
    <Panel icon={<Scissors size={16} />} title="Path Operations">
      <HStack spacing={1} wrap="wrap">
        {/* Split subpaths operation - available only if a selected path has multiple subpaths */}
        {hasPathWithMultipleSubpaths && (
          <Tooltip label="Split subpaths into separate paths" fontSize="xs">
            <ChakraIconButton
              aria-label="Split subpaths"
              icon={<Zap size={14} />}
              onClick={performSimplify}
              size="sm"
              variant="secondary"
            />
          </Tooltip>
        )}

        {/* Boolean operations - require 2+ items */}
        {totalSelectedItems >= 2 && (
          <>
            <Tooltip label="Union (Simple)" fontSize="xs">
              <ChakraIconButton
                aria-label="Union (Simple)"
                icon={<Plus size={14} />}
                onClick={performUnion}
                size="sm"
                variant="secondary"
              />
            </Tooltip>
            
            <Tooltip label="Union (Paper.js)" fontSize="xs">
              <ChakraIconButton
                aria-label="Union (Paper.js)"
                icon={<CirclePlus size={14} />}
                onClick={performUnionPaperJS}
                size="sm"
                variant="secondary"
              />
            </Tooltip>
            
            {totalSelectedItems === 2 && (
              <>
                <Tooltip label="Subtract (First - Second)" fontSize="xs">
                  <ChakraIconButton
                    aria-label="Subtract"
                    icon={<Minus size={14} />}
                    onClick={performSubtraction}
                    size="sm"
                    variant="secondary"
                  />
                </Tooltip>
                
                <Tooltip label="Intersect (First ∩ Second)" fontSize="xs">
                  <ChakraIconButton
                    aria-label="Intersect"
                    icon={<Square size={14} />}
                    onClick={performIntersect}
                    size="sm"
                    variant="secondary"
                  />
                </Tooltip>
                
                <Tooltip label="Exclude (First ⊕ Second)" fontSize="xs">
                  <ChakraIconButton
                    aria-label="Exclude"
                    icon={<X size={14} />}
                    onClick={performExclude}
                    size="sm"
                    variant="secondary"
                  />
                </Tooltip>
                
                <Tooltip label="Divide (Split at intersections)" fontSize="xs">
                  <ChakraIconButton
                    aria-label="Divide"
                    icon={<SplitSquareHorizontal size={14} />}
                    onClick={performDivide}
                    size="sm"
                    variant="secondary"
                  />
                </Tooltip>
              </>
            )}
          </>
        )}
      </HStack>
    </Panel>
  );
};
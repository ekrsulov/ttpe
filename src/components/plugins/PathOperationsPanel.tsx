import React from 'react';
import { HStack, IconButton as ChakraIconButton, Tooltip } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Plus, Scissors, Zap, Minus, CirclePlus, Square, X, SplitSquareHorizontal } from 'lucide-react';
import { Panel } from '../ui/Panel';
import type { PathData } from '../../types';

const PathOperationsPanelComponent: React.FC = () => {
  // Subscribe only to selection changes to trigger re-renders when needed
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);
  const elements = useCanvasStore(state => state.elements);

  // Calculate selected paths count (paths + subpaths)
  const selectedPathsCount = selectedIds.filter(id => {
    const el = elements.find(e => e.id === id);
    return el && el.type === 'path';
  }).length;
  
  const totalSelectedItems = selectedPathsCount + selectedSubpaths.length;

  // Check if any selected path has more than one subpath
  const hasPathWithMultipleSubpaths = selectedIds.some(id => {
    const pathEl = elements.find(el => el.id === id && el.type === 'path');
    return pathEl && (pathEl.data as PathData).subPaths?.length > 1;
  });

  // Show panel only if there are buttons to display
  if (!hasPathWithMultipleSubpaths && totalSelectedItems < 2) {
    return null;
  }

  const performUnion = () => {
    useCanvasStore.getState().performPathUnion();
  };

  const performUnionPaperJS = () => {
    useCanvasStore.getState().performPathUnionPaperJS();
  };

  const performSubtraction = () => {
    useCanvasStore.getState().performPathSubtraction();
  };

  const performIntersect = () => {
    useCanvasStore.getState().performPathIntersect();
  };

  const performExclude = () => {
    useCanvasStore.getState().performPathExclude();
  };

  const performDivide = () => {
    useCanvasStore.getState().performPathDivide();
  };

  const performSimplify = () => {
    useCanvasStore.getState().performPathSimplify();
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

// Export memoized version - only re-renders when props change (no props = never re-renders from parent)
// Component only re-renders internally when activePlugin changes or selection changes
export const PathOperationsPanel = React.memo(PathOperationsPanelComponent);

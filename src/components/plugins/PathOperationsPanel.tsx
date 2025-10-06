import React, { useMemo } from 'react';
import { HStack, IconButton as ChakraIconButton, Tooltip } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Plus, Scissors, Zap, Minus, CirclePlus, Square, X, SplitSquareHorizontal } from 'lucide-react';
import { Panel } from '../ui/Panel';
import type { PathData } from '../../types';

const PathOperationsPanelComponent: React.FC = () => {
  // Subscribe only to the keys we need to detect changes in selection
  const selectedIdsKey = useCanvasStore(state => state.selectedIds.join(','));
  const selectedSubpathsKey = useCanvasStore(state => 
    state.selectedSubpaths.map(sp => `${sp.elementId}-${sp.subpathIndex}`).join(',')
  );
  
  // Memoize the calculation based on selection keys - only recalculates when selection actually changes
  const selectionInfo = useMemo(() => {
    const state = useCanvasStore.getState();
    const { selectedIds, selectedSubpaths, elements } = state;
    
    const selectedPathsCount = selectedIds.filter(id => {
      const el = elements.find(e => e.id === id);
      return el && el.type === 'path';
    }).length;
    
    const hasPathWithMultipleSubpaths = selectedIds.some(id => {
      const pathEl = elements.find(el => el.id === id && el.type === 'path');
      return pathEl && (pathEl.data as PathData).subPaths?.length > 1;
    });
    
    const totalSelectedItems = selectedPathsCount + selectedSubpaths.length;
    
    return {
      totalSelectedItems,
      hasPathWithMultipleSubpaths,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdsKey, selectedSubpathsKey]);

  // Destructure path operation actions once
  const {
    performPathUnion,
    performPathUnionPaperJS,
    performPathSubtraction,
    performPathIntersect,
    performPathExclude,
    performPathDivide,
    performPathSimplify,
  } = useCanvasStore.getState();

  // Show panel only if there are buttons to display
  if (!selectionInfo.hasPathWithMultipleSubpaths && selectionInfo.totalSelectedItems < 2) {
    return null;
  }

  const { totalSelectedItems, hasPathWithMultipleSubpaths } = selectionInfo;

  return (
    <Panel icon={<Scissors size={16} />} title="Path Operations">
      <HStack spacing={1} wrap="wrap">
        {/* Split subpaths operation - available only if a selected path has multiple subpaths */}
        {hasPathWithMultipleSubpaths && (
          <Tooltip label="Split subpaths into separate paths" fontSize="xs">
            <ChakraIconButton
              aria-label="Split subpaths"
              icon={<Zap size={14} />}
              onClick={performPathSimplify}
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
                onClick={performPathUnion}
                size="sm"
                variant="secondary"
              />
            </Tooltip>
            
            <Tooltip label="Union (Paper.js)" fontSize="xs">
              <ChakraIconButton
                aria-label="Union (Paper.js)"
                icon={<CirclePlus size={14} />}
                onClick={performPathUnionPaperJS}
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
                    onClick={performPathSubtraction}
                    size="sm"
                    variant="secondary"
                  />
                </Tooltip>
                
                <Tooltip label="Intersect (First ∩ Second)" fontSize="xs">
                  <ChakraIconButton
                    aria-label="Intersect"
                    icon={<Square size={14} />}
                    onClick={performPathIntersect}
                    size="sm"
                    variant="secondary"
                  />
                </Tooltip>
                
                <Tooltip label="Exclude (First ⊕ Second)" fontSize="xs">
                  <ChakraIconButton
                    aria-label="Exclude"
                    icon={<X size={14} />}
                    onClick={performPathExclude}
                    size="sm"
                    variant="secondary"
                  />
                </Tooltip>
                
                <Tooltip label="Divide (Split at intersections)" fontSize="xs">
                  <ChakraIconButton
                    aria-label="Divide"
                    icon={<SplitSquareHorizontal size={14} />}
                    onClick={performPathDivide}
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

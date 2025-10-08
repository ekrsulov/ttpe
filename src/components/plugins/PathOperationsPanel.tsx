import React, { useMemo } from 'react';
import { Grid, Button } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Scissors } from 'lucide-react';
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
      <Grid templateColumns="repeat(auto-fit, minmax(100px, 1fr))" gap={1}>
        {/* Split subpaths operation - available only if a selected path has multiple subpaths */}
        {hasPathWithMultipleSubpaths && (
          <Button
            aria-label="Split subpaths"
            onClick={performPathSimplify}
            variant="unstyled"
            size="sm"
            bg="transparent"
            color="gray.700"
            border="1px solid"
            borderColor="gray.400"
            borderRadius="md"
            fontWeight="medium"
            fontSize="10px"
            transition="all 0.2s"
            _hover={{
              bg: 'gray.50'
            }}
            sx={{
              minH: '28px',
              px: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Subpath Split
          </Button>
        )}

        {/* Boolean operations - require 2+ items */}
        {totalSelectedItems >= 2 && (
          <>
            <Button
              aria-label="Union (Simple)"
              onClick={performPathUnion}
              variant="unstyled"
              size="sm"
              bg="transparent"
              color="gray.700"
              border="1px solid"
              borderColor="gray.400"
              borderRadius="md"
              fontWeight="medium"
              fontSize="10px"
              transition="all 0.2s"
              _hover={{
                bg: 'gray.50'
              }}
              sx={{
                minH: '28px',
                px: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Union
            </Button>
            
            <Button
              aria-label="Union (Paper.js)"
              onClick={performPathUnionPaperJS}
              variant="unstyled"
              size="sm"
              bg="transparent"
              color="gray.700"
              border="1px solid"
              borderColor="gray.400"
              borderRadius="md"
              fontWeight="medium"
              fontSize="10px"
              transition="all 0.2s"
              _hover={{
                bg: 'gray.50'
              }}
              sx={{
                minH: '28px',
                px: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Union PaperJs
            </Button>
            
            {totalSelectedItems === 2 && (
              <>
                <Button
                  aria-label="Subtract"
                  onClick={performPathSubtraction}
                  variant="unstyled"
                  size="sm"
                  bg="transparent"
                  color="gray.700"
                  border="1px solid"
                  borderColor="gray.400"
                  borderRadius="md"
                  fontWeight="medium"
                  fontSize="10px"
                  transition="all 0.2s"
                  _hover={{
                    bg: 'gray.50'
                  }}
                  sx={{
                    minH: '28px',
                    px: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Subtract
                </Button>
                
                <Button
                  aria-label="Intersect"
                  onClick={performPathIntersect}
                  variant="unstyled"
                  size="sm"
                  bg="transparent"
                  color="gray.700"
                  border="1px solid"
                  borderColor="gray.400"
                  borderRadius="md"
                  fontWeight="medium"
                  fontSize="10px"
                  transition="all 0.2s"
                  _hover={{
                    bg: 'gray.50'
                  }}
                  sx={{
                    minH: '28px',
                    px: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Intersect
                </Button>
                
                <Button
                  aria-label="Exclude"
                  onClick={performPathExclude}
                  variant="unstyled"
                  size="sm"
                  bg="transparent"
                  color="gray.700"
                  border="1px solid"
                  borderColor="gray.400"
                  borderRadius="md"
                  fontWeight="medium"
                  fontSize="10px"
                  transition="all 0.2s"
                  _hover={{
                    bg: 'gray.50'
                  }}
                  sx={{
                    minH: '28px',
                    px: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Exclude
                </Button>
                
                <Button
                  aria-label="Divide"
                  onClick={performPathDivide}
                  variant="unstyled"
                  size="sm"
                  bg="transparent"
                  color="gray.700"
                  border="1px solid"
                  borderColor="gray.400"
                  borderRadius="md"
                  fontWeight="medium"
                  fontSize="10px"
                  transition="all 0.2s"
                  _hover={{
                    bg: 'gray.50'
                  }}
                  sx={{
                    minH: '28px',
                    px: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Divide
                </Button>
              </>
            )}
          </>
        )}
      </Grid>
    </Panel>
  );
};

// Export memoized version - only re-renders when props change (no props = never re-renders from parent)
// Component only re-renders internally when activePlugin changes or selection changes
export const PathOperationsPanel = React.memo(PathOperationsPanelComponent);

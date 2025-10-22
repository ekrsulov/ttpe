import React, { useMemo } from 'react';
import { Grid } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Scissors } from 'lucide-react';
import { Panel } from '../../components/ui/Panel';
import { OperationButton } from '../../components/ui/OperationButton';
import type { PathData } from '../../types';
import { pluginManager } from '../../utils/pluginManager';

const PathOperationsPanelComponent: React.FC = () => {
  // Subscribe only to the keys we need to detect changes in selection
  const selectedIdsKey = useCanvasStore(state => state.selectedIds.join(','));
  const selectedSubpathsKey = useCanvasStore(state => 
    (state.selectedSubpaths ?? []).map(sp => `${sp.elementId}-${sp.subpathIndex}`).join(',')
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
    
    const totalSelectedItems = selectedPathsCount + (selectedSubpaths?.length ?? 0);
    
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
  } = useCanvasStore.getState();

  // Show panel only if there are buttons to display
  if (!selectionInfo.hasPathWithMultipleSubpaths && selectionInfo.totalSelectedItems < 2) {
    return null;
  }

  const performPathSimplify = () => {
    // Use plugin API instead of store action
    pluginManager.callPluginApi('subpath', 'performPathSimplify');
  };

  const { totalSelectedItems, hasPathWithMultipleSubpaths } = selectionInfo;

  return (
    <Panel icon={<Scissors size={16} />} title="Path Operations">
      <Grid templateColumns="repeat(auto-fit, minmax(100px, 1fr))" gap={1}>
        {/* Split subpaths operation - available only if a selected path has multiple subpaths */}
        {hasPathWithMultipleSubpaths && (
          <OperationButton
            aria-label="Split subpaths"
            onClick={performPathSimplify}
          >
            Subpath Split
          </OperationButton>
        )}

        {/* Boolean operations - require 2+ items */}
        {totalSelectedItems >= 2 && (
          <>
            <OperationButton
              aria-label="Union (Simple)"
              onClick={performPathUnion}
            >
              Union
            </OperationButton>
            
            <OperationButton
              aria-label="Union (Paper.js)"
              onClick={performPathUnionPaperJS}
            >
              Union PaperJs
            </OperationButton>
            
            {totalSelectedItems === 2 && (
              <>
                <OperationButton
                  aria-label="Subtract"
                  onClick={performPathSubtraction}
                >
                  Subtract
                </OperationButton>
                
                <OperationButton
                  aria-label="Intersect"
                  onClick={performPathIntersect}
                >
                  Intersect
                </OperationButton>
                
                <OperationButton
                  aria-label="Exclude"
                  onClick={performPathExclude}
                >
                  Exclude
                </OperationButton>
                
                <OperationButton
                  aria-label="Divide"
                  onClick={performPathDivide}
                >
                  Divide
                </OperationButton>
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

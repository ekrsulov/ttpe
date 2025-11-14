import React, { useEffect, useRef } from 'react';
import { VStack, Text } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { useCanvasStore } from '../../store/canvasStore';
import { Scissors } from 'lucide-react';
import type { TrimPathPluginSlice } from '../trimPath/slice';

interface TrimPathPanelProps {
  hideTitle?: boolean;
}

export const TrimPathPanel: React.FC<TrimPathPanelProps> = ({ hideTitle = false }) => {
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const setActivePlugin = useCanvasStore(state => state.setActivePlugin);
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const trimPath = useCanvasStore(state => (state as TrimPathPluginSlice).trimPath);
  const deactivateTrimTool = useCanvasStore(state => (state as TrimPathPluginSlice).deactivateTrimTool);
  const activateTrimTool = useCanvasStore(state => (state as TrimPathPluginSlice).activateTrimTool);

  const isTrimModeActive = activePlugin === 'trimPath';
  
  // Store previous selected IDs to detect changes
  const previousSelectedIds = useRef<string[]>([]);
  const previousActivePlugin = useRef<string | null>(null);

  // Deactivate trim tool when switching away or selection changes
  useEffect(() => {
    // Always deactivate when switching away from trim plugin
    if (previousActivePlugin.current === 'trimPath' && activePlugin !== 'trimPath') {
       
      deactivateTrimTool?.();
      previousActivePlugin.current = activePlugin;
      previousSelectedIds.current = [...selectedIds];
      return;
    }
    
    // Clean state when switching TO trim plugin (fresh start)
    if (previousActivePlugin.current !== null && 
        previousActivePlugin.current !== 'trimPath' && 
        activePlugin === 'trimPath' && 
        trimPath?.splitResult !== null) {
       
      deactivateTrimTool?.();
    }
    
    // Handle selection changes while trim tool is active
    if (isTrimModeActive) {
      const currentIds = [...selectedIds].sort().join(',');
      const prevIds = previousSelectedIds.current.sort().join(',');
      
      // Selection changed
      if (prevIds && currentIds !== prevIds) {
        
        // If trim was active, recalculate or deactivate
        if (trimPath?.isActive) {
          if (selectedIds.length === 0) {
            deactivateTrimTool?.();
          } else {
            activateTrimTool?.();
          }
        }
      }
    }
    
    previousSelectedIds.current = [...selectedIds];
    previousActivePlugin.current = activePlugin;
  }, [activePlugin, selectedIds, trimPath?.isActive, trimPath?.splitResult, isTrimModeActive, deactivateTrimTool, activateTrimTool]);

  const handleActivateTrim = () => {
    // First deactivate to ensure clean state
    if (trimPath?.isActive) {
      deactivateTrimTool?.();
    }
    setActivePlugin('trimPath');
  };

  return (
    <Panel title="Trim Path" hideHeader={hideTitle}>
      <VStack spacing={3} align="stretch">
        <PanelStyledButton
          onClick={handleActivateTrim}
          isActive={isTrimModeActive}
        >
          <Scissors size={16} />
          Trim Tool
        </PanelStyledButton>

        <Text fontSize="sm">Plugin is {isTrimModeActive ? 'ACTIVE' : 'INACTIVE'}</Text>
      </VStack>
    </Panel>
  );
};
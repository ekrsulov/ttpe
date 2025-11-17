import React from 'react';
import {
  VStack,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import { PanelToggleGroup } from '../../ui/PanelToggleGroup';

/**
 * Offset Path Panel
 * 
 * Allows users to create offset paths (expansion or contraction)
 * with configurable distance and join types
 */
const OffsetPathPanelComponent: React.FC = () => {
  // Subscribe to state
  const offsetDistance = useCanvasStore(state => {
    const s = state as typeof state & { offsetDistance?: number };
    return s.offsetDistance ?? 5;
  });
  const offsetJoinType = useCanvasStore(state => {
    const s = state as typeof state & { offsetJoinType?: 'round' | 'miter' | 'bevel' };
    return s.offsetJoinType ?? 'round';
  });
  const offsetMiterLimit = useCanvasStore(state => {
    const s = state as typeof state & { offsetMiterLimit?: number };
    return s.offsetMiterLimit ?? 4;
  });
  const isApplyingOffset = useCanvasStore(state => {
    const s = state as typeof state & { isApplyingOffset?: boolean };
    return s.isApplyingOffset ?? false;
  });
  
  // Force re-render when selection changes
  useCanvasStore(state => state.selectedIds);
  
  // Get actions
  const state = useCanvasStore.getState() as typeof useCanvasStore extends { getState: () => infer S } ? S : never;
  const stateWithActions = state as typeof state & {
    canApplyOffset?: () => boolean;
    applyOffsetPath?: () => void;
    setOffsetDistance?: (distance: number) => void;
    setOffsetJoinType?: (joinType: 'round' | 'miter' | 'bevel') => void;
    setOffsetMiterLimit?: (limit: number) => void;
  };
  const {
    canApplyOffset,
    applyOffsetPath,
    setOffsetDistance,
    setOffsetJoinType,
    setOffsetMiterLimit,
  } = stateWithActions;

  const canApply = canApplyOffset?.() ?? false;

  const handleApply = () => {
    applyOffsetPath?.();
  };



  // Using SliderControl for Miter Limit change handler inline, no extra function needed

  if (!canApply) return null;

  return (
    <Panel title="Offset Path">
      <VStack align="stretch" spacing={2}>
        {/* Distance */}
        <FormControl>
          <SliderControl
            inline
            label="Distance"
            value={offsetDistance}
            min={-100}
            max={100}
            step={1}
            onChange={(value) => setOffsetDistance?.(value)}
            labelWidth="72px"
            valueWidth="56px"
          />
        </FormControl>

        {/* Join Type Selection (single choice) */}
        <FormControl>
          <FormLabel fontSize="sm" mb={2}>
            Corner Join Type
          </FormLabel>
          <PanelToggleGroup
            toggles={[
              { label: 'Round', isChecked: offsetJoinType === 'round', onChange: () => setOffsetJoinType?.('round') },
              { label: 'Miter', isChecked: offsetJoinType === 'miter', onChange: () => setOffsetJoinType?.('miter') },
              { label: 'Bevel', isChecked: offsetJoinType === 'bevel', onChange: () => setOffsetJoinType?.('bevel') },
            ]}
            direction="horizontal"
            spacing={2}
          />
        </FormControl>

        {/* Miter Limit (only show if miter is selected) */}
        {offsetJoinType === 'miter' && (
          <FormControl>
            <SliderControl
              inline
              label="Miter Limit"
              value={offsetMiterLimit}
              min={1}
              max={10}
              step={0.5}
              onChange={(value) => setOffsetMiterLimit?.(value)}
              labelWidth="72px"
              valueWidth="56px"
            />
          </FormControl>
        )}

        {/* Apply Button */}
        <PanelStyledButton
          onClick={handleApply}
          isDisabled={!canApply || isApplyingOffset}
          isLoading={isApplyingOffset}
          loadingText="Applying..."
          mt={1}
        >
          Apply Offset Path
        </PanelStyledButton>

        {/* nothing to show when there is no selection - panel is hidden */}
      </VStack>
    </Panel>
  );
};

export const OffsetPathPanel = React.memo(OffsetPathPanelComponent);

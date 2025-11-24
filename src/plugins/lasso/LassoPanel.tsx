import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import { Divider } from '@chakra-ui/react';
import type { LassoPluginSlice } from './slice';

interface LassoPanelProps {
  activePlugin?: string | null;
}

export const LassoPanel: React.FC<LassoPanelProps> = ({ activePlugin }) => {
  const lassoEnabled = useCanvasStore(s => (s as unknown as LassoPluginSlice).lassoEnabled ?? false);
  const lassoClosed = useCanvasStore(s => (s as unknown as LassoPluginSlice).lassoClosed ?? true);
  const setLassoEnabled = useCanvasStore(s => (s as unknown as LassoPluginSlice).setLassoEnabled);
  const setLassoClosed = useCanvasStore(s => (s as unknown as LassoPluginSlice).setLassoClosed);

  const showDivider = activePlugin === 'edit';

  return (
    <>
        {showDivider && <Divider my={1.5} />}
        <Panel
        title="Lasso Selector"
        headerActions={
            <PanelSwitch
            isChecked={lassoEnabled}
            onChange={(e) => setLassoEnabled?.(e.target.checked)}
            title="Toggle lasso selection mode"
            aria-label="Toggle lasso selection mode"
            />
        }
        >
        {lassoEnabled && (
        <PanelToggle
        isChecked={lassoClosed}
        onChange={(e) => setLassoClosed?.(e.target.checked)}
        >
        Closed
        </PanelToggle>
        )}
        </Panel>
    </>
  );
};

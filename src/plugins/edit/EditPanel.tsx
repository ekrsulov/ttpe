import React from 'react';
import { VStack, Box, Divider } from '@chakra-ui/react';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { ObjectSnapPanel } from '../objectSnap';
import { AddPointPanel } from '../addPoint';
import { SmoothBrushPanel } from '../smoothBrush';
import { PathSimplificationPanel } from '../pathSimplification';
import { RoundPathPanel } from '../roundPath';
import { useCanvasStore } from '../../store/canvasStore';
import type { CanvasStore } from '../../store/canvasStore';
import type { AddPointPluginSlice } from '../addPoint';
import type { SmoothBrushPluginSlice } from '../smoothBrush';
import type { PathSimplificationPluginSlice } from '../pathSimplification';
import type { RoundPathPluginSlice } from '../roundPath';

// Combined type for all plugin slices
type FullStore = CanvasStore &
  AddPointPluginSlice &
  SmoothBrushPluginSlice &
  PathSimplificationPluginSlice &
  RoundPathPluginSlice;

interface EditPanelProps {
  activePlugin: string | null;
}

export const EditPanel: React.FC<EditPanelProps> = ({ activePlugin }) => {
  // Get state from the store using each plugin's slice
  const addPointMode = useCanvasStore((state) => (state as FullStore).addPointMode);
  const smoothBrush = useCanvasStore((state) => (state as FullStore).smoothBrush);
  const pathSimplification = useCanvasStore((state) => (state as FullStore).pathSimplification);
  const pathRounding = useCanvasStore((state) => (state as FullStore).pathRounding);
  const selectedCommands = useCanvasStore((state) => (state as FullStore).selectedCommands || []);
  const selectedSubpaths = useCanvasStore((state) => (state as FullStore).selectedSubpaths || []);

  // Get actions from the store
  const activateAddPointMode = useCanvasStore((state) => (state as FullStore).activateAddPointMode);
  const deactivateAddPointMode = useCanvasStore((state) => (state as FullStore).deactivateAddPointMode);

  const updateSmoothBrush = useCanvasStore((state) => (state as FullStore).updateSmoothBrush);
  const applySmoothBrush = useCanvasStore((state) => (state as FullStore).applySmoothBrush);
  const activateSmoothBrush = useCanvasStore((state) => (state as FullStore).activateSmoothBrush);
  const deactivateSmoothBrush = useCanvasStore((state) => (state as FullStore).deactivateSmoothBrush);
  const resetSmoothBrush = useCanvasStore((state) => (state as FullStore).resetSmoothBrush);

  const updatePathSimplification = useCanvasStore((state) => (state as FullStore).updatePathSimplification);
  const applyPathSimplification = useCanvasStore((state) => (state as FullStore).applyPathSimplification);

  const updatePathRounding = useCanvasStore((state) => (state as FullStore).updatePathRounding);
  const applyPathRounding = useCanvasStore((state) => (state as FullStore).applyPathRounding);

  if (activePlugin !== 'edit') return null;

  return (
    <Box position="relative">
      <RenderCountBadgeWrapper componentName="EditPanel" position="top-left" />
      <VStack spacing={0} align="stretch">
        {/* Add Point Panel */}
        <AddPointPanel
          addPointMode={addPointMode}
          activateAddPointMode={activateAddPointMode}
          deactivateAddPointMode={deactivateAddPointMode}
        />

        <Divider my={2} />

        {/* Smooth Brush Panel */}
        <SmoothBrushPanel
          smoothBrush={smoothBrush}
          selectedCommands={selectedCommands}
          updateSmoothBrush={updateSmoothBrush}
          applySmoothBrush={applySmoothBrush}
          activateSmoothBrush={activateSmoothBrush}
          deactivateSmoothBrush={deactivateSmoothBrush}
          resetSmoothBrush={resetSmoothBrush}
        />

        <Divider my={2} />

        {/* Path Simplification Panel */}
        <PathSimplificationPanel
          pathSimplification={pathSimplification}
          selectedSubpaths={selectedSubpaths}
          updatePathSimplification={updatePathSimplification}
          applyPathSimplification={applyPathSimplification}
        />

        <Divider my={2} />

        {/* Round Path Panel */}
        <RoundPathPanel
          pathRounding={pathRounding}
          selectedSubpaths={selectedSubpaths}
          updatePathRounding={updatePathRounding}
          applyPathRounding={applyPathRounding}
        />

        <Divider my={2} />

        {/* Object Snap Panel */}
        <ObjectSnapPanel />
      </VStack>
    </Box>
  );
};
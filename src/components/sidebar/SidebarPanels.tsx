import React, { Suspense } from 'react';
import { Box } from '@chakra-ui/react';
import { ConditionalPanel } from '../ui/ConditionalPanel';

// Lazy load panel components
const EditorPanel = React.lazy(() => import('../plugins/EditorPanel').then(module => ({ default: module.EditorPanel })));
const EditPanel = React.lazy(() => import('../plugins/EditPanel').then(module => ({ default: module.EditPanel })));
const ControlPointAlignmentPanel = React.lazy(() => import('../plugins/ControlPointAlignmentPanel').then(module => ({ default: module.ControlPointAlignmentPanel })));
const OpticalAlignmentPanel = React.lazy(() => import('../plugins/OpticalAlignmentPanel').then(module => ({ default: module.OpticalAlignmentPanel })));
const PanPanel = React.lazy(() => import('../plugins/PanPanel').then(module => ({ default: module.PanPanel })));
const PencilPanel = React.lazy(() => import('../plugins/PencilPanel').then(module => ({ default: module.PencilPanel })));
const TransformationPanel = React.lazy(() => import('../plugins/TransformationPanel').then(module => ({ default: module.TransformationPanel })));
const TextPanel = React.lazy(() => import('../plugins/TextPanel').then(module => ({ default: module.TextPanel })));
const ShapePanel = React.lazy(() => import('../plugins/ShapePanel').then(module => ({ default: module.ShapePanel })));
const FilePanel = React.lazy(() => import('../plugins/FilePanel').then(module => ({ default: module.FilePanel })));
const SettingsPanel = React.lazy(() => import('../plugins/SettingsPanel').then(module => ({ default: module.SettingsPanel })));
const PathOperationsPanel = React.lazy(() => import('../plugins/PathOperationsPanel').then(module => ({ default: module.PathOperationsPanel })));
const SubPathOperationsPanel = React.lazy(() => import('../plugins/SubPathOperationsPanel').then(module => ({ default: module.SubPathOperationsPanel })));

interface SmoothBrush {
  radius: number;
  strength: number;
  isActive: boolean;
  cursorX: number;
  cursorY: number;
  simplifyPoints: boolean;
  simplificationTolerance: number;
  minDistance: number;
  affectedPoints: Array<{
    commandIndex: number;
    pointIndex: number;
    x: number;
    y: number;
  }>;
}

interface PathSimplification {
  tolerance: number;
}

interface PathRounding {
  radius: number;
}

interface SelectedCommand {
  elementId: string;
  commandIndex: number;
  pointIndex: number;
}

interface SidebarPanelsProps {
  activePlugin: string | null;
  showFilePanel: boolean;
  showSettingsPanel: boolean;
  // EditPanel props
  smoothBrush: SmoothBrush;
  pathSimplification: PathSimplification;
  pathRounding: PathRounding;
  selectedCommands: SelectedCommand[];
  updateSmoothBrush: (config: Partial<SmoothBrush>) => void;
  updatePathSimplification: (config: Partial<PathSimplification>) => void;
  updatePathRounding: (config: Partial<PathRounding>) => void;
  applySmoothBrush: () => void;
  applyPathSimplification: () => void;
  applyPathRounding: () => void;
  activateSmoothBrush: () => void;
  deactivateSmoothBrush: () => void;
  resetSmoothBrush: () => void;
}

/**
 * Main panels section of the sidebar with conditional rendering
 */
export const SidebarPanels: React.FC<SidebarPanelsProps> = ({
  activePlugin,
  showFilePanel,
  showSettingsPanel,
  smoothBrush,
  pathSimplification,
  pathRounding,
  selectedCommands,
  updateSmoothBrush,
  updatePathSimplification,
  updatePathRounding,
  applySmoothBrush,
  applyPathSimplification,
  applyPathRounding,
  activateSmoothBrush,
  deactivateSmoothBrush,
  resetSmoothBrush,
}) => {
  // Check if we're in special panel mode (file or settings)
  const isInSpecialPanelMode = showFilePanel || showSettingsPanel;

  return (
    <Box
      flex={1}
      px={2}
      pb={2}
      overflowY="auto"
      display="flex"
      flexDirection="column"
      gap={0.5}
      bg="white"
      css={{
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f1f1',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#888',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#555',
        },
      }}
    >
      <Suspense fallback={<Box h="20px" bg="gray.100" />}>
        {/* Special panel modes - show only the specific panel */}
        <ConditionalPanel condition={showFilePanel}>
          <FilePanel />
        </ConditionalPanel>
        
        <ConditionalPanel condition={showSettingsPanel}>
          <SettingsPanel />
        </ConditionalPanel>

        {/* Regular panels - only show when not in special panel mode */}
        <ConditionalPanel condition={!isInSpecialPanelMode}>
          <EditorPanel />
        </ConditionalPanel>
        
        <ConditionalPanel condition={!isInSpecialPanelMode && activePlugin === 'select'}>
          <PathOperationsPanel />
        </ConditionalPanel>
        
        <ConditionalPanel condition={!isInSpecialPanelMode}>
          <SubPathOperationsPanel />
        </ConditionalPanel>
        
        <ConditionalPanel condition={!isInSpecialPanelMode && activePlugin === 'edit'}>
          <EditPanel
            activePlugin={activePlugin}
            smoothBrush={smoothBrush}
            pathSimplification={pathSimplification}
            pathRounding={pathRounding}
            selectedCommands={selectedCommands}
            updateSmoothBrush={updateSmoothBrush}
            updatePathSimplification={updatePathSimplification}
            updatePathRounding={updatePathRounding}
            applySmoothBrush={applySmoothBrush}
            applyPathSimplification={applyPathSimplification}
            applyPathRounding={applyPathRounding}
            activateSmoothBrush={activateSmoothBrush}
            deactivateSmoothBrush={deactivateSmoothBrush}
            resetSmoothBrush={resetSmoothBrush}
          />
        </ConditionalPanel>
        
        <ConditionalPanel condition={!isInSpecialPanelMode && activePlugin === 'edit'}>
          <ControlPointAlignmentPanel />
        </ConditionalPanel>
        
        <ConditionalPanel condition={!isInSpecialPanelMode && activePlugin === 'select'}>
          <OpticalAlignmentPanel />
        </ConditionalPanel>
        
        <ConditionalPanel condition={!isInSpecialPanelMode && activePlugin === 'pan'}>
          <PanPanel />
        </ConditionalPanel>
        
        <ConditionalPanel condition={!isInSpecialPanelMode && activePlugin === 'pencil'}>
          <PencilPanel />
        </ConditionalPanel>
        
        <ConditionalPanel condition={!isInSpecialPanelMode && activePlugin === 'transformation'}>
          <TransformationPanel />
        </ConditionalPanel>
        
        <ConditionalPanel condition={!isInSpecialPanelMode && activePlugin === 'text'}>
          <TextPanel />
        </ConditionalPanel>
        
        <ConditionalPanel condition={!isInSpecialPanelMode && activePlugin === 'shape'}>
          <ShapePanel />
        </ConditionalPanel>
      </Suspense>
    </Box>
  );
};
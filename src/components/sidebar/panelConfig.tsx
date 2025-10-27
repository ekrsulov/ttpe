import React from 'react';
import type { SmoothBrush } from '../../plugins/edit/slice';

// Re-export SmoothBrush for backward compatibility
export type { SmoothBrush };

// Lazy load panel components
const EditorPanel = React.lazy(() => import('../plugins/EditorPanel').then(module => ({ default: module.EditorPanel })));
const EditPanel = React.lazy(() => import('../../plugins/edit/EditPanel').then(module => ({ default: module.EditPanel })));
const ControlPointAlignmentPanel = React.lazy(() => import('../../plugins/edit/ControlPointAlignmentPanel').then(module => ({ default: module.ControlPointAlignmentPanel })));
const OpticalAlignmentPanel = React.lazy(() => import('../../plugins/opticalAlignment/OpticalAlignmentPanel').then(module => ({ default: module.OpticalAlignmentPanel })));
const PanPanel = React.lazy(() => import('../plugins/PanPanel').then(module => ({ default: module.PanPanel })));
const PencilPanel = React.lazy(() => import('../../plugins/pencil/PencilPanel').then(module => ({ default: module.PencilPanel })));
const CurvesPanel = React.lazy(() => import('../../plugins/curves/CurvesPanel').then(module => ({ default: module.CurvesPanel })));
const TransformationPanel = React.lazy(() => import('../../plugins/transformation/TransformationPanel').then(module => ({ default: module.TransformationPanel })));
const TextPanel = React.lazy(() => import('../../plugins/text/TextPanel').then(module => ({ default: module.TextPanel })));
const ShapePanel = React.lazy(() => import('../../plugins/shape/ShapePanel').then(module => ({ default: module.ShapePanel })));
const FilePanel = React.lazy(() => import('../plugins/FilePanel').then(module => ({ default: module.FilePanel })));
const SettingsPanel = React.lazy(() => import('../plugins/SettingsPanel').then(module => ({ default: module.SettingsPanel })));
const PathOperationsPanel = React.lazy(() => import('../../plugins/edit/PathOperationsPanel').then(module => ({ default: module.PathOperationsPanel })));
const SubPathOperationsPanel = React.lazy(() => import('../../plugins/subpath/SubPathOperationsPanel').then(module => ({ default: module.SubPathOperationsPanel })));
const GuidelinesPanel = React.lazy(() => import('../../plugins/guidelines/GuidelinesPanel').then(module => ({ default: module.GuidelinesPanel })));
const GridPanel = React.lazy(() => import('../../plugins/grid/GridPanel').then(module => ({ default: module.default })));
const GridFillPanel = React.lazy(() => import('../../plugins/gridFill/GridFillPanel').then(module => ({ default: module.GridFillPanel })));

export interface PathSimplification {
  tolerance: number;
}

export interface PathRounding {
  radius: number;
}

export interface SelectedCommand {
  elementId: string;
  commandIndex: number;
  pointIndex: number;
}

export interface PanelConditionContext {
  activePlugin: string | null;
  showFilePanel: boolean;
  showSettingsPanel: boolean;
  isInSpecialPanelMode: boolean;
  canPerformOpticalAlignment: boolean;
}

export interface PanelComponentProps {
  activePlugin?: string | null;
  smoothBrush?: SmoothBrush;
  addPointMode?: {
    isActive: boolean;
  };
  pathSimplification?: PathSimplification;
  pathRounding?: PathRounding;
  selectedCommands?: SelectedCommand[];
  selectedSubpaths?: Array<{ elementId: string; subpathIndex: number }>;
  updateSmoothBrush?: (config: Partial<SmoothBrush>) => void;
  updatePathSimplification?: (config: Partial<PathSimplification>) => void;
  updatePathRounding?: (config: Partial<PathRounding>) => void;
  applySmoothBrush?: () => void;
  applyPathSimplification?: () => void;
  applyPathRounding?: () => void;
  activateSmoothBrush?: () => void;
  deactivateSmoothBrush?: () => void;
  resetSmoothBrush?: () => void;
  activateAddPointMode?: () => void;
  deactivateAddPointMode?: () => void;
}

export interface PanelConfig {
  key: string;
  condition: (ctx: PanelConditionContext) => boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getProps?: (allProps: PanelComponentProps) => any;
}

/**
 * Panel configuration array
 * Each panel has:
 * - key: unique identifier
 * - condition: function that determines if the panel should be shown
 * - component: the lazy-loaded component
 * - getProps: optional function to extract/map props for the component
 */
export const PANEL_CONFIGS: PanelConfig[] = [
  // Special panels (file and settings)
  {
    key: 'file',
    condition: (ctx) => ctx.showFilePanel,
    component: FilePanel,
  },
  {
    key: 'settings',
    condition: (ctx) => ctx.showSettingsPanel,
    component: SettingsPanel,
  },
  
  // Regular panels
  {
    key: 'editor',
    condition: (ctx) => !ctx.isInSpecialPanelMode,
    component: EditorPanel,
  },
  {
    key: 'path-operations',
    condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'select',
    component: PathOperationsPanel,
  },
  {
    key: 'subpath-operations',
    condition: (ctx) => !ctx.isInSpecialPanelMode,
    component: SubPathOperationsPanel,
  },
  {
    key: 'edit',
    condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'edit',
    component: EditPanel,
    getProps: (allProps) => ({
      activePlugin: allProps.activePlugin,
      smoothBrush: allProps.smoothBrush,
      addPointMode: allProps.addPointMode,
      pathSimplification: allProps.pathSimplification,
      pathRounding: allProps.pathRounding,
      selectedCommands: allProps.selectedCommands,
      selectedSubpaths: allProps.selectedSubpaths,
      updateSmoothBrush: allProps.updateSmoothBrush,
      updatePathSimplification: allProps.updatePathSimplification,
      updatePathRounding: allProps.updatePathRounding,
      applySmoothBrush: allProps.applySmoothBrush,
      applyPathSimplification: allProps.applyPathSimplification,
      applyPathRounding: allProps.applyPathRounding,
      activateSmoothBrush: allProps.activateSmoothBrush,
      deactivateSmoothBrush: allProps.deactivateSmoothBrush,
      resetSmoothBrush: allProps.resetSmoothBrush,
      activateAddPointMode: allProps.activateAddPointMode,
      deactivateAddPointMode: allProps.deactivateAddPointMode,
    }),
  },
  {
    key: 'control-point-alignment',
    condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'edit',
    component: ControlPointAlignmentPanel,
  },
  {
    key: 'optical-alignment',
    condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'select' && ctx.canPerformOpticalAlignment,
    component: OpticalAlignmentPanel,
  },
  {
    key: 'guidelines',
    condition: (ctx) => ctx.showSettingsPanel,
    component: GuidelinesPanel,
  },
  {
    key: 'grid',
    condition: (ctx) => ctx.showSettingsPanel,
    component: GridPanel,
  },
  {
    key: 'pan',
    condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'pan',
    component: PanPanel,
  },
  {
    key: 'pencil',
    condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'pencil',
    component: PencilPanel,
  },
  {
    key: 'curves',
    condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'curves',
    component: CurvesPanel,
  },
  {
    key: 'transformation',
    condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'transformation',
    component: TransformationPanel,
  },
  {
    key: 'text',
    condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'text',
    component: TextPanel,
  },
  {
    key: 'shape',
    condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'shape',
    component: ShapePanel,
  },
  {
    key: 'gridFill',
    condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'gridFill',
    component: GridFillPanel,
  },
];

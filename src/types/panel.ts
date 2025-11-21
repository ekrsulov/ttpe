import type { ComponentType, LazyExoticComponent } from 'react';

export interface SmoothBrush {
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
    component: LazyExoticComponent<ComponentType<any>> | ComponentType<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getProps?: (allProps: PanelComponentProps) => any;
}

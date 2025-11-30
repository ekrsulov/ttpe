import type { ComponentType, LazyExoticComponent } from 'react';

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
}

export interface PanelConfig {
    key: string;
    condition: (ctx: PanelConditionContext) => boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: LazyExoticComponent<ComponentType<any>> | ComponentType<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getProps?: (allProps: PanelComponentProps) => any;
}

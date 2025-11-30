import type { PluginDefinition } from '../types/plugins';
import type { CanvasStore } from '../store/canvasStore';
import type { ElementMap } from '../canvas/geometry/CanvasGeometryService';
import { Hand } from 'lucide-react';
import React from 'react';

// Lazy load PanPanel
const PanPanel = React.lazy(() => import('../sidebar/panels/PanPanel').then(module => ({ default: module.PanPanel })));

// Helper function to check if all selected elements belong to the same group
export const getAllElementsShareSameParentGroup = (
  selectedIds: string[],
  elementMap: ElementMap
): string | null => {
  if (selectedIds.length === 0) return null;

  let sharedParentId: string | null = null;

  for (const selectedId of selectedIds) {
    // Find parent group of this element
    let parentId: string | null = null;

    for (const [elementId, element] of elementMap) {
      if (element.type === 'group') {
        const childIds = (element.data as { childIds: string[] }).childIds;
        if (childIds.includes(selectedId)) {
          parentId = elementId;
          break;
        }
      }
    }

    // First iteration - set the shared parent
    if (sharedParentId === null) {
      sharedParentId = parentId;
    } else {
      // If this element has a different parent (or no parent), they don't share the same group
      if (sharedParentId !== parentId) {
        return null;
      }
    }
  }

  return sharedParentId;
};

export const panPlugin: PluginDefinition<CanvasStore> = {
  id: 'pan',
  metadata: {
    label: 'Pan',
    icon: Hand,
    cursor: 'grab',
  },
  modeConfig: {
    description: 'Mode for navigating the canvas.',
    transitions: {
      select: { description: 'Returns to selection mode.' },
      '*': { description: 'Allows transitioning to other modes.' },
    },
  },
  toolDefinition: { order: 5, visibility: 'always-shown' },
  behaviorFlags: () => ({
    isPanMode: true,
  }),
  subscribedEvents: ['pointermove'],
  handler: (
    event,
    _point,
    _target,
    context
  ) => {
    if (event.type === 'pointermove' && event.buttons === 1) {
      const deltaX = (event as React.PointerEvent).movementX;
      const deltaY = (event as React.PointerEvent).movementY;
      context.store.getState().pan(deltaX, deltaY);
    }
  },
  sidebarPanels: [
    {
      key: 'pan',
      condition: (ctx) => !ctx.isInSpecialPanelMode && ctx.activePlugin === 'pan',
      component: PanPanel,
    },
  ],
};

export const filePlugin: PluginDefinition<CanvasStore> = {
  id: 'file',
  metadata: { label: 'File', cursor: 'default' },
  behaviorFlags: () => ({
    isSidebarPanelMode: true,
  }),
  subscribedEvents: ['pointerdown'],
  handler: (_event, _point, _target, context) => {
    context.store.getState().setMode('select');
  },
};

export const settingsPlugin: PluginDefinition<CanvasStore> = {
  id: 'settings',
  metadata: { label: 'Settings', cursor: 'default' },
  behaviorFlags: () => ({
    isSidebarPanelMode: true,
  }),
  subscribedEvents: ['pointerdown'],
  handler: (_event, _point, _target, context) => {
    context.store.getState().setMode('select');
  },
};

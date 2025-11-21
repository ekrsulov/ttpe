import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import {
  Combine,
  Layers,
  Minimize,
  Grid3x3,
  SplitSquareVertical,
  Scissors,
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import type { FloatingContextMenuAction } from '../../types/plugins';
import { PathOperationsPanel } from './PathOperationsPanel';

export const pathPlugin: PluginDefinition<CanvasStore> = {
  id: 'path',
  metadata: {
    label: 'Path Operations',
  },
  relatedPluginPanels: [
    {
      id: 'path-operations-panel',
      targetPlugin: 'select',
      component: PathOperationsPanel,
      order: 1,
    },
  ],
  contextMenuActions: [
    {
      id: 'path-operations-menu',
      action: (context) => {
        if (context.type !== 'multiselection' || !context.elementIds) return null;

        const store = useCanvasStore.getState();
        const pathCount = context.elementIds.filter(id => {
          const el = store.elements.find(e => e.id === id);
          return el && el.type === 'path';
        }).length;

        if (pathCount < 2) return null;

        const pathOps: FloatingContextMenuAction[] = [];

        // Boolean operations for 2+ paths
        pathOps.push({ id: 'union', label: 'Union', icon: Combine, onClick: () => store.performPathUnion?.() });
        pathOps.push({ id: 'union-paperjs', label: 'Union (PaperJS)', icon: Layers, onClick: () => store.performPathUnionPaperJS?.() });

        // Binary operations for exactly 2 paths
        if (pathCount === 2) {
          pathOps.push({ id: 'subtract', label: 'Subtract', icon: Minimize, onClick: () => store.performPathSubtraction?.() });
          pathOps.push({ id: 'intersect', label: 'Intersect', icon: Grid3x3, onClick: () => store.performPathIntersect?.() });
          pathOps.push({ id: 'exclude', label: 'Exclude', icon: SplitSquareVertical, onClick: () => store.performPathExclude?.() });
          pathOps.push({ id: 'divide', label: 'Divide', icon: Scissors, onClick: () => store.performPathDivide?.() });
        }

        return {
          id: 'path-operations-menu',
          label: 'Path Operations',
          icon: Combine,
          submenu: pathOps,
        };
      },
    },
  ],
};

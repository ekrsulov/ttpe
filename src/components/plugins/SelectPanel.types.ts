import type { CanvasElement, PathElement } from '../../types';

/**
 * Union type for items in the SelectPanel
 * Can represent either a complete element or a subpath within an element
 */
export type SelectPanelItemData =
  | {
      type: 'element';
      element: CanvasElement;
      pointCount: number;
    }
  | {
      type: 'subpath';
      element: PathElement;
      subpathIndex: number;
      pointCount: number;
    };

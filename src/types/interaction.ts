import type { Point } from '.';

export interface DragContext {
    // Context for the drag operation
    // Can be extended in the future to include modifier keys, element info, etc.
    originalPoint: Point;
    excludeElementIds?: string[];
}

export interface DragModifier {
    id: string;
    /**
     * Modifies the drag point.
     * @param point The current point (potentially modified by previous modifiers)
     * @param context The context of the drag operation
     * @returns The modified point
     */
    modify: (point: Point, context: DragContext) => Point;

    /**
     * Priority of the modifier.
     * Modifiers are applied in ascending order of priority.
     * 0 = First
     * 100 = Last (e.g. final snap)
     */
    priority: number;
}

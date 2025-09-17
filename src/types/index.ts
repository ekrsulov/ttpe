export interface Point {
  x: number;
  y: number;
}

export interface PathData {
  d: string; // SVG path commands (M, L, C, Z.)
  strokeWidth: number;
  strokeColor: string;
  strokeOpacity: number;
  fillColor: string;
  fillOpacity: number;
  isPencilPath?: boolean; // Indicates if this path was created with the pencil tool
  transform?: {
    scaleX: number;
    scaleY: number;
    rotation: number;
    translateX: number;
    translateY: number;
  };
}

export type ElementType = 'path';

export interface CanvasElement {
  id: string;
  type: ElementType;
  data: PathData;
  zIndex: number;
}

export interface Viewport {
  zoom: number;
  panX: number;
  panY: number;
}

export interface PluginState {
  pan: {
    offsetX: number;
    offsetY: number;
  };
  zoom: {
    level: number;
  };
  pencil: {
    strokeWidth: number;
    strokeColor: string;
    strokeOpacity: number;
  };
  text: {
    text: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
  };
  select: {
    selectedIds: string[];
  };
  delete: Record<string, never>; // no state
}

export interface CanvasState {
  elements: CanvasElement[];
  viewport: Viewport;
  plugins: PluginState;
  activePlugin: string | null;
}
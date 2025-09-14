export interface Point {
  x: number;
  y: number;
}

export interface PathData {
  points: Point[];
  strokeWidth: number;
  strokeColor: string;
}

export interface TextData {
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline' | 'line-through';
}

export type ElementType = 'path' | 'text';

export interface CanvasElement {
  id: string;
  type: ElementType;
  data: PathData | TextData;
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
  };
  text: {
    text: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    textDecoration: 'none' | 'underline' | 'line-through';
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
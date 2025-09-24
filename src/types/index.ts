export interface Point {
  x: number;
  y: number;
}

// Control point alignment types
export type ControlPointType = 'independent' | 'aligned' | 'mirrored';

export interface ControlPointInfo {
  commandIndex: number;
  pointIndex: number;
  type: ControlPointType;
  pairedCommandIndex?: number;
  pairedPointIndex?: number;
  anchor: Point;
  isControl: boolean; // Made required to consolidate ControlPoint definitions
  associatedCommandIndex?: number; // Added to consolidate ControlPoint definitions
  associatedPointIndex?: number; // Added to consolidate ControlPoint definitions
}

// Control point combining position and info
export interface ControlPoint extends Point, ControlPointInfo { }

// Path command types
export type CommandType = 'M' | 'L' | 'C' | 'Z';

export type Command =
  | { type: 'M' | 'L'; position: Point }
  | { type: 'C'; controlPoint1: ControlPoint; controlPoint2: ControlPoint; position: Point }
  | { type: 'Z' };

export type SubPath = Command[];

// Configurable decimal precision for path coordinates
export const PATH_DECIMAL_PRECISION = 2;

export interface PathData {
  subPaths: SubPath[]; // Structured representation of SVG path commands
  strokeWidth: number;
  strokeColor: string;
  strokeOpacity: number;
  fillColor: string;
  fillOpacity: number;
  strokeLinecap?: 'butt' | 'round' | 'square'; // SVG stroke-linecap property
  strokeLinejoin?: 'miter' | 'round' | 'bevel'; // SVG stroke-linejoin property
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
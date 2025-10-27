export interface Point {
  x: number;
  y: number;
}

// Control point alignment types (calculated on-demand)
export type ControlPointType = 'independent' | 'aligned' | 'mirrored';

export interface ControlPointInfo {
  commandIndex: number;
  pointIndex: number;
  anchor: Point;
  isControl: boolean; // Made required to consolidate ControlPoint definitions
  associatedCommandIndex?: number; // Added to consolidate ControlPoint definitions
  associatedPointIndex?: number; // Added to consolidate ControlPoint definitions
}

// Control point combining position and info
export interface ControlPoint extends Point, ControlPointInfo { }

// Extended control point info with alignment data (calculated on-demand)
export interface ControlPointAlignmentInfo {
  type: ControlPointType;
  pairedCommandIndex?: number;
  pairedPointIndex?: number;
  anchor: Point;
}

// Path command types
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
  fillRule?: 'nonzero' | 'evenodd'; // SVG fill-rule property
  strokeDasharray?: string; // SVG stroke-dasharray property for dash patterns
  isPencilPath?: boolean; // Indicates if this path was created with the pencil tool
  transform?: {
    scaleX: number;
    scaleY: number;
    rotation: number;
    translateX: number;
    translateY: number;
  };
}

export type ElementType = 'path' | 'group';

export interface GroupData {
  childIds: string[];
  name: string;
  isLocked: boolean;
  isHidden: boolean;
  isExpanded: boolean;
  transform: {
    translateX: number;
    translateY: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
  };
}

export interface CanvasElementBase {
  id: string;
  type: ElementType;
  zIndex: number;
  parentId?: string | null;
}

export interface PathElement extends CanvasElementBase {
  type: 'path';
  data: PathData;
}

export interface GroupElement extends CanvasElementBase {
  type: 'group';
  data: GroupData;
}

export type CanvasElement = PathElement | GroupElement;

export interface Viewport {
  zoom: number;
  panX: number;
  panY: number;
}

// Curve tool types
export type CurvePointType = 'corner' | 'smooth' | 'asymmetric';

export interface CurvePoint {
  id: string;
  x: number;
  y: number;
  type: CurvePointType;
  handleIn?: Point;  // Handle entrante (para curvas)
  handleOut?: Point; // Handle saliente (para curvas)
  selected?: boolean;
}

export type CurveMode = 'inactive' | 'creating' | 'editing' | 'dragging_point' | 'dragging_handle';

export interface CurveDragState {
  pointId: string;
  dragType: 'point' | 'handle_in' | 'handle_out' | 'adjust_curvature' | 'adjust_last_segment' | 'adjust_closing_segment';
  startPoint: Point;
  startHandleIn?: Point;
  startHandleOut?: Point;
}

export interface CurveState {
  mode: CurveMode;
  isActive: boolean;
  points: CurvePoint[];
  selectedPointId?: string;
  dragState?: CurveDragState;
  previewPoint?: Point;
  previewHandle?: Point;
  isClosingPath?: boolean;
}

// Re-export selection types for convenience
export type { SelectedCommand, PointUpdate, SelectedSubpath } from './selection';

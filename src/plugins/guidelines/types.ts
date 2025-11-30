/**
 * Guidelines Plugin Types
 * 
 * Type definitions for the enhanced guidelines system
 */

export interface ManualGuide {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number; // canvas coordinates
  color?: string;
  locked: boolean;
  frameId?: string | null; // null = canvas level
}

export interface GuidelineMatch {
  type: 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY';
  position: number;
  elementIds: string[];
  // For manual guides
  isManualGuide?: boolean;
  guideId?: string;
}

export interface DistanceGuidelineMatch {
  axis: 'horizontal' | 'vertical';
  distance: number;
  // Reference pair that establishes the distance
  referenceStart: number;
  referenceEnd: number;
  referenceElementIds: [string, string];
  // Current element being moved
  currentStart: number;
  currentEnd: number;
  currentElementId: string;
}

export interface SizeMatch {
  type: 'width' | 'height';
  value: number;
  matchingElementIds: string[];
  currentElementId: string;
}

export interface AngleSnapMatch {
  angle: number; // degrees
  snappedAngle: number; // the angle we snapped to
  originalAngle: number;
}

export interface HoverMeasurement {
  elementId: string;
  targetId: string | 'guide'; // can be another element or a manual guide
  guideId?: string;
  axis: 'horizontal' | 'vertical';
  distance: number;
  start: number;
  end: number;
  perpendicularPosition: number;
}

export interface GuidelinesConfig {
  // Core toggles
  enabled: boolean;
  distanceEnabled: boolean;
  sizeMatchingEnabled: boolean;
  manualGuidesEnabled: boolean;
  angleSnapEnabled: boolean;
  
  // Thresholds
  snapThreshold: number; // pixels
  angleSnapThreshold: number; // degrees
  
  // Visual
  guidelineColor: string;
  distanceColor: string;
  manualGuideColor: string;
  sizeMatchColor: string;
  
  // Snap to specific features
  snapToEdges: boolean;
  snapToCenters: boolean;
  snapToManualGuides: boolean;
  snapToViewportCenter: boolean;
  
  // Debug
  debugMode: boolean;
}

export interface GuidelinesStickyState {
  isSticky: boolean;
  stickyOffset: { x: number; y: number };
  lastStickyTime: number;
}

export interface GuidelinesState extends GuidelinesConfig {
  // Manual guides
  manualGuides: ManualGuide[];
  
  // Current active matches
  currentMatches: GuidelineMatch[];
  currentDistanceMatches: DistanceGuidelineMatch[];
  currentSizeMatches: SizeMatch[];
  currentAngleSnap: AngleSnapMatch | null;
  
  // Hover measurements (Alt + hover)
  hoverMeasurements: HoverMeasurement[];
  isAltPressed: boolean;
  hoveredElementId: string | null;
  
  // Sticky state
  stickyState: GuidelinesStickyState;
  
  // Ruler interaction
  isDraggingGuide: boolean;
  draggingGuideType: 'horizontal' | 'vertical' | null;
  draggingGuidePosition: number | null;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const DEFAULT_GUIDELINES_CONFIG: GuidelinesConfig = {
  enabled: true,
  distanceEnabled: true,
  sizeMatchingEnabled: true,
  manualGuidesEnabled: false, // Disabled by default - rulers shown when enabled
  angleSnapEnabled: true,
  
  snapThreshold: 5,
  angleSnapThreshold: 5, // snap within 5 degrees
  
  guidelineColor: '#FF0000',
  distanceColor: '#666666',
  manualGuideColor: '#00BFFF', // Deep sky blue
  sizeMatchColor: '#00FF00',
  
  snapToEdges: true,
  snapToCenters: true,
  snapToManualGuides: true,
  snapToViewportCenter: true,
  
  debugMode: false,
};

export const COMMON_ANGLES = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345, 360];

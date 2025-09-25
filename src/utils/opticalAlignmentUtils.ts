import type { Point, Command, PathData, CanvasElement } from '../types';
import { measurePath } from './measurementUtils';
import { formatToPrecision, PATH_DECIMAL_PRECISION } from './index';

// Types for optical alignment
export interface PathGeometry {
  commands: Command[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  points: Point[];
  area: number;
  perimeter: number;
  centroid: Point;
  compactness: number;
  vertexCount: number;
  quadrantWeights: QuadrantWeights;
  directionalBias: DirectionalBias;
  shapeClassification: ShapeType;
}

export interface QuadrantWeights {
  topLeft: number;
  topRight: number;
  bottomLeft: number;
  bottomRight: number;
}

export interface DirectionalBias {
  horizontal: number; // -1 (left) to 1 (right)
  vertical: number;   // -1 (up) to 1 (down)
}

export type ShapeType = 'triangular' | 'circular' | 'rectangular' | 'irregular';

export interface ContainerInfo {
  elementId: string;
  subpathIndex?: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  geometry: PathGeometry;
  center: Point;
}

export interface ContentInfo {
  elementId: string;
  subpathIndex?: number;
  geometry: PathGeometry;
  opticalCenter: Point;
  visualWeight: number;
}

export interface AlignmentResult {
  container: ContainerInfo;
  content: ContentInfo[];
  alignmentPoint: Point;
  offsets: Array<{
    elementId: string;
    subpathIndex?: number;
    deltaX: number;
    deltaY: number;
  }>;
  metrics: AlignmentMetrics;
}

export interface AlignmentMetrics {
  mathematicalCenter: Point;
  opticalCenter: Point;
  horizontalBias: number;
  verticalBias: number;
  totalVisualWeight: number;
  asymmetryIndex: number;
}

/**
 * Converts path commands to discrete points for analysis
 */
export function commandsToPoints(commands: Command[]): Point[] {
  const points: Point[] = [];
  
  commands.forEach(cmd => {
    switch (cmd.type) {
      case 'M':
      case 'L':
        points.push(cmd.position);
        break;
      case 'C':
        points.push(cmd.controlPoint1, cmd.controlPoint2, cmd.position);
        break;
      // Z commands don't add points
    }
  });

  return points;
}

/**
 * Calculates the centroid of a set of points using the shoelace formula
 */
export function calculateCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];

  let area = 0;
  let cx = 0;
  let cy = 0;

  // Close the polygon if not already closed
  const closedPoints = [...points];
  if (points[0].x !== points[points.length - 1].x || points[0].y !== points[points.length - 1].y) {
    closedPoints.push(points[0]);
  }

  for (let i = 0; i < closedPoints.length - 1; i++) {
    const current = closedPoints[i];
    const next = closedPoints[i + 1];
    
    const cross = current.x * next.y - next.x * current.y;
    area += cross;
    cx += (current.x + next.x) * cross;
    cy += (current.y + next.y) * cross;
  }

  area *= 0.5;
  
  if (Math.abs(area) < 1e-10) {
    // Degenerate case: fall back to arithmetic mean
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return {
      x: formatToPrecision(sum.x / points.length, PATH_DECIMAL_PRECISION),
      y: formatToPrecision(sum.y / points.length, PATH_DECIMAL_PRECISION)
    };
  }

  return {
    x: formatToPrecision(cx / (6 * area), PATH_DECIMAL_PRECISION),
    y: formatToPrecision(cy / (6 * area), PATH_DECIMAL_PRECISION)
  };
}

/**
 * Calculates the perimeter of a polygon
 */
export function calculatePerimeter(points: Point[]): number {
  if (points.length < 2) return 0;

  let perimeter = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }

  // Close the polygon
  const dx = points[0].x - points[points.length - 1].x;
  const dy = points[0].y - points[points.length - 1].y;
  perimeter += Math.sqrt(dx * dx + dy * dy);

  return formatToPrecision(perimeter, PATH_DECIMAL_PRECISION);
}

/**
 * Calculates area using the shoelace formula
 */
export function calculateArea(points: Point[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return formatToPrecision(Math.abs(area) / 2, PATH_DECIMAL_PRECISION);
}

/**
 * Calculates quadrant weights based on point distribution
 */
export function calculateQuadrantWeights(points: Point[], centroid: Point): QuadrantWeights {
  const weights = { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 };
  
  points.forEach(point => {
    const dx = point.x - centroid.x;
    const dy = point.y - centroid.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 1e-10) return; // Skip points at centroid
    
    const weight = 1 / (distance + 1); // Inverse distance weighting
    
    if (dx >= 0 && dy <= 0) weights.topRight += weight;
    else if (dx < 0 && dy <= 0) weights.topLeft += weight;
    else if (dx < 0 && dy > 0) weights.bottomLeft += weight;
    else weights.bottomRight += weight;
  });

  // Normalize weights
  const total = weights.topLeft + weights.topRight + weights.bottomLeft + weights.bottomRight;
  if (total > 0) {
    weights.topLeft = formatToPrecision(weights.topLeft / total, PATH_DECIMAL_PRECISION);
    weights.topRight = formatToPrecision(weights.topRight / total, PATH_DECIMAL_PRECISION);
    weights.bottomLeft = formatToPrecision(weights.bottomLeft / total, PATH_DECIMAL_PRECISION);
    weights.bottomRight = formatToPrecision(weights.bottomRight / total, PATH_DECIMAL_PRECISION);
  }

  return weights;
}

/**
 * Calculates directional bias from quadrant weights
 */
export function calculateDirectionalBias(quadrantWeights: QuadrantWeights): DirectionalBias {
  const horizontal = (quadrantWeights.topRight + quadrantWeights.bottomRight) - 
                    (quadrantWeights.topLeft + quadrantWeights.bottomLeft);
  const vertical = (quadrantWeights.bottomLeft + quadrantWeights.bottomRight) - 
                   (quadrantWeights.topLeft + quadrantWeights.topRight);

  return {
    horizontal: formatToPrecision(Math.max(-1, Math.min(1, horizontal)), PATH_DECIMAL_PRECISION),
    vertical: formatToPrecision(Math.max(-1, Math.min(1, vertical)), PATH_DECIMAL_PRECISION)
  };
}

/**
 * Classifies shape type based on geometric properties
 */
export function classifyShape(geometry: PathGeometry): ShapeType {
  const { compactness, vertexCount, quadrantWeights } = geometry;
  
  // Circular shapes have high compactness
  if (compactness > 0.8) return 'circular';
  
  // Triangular shapes typically have 3-4 vertices and specific weight distribution
  if (vertexCount <= 4 && compactness > 0.3) {
    const maxWeight = Math.max(
      quadrantWeights.topLeft,
      quadrantWeights.topRight,
      quadrantWeights.bottomLeft,
      quadrantWeights.bottomRight
    );
    if (maxWeight > 0.4) return 'triangular';
  }
  
  // Rectangular shapes have moderate compactness and even distribution
  if (compactness > 0.6 && compactness <= 0.8) {
    const weightVariance = calculateWeightVariance(quadrantWeights);
    if (weightVariance < 0.1) return 'rectangular';
  }
  
  return 'irregular';
}

/**
 * Helper function to calculate variance in quadrant weights
 */
function calculateWeightVariance(weights: QuadrantWeights): number {
  const values = [weights.topLeft, weights.topRight, weights.bottomLeft, weights.bottomRight];
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return formatToPrecision(variance, PATH_DECIMAL_PRECISION);
}

/**
 * Analyzes a path and extracts geometric properties
 */
export function analyzePathGeometry(commands: Command[], strokeWidth: number = 1): PathGeometry {
  const bounds = measurePath([commands], strokeWidth, 1); // Use zoom = 1 for true coordinates
  const points = commandsToPoints(commands);
  
  const area = calculateArea(points);
  const perimeter = calculatePerimeter(points);
  const centroid = calculateCentroid(points);
  
  // Compactness = 4π * area / perimeter²
  const compactness = perimeter > 0 ? 
    formatToPrecision((4 * Math.PI * area) / (perimeter * perimeter), PATH_DECIMAL_PRECISION) : 0;
  
  const vertexCount = points.length;
  const quadrantWeights = calculateQuadrantWeights(points, centroid);
  const directionalBias = calculateDirectionalBias(quadrantWeights);
  
  const geometry: PathGeometry = {
    commands,
    bounds,
    points,
    area,
    perimeter,
    centroid,
    compactness,
    vertexCount,
    quadrantWeights,
    directionalBias,
    shapeClassification: 'irregular' // Will be set below
  };
  
  geometry.shapeClassification = classifyShape(geometry);
  
  return geometry;
}

/**
 * Detects which path should be the container
 */
export function detectContainer(
  elements: CanvasElement[],
  selectedIds: string[],
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }> = []
): ContainerInfo | null {
  const candidates: Array<{
    elementId: string;
    subpathIndex?: number;
    bounds: { minX: number; minY: number; maxX: number; maxY: number };
    area: number;
    geometry: PathGeometry;
  }> = [];

  // Analyze selected elements
  selectedIds.forEach(id => {
    const element = elements.find(el => el.id === id);
    if (element && element.type === 'path') {
      const pathData = element.data as PathData;
      const allCommands = pathData.subPaths.flat();
      const bounds = measurePath(pathData.subPaths, pathData.strokeWidth, 1);
      const geometry = analyzePathGeometry(allCommands, pathData.strokeWidth);
      
      candidates.push({
        elementId: id,
        bounds,
        area: geometry.area,
        geometry
      });
    }
  });

  // Analyze selected subpaths
  selectedSubpaths.forEach(({ elementId, subpathIndex }) => {
    const element = elements.find(el => el.id === elementId);
    if (element && element.type === 'path') {
      const pathData = element.data as PathData;
      
      if (subpathIndex < pathData.subPaths.length) {
        const subpathCommands = pathData.subPaths[subpathIndex];
        const bounds = measurePath([subpathCommands], pathData.strokeWidth, 1);
        const geometry = analyzePathGeometry(subpathCommands, pathData.strokeWidth);
        
        candidates.push({
          elementId,
          subpathIndex,
          bounds,
          area: geometry.area,
          geometry
        });
      }
    }
  });

  if (candidates.length < 2) return null;

  // Sort by area (largest first)
  candidates.sort((a, b) => b.area - a.area);

  // Find the largest path that contains the others
  for (const candidate of candidates) {
    const isContainer = candidates.every(other => {
      if (other.elementId === candidate.elementId && other.subpathIndex === candidate.subpathIndex) {
        return true; // Same path
      }
      
      // Check if candidate bounds contain other bounds
      return (
        candidate.bounds.minX <= other.bounds.minX &&
        candidate.bounds.minY <= other.bounds.minY &&
        candidate.bounds.maxX >= other.bounds.maxX &&
        candidate.bounds.maxY >= other.bounds.maxY
      );
    });

    if (isContainer) {
      // Calculate the optical center of the container, not just the mathematical center
      const opticalCenter = calculateOpticalCenter(candidate.geometry);
      
      return {
        elementId: candidate.elementId,
        subpathIndex: candidate.subpathIndex,
        bounds: candidate.bounds,
        geometry: candidate.geometry,
        center: opticalCenter
      };
    }
  }

  return null; // No valid container found
}

/**
 * Calculates optical alignment point based on container and content
 */
export function calculateOpticalAlignment(
  container: ContainerInfo,
  content: ContentInfo[]
): AlignmentResult {
  // Calculate mathematical center of container
  const mathematicalCenter = container.center;

  // Calculate weighted optical center based on content
  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;

  content.forEach(item => {
    const weight = item.visualWeight;
    totalWeight += weight;
    weightedX += item.opticalCenter.x * weight;
    weightedY += item.opticalCenter.y * weight;
  });

  const opticalCenter = totalWeight > 0 ? {
    x: formatToPrecision(weightedX / totalWeight, PATH_DECIMAL_PRECISION),
    y: formatToPrecision(weightedY / totalWeight, PATH_DECIMAL_PRECISION)
  } : mathematicalCenter;

  // Calculate target alignment point - should be the optical center of the container
  const alignmentPoint = {
    x: formatToPrecision(container.center.x, PATH_DECIMAL_PRECISION),
    y: formatToPrecision(container.center.y, PATH_DECIMAL_PRECISION)
  };

  // Calculate offsets needed for each content item
  const offsets = content.map(item => ({
    elementId: item.elementId,
    subpathIndex: item.subpathIndex,
    deltaX: formatToPrecision(alignmentPoint.x - item.opticalCenter.x, PATH_DECIMAL_PRECISION),
    deltaY: formatToPrecision(alignmentPoint.y - item.opticalCenter.y, PATH_DECIMAL_PRECISION)
  }));

  // Calculate metrics
  const totalVisualWeight = formatToPrecision(totalWeight, PATH_DECIMAL_PRECISION);
  const asymmetryIndex = calculateAsymmetryIndex(content);

  const metrics: AlignmentMetrics = {
    mathematicalCenter,
    opticalCenter,
    horizontalBias: 0.5,
    verticalBias: 0.5,
    totalVisualWeight,
    asymmetryIndex
  };

  return {
    container,
    content,
    alignmentPoint,
    offsets,
    metrics
  };
}

/**
 * Calculates asymmetry index for content items
 */
function calculateAsymmetryIndex(content: ContentInfo[]): number {
  if (content.length < 2) return 0;

  // Calculate center of mass
  let totalWeight = 0;
  let centerX = 0;
  let centerY = 0;

  content.forEach(item => {
    totalWeight += item.visualWeight;
    centerX += item.opticalCenter.x * item.visualWeight;
    centerY += item.opticalCenter.y * item.visualWeight;
  });

  if (totalWeight === 0) return 0;

  centerX /= totalWeight;
  centerY /= totalWeight;

  // Calculate asymmetry as weighted variance from center
  let asymmetry = 0;
  content.forEach(item => {
    const dx = item.opticalCenter.x - centerX;
    const dy = item.opticalCenter.y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    asymmetry += distance * item.visualWeight;
  });

  return formatToPrecision(asymmetry / totalWeight, PATH_DECIMAL_PRECISION);
}

/**
 * Prepares content info from elements and subpaths
 */
export function prepareContentInfo(
  elements: CanvasElement[],
  selectedIds: string[],
  selectedSubpaths: Array<{ elementId: string; subpathIndex: number }> = [],
  containerInfo: ContainerInfo
): ContentInfo[] {
  const content: ContentInfo[] = [];

  // Process selected elements (excluding container)
  selectedIds.forEach(id => {
    if (id === containerInfo.elementId && containerInfo.subpathIndex === undefined) {
      return; // Skip container element
    }

    const element = elements.find(el => el.id === id);
    if (element && element.type === 'path') {
      const pathData = element.data as PathData;
      const allCommands = pathData.subPaths.flat();
      const geometry = analyzePathGeometry(allCommands, pathData.strokeWidth);
      
      content.push({
        elementId: id,
        geometry,
        opticalCenter: calculateOpticalCenter(geometry),
        visualWeight: calculateVisualWeight(geometry)
      });
    }
  });

  // Process selected subpaths (excluding container subpath)
  selectedSubpaths.forEach(({ elementId, subpathIndex }) => {
    if (elementId === containerInfo.elementId && subpathIndex === containerInfo.subpathIndex) {
      return; // Skip container subpath
    }

    const element = elements.find(el => el.id === elementId);
    if (element && element.type === 'path') {
      const pathData = element.data as PathData;
      
      if (subpathIndex < pathData.subPaths.length) {
        const subpathCommands = pathData.subPaths[subpathIndex];
        const geometry = analyzePathGeometry(subpathCommands, pathData.strokeWidth);
        
        content.push({
          elementId,
          subpathIndex,
          geometry,
          opticalCenter: calculateOpticalCenter(geometry),
          visualWeight: calculateVisualWeight(geometry)
        });
      }
    }
  });

  return content;
}

/**
 * Calculates optical center based on geometric properties
 */
function calculateOpticalCenter(geometry: PathGeometry): Point {
  const { centroid, directionalBias, shapeClassification, bounds } = geometry;

  // Apply shape-specific adjustments to centroid
  let adjustmentX = 0;
  let adjustmentY = 0;

  // Calculate the magnitude of vertical bias to determine if correction is needed
  const verticalBiasMagnitude = Math.abs(directionalBias.vertical);

  switch (shapeClassification) {
    case 'triangular':
      // Triangular shapes often need adjustment based on direction
      // If directionalBias.horizontal is negative (more mass on left), move optical center right
      adjustmentX = -directionalBias.horizontal * 0.2;
      // Only apply vertical adjustment for significant bias (> 0.3) to avoid over-correction
      adjustmentY = verticalBiasMagnitude > 0.3 ? -directionalBias.vertical * 0.02 : 0;
      break;
    case 'circular':
      // Circular shapes are typically well-centered - no adjustments
      break;
    case 'rectangular':
      // Rectangular shapes might need slight horizontal adjustments only
      adjustmentX = -directionalBias.horizontal * 0.05;
      // Vertical adjustment only for very significant bias
      adjustmentY = verticalBiasMagnitude > 0.4 ? -directionalBias.vertical * 0.01 : 0;
      break;
    case 'irregular':
      // Irregular shapes get more significant horizontal adjustments
      adjustmentX = -directionalBias.horizontal * 0.25;
      // Conservative vertical adjustment only for very significant bias
      adjustmentY = verticalBiasMagnitude > 0.5 ? -directionalBias.vertical * 0.02 : 0;
      break;
  }

  const adjustmentRangeX = (bounds.maxX - bounds.minX) * adjustmentX;
  const adjustmentRangeY = (bounds.maxY - bounds.minY) * adjustmentY;

  const result = {
    x: formatToPrecision(centroid.x + adjustmentRangeX, PATH_DECIMAL_PRECISION),
    y: formatToPrecision(centroid.y + adjustmentRangeY, PATH_DECIMAL_PRECISION)
  };
  
  return result;
}

/**
 * Calculates visual weight based on area and shape complexity
 */
function calculateVisualWeight(geometry: PathGeometry): number {
  const { area, compactness, vertexCount } = geometry;

  // Base weight from area
  let weight = area;

  // Adjust for compactness (more compact shapes appear heavier)
  weight *= (1 + compactness);

  // Adjust for complexity (more vertices can appear lighter due to visual fragmentation)
  const complexityFactor = Math.max(0.5, 1 - (vertexCount - 3) * 0.05);
  weight *= complexityFactor;

  return formatToPrecision(Math.max(0.1, weight), PATH_DECIMAL_PRECISION);
}
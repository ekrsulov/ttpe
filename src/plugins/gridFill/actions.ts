import type { Point } from '../../types';
import type { CanvasStore } from '../../store/canvasStore';
import type { GridType } from '../grid/slice';
import { parsePathD } from '../../utils/pathParserUtils';
import { extractSubpaths } from '../../utils/pathParserUtils';

/**
 * Get the grid cell vertices based on grid type and clicked point
 */
function getGridCellVertices(point: Point, gridType: GridType, spacing: number, state: CanvasStore): Point[] {
  const { grid } = state;

  const intersectHalfPlanes = (halfPlanes: Array<{ a: number; b: number; c: number }>): Point[] => {
    const intersections: Point[] = [];
    const epsilon = 1e-6;

    const satisfiesAll = (pt: Point) =>
      halfPlanes.every(({ a, b, c }) => a * pt.x + b * pt.y + c >= -epsilon);

    for (let i = 0; i < halfPlanes.length; i++) {
      for (let j = i + 1; j < halfPlanes.length; j++) {
        const { a: a1, b: b1, c: c1 } = halfPlanes[i];
        const { a: a2, b: b2, c: c2 } = halfPlanes[j];

        const det = a1 * b2 - a2 * b1;
        if (Math.abs(det) < epsilon) {
          continue;
        }

        const x = (b1 * c2 - b2 * c1) / det;
        const y = (c1 * a2 - c2 * a1) / det;
        const candidate = { x, y };

        if (satisfiesAll(candidate)) {
          intersections.push(candidate);
        }
      }
    }

    const unique: Point[] = [];
    for (const pt of intersections) {
      if (!unique.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < epsilon)) {
        unique.push(pt);
      }
    }

    if (unique.length <= 2) {
      return unique;
    }

    const centroid = unique.reduce(
      (acc, pt) => ({ x: acc.x + pt.x, y: acc.y + pt.y }),
      { x: 0, y: 0 }
    );
    centroid.x /= unique.length;
    centroid.y /= unique.length;

    unique.sort(
      (p, q) => Math.atan2(p.y - centroid.y, p.x - centroid.x) - Math.atan2(q.y - centroid.y, q.x - centroid.x)
    );

    return unique;
  };

  switch (gridType) {
    case 'square': {
      // Find the cell corners for square grid
      const cellX = Math.floor(point.x / spacing) * spacing;
      const cellY = Math.floor(point.y / spacing) * spacing;
      
      return [
        { x: cellX, y: cellY },
        { x: cellX + spacing, y: cellY },
        { x: cellX + spacing, y: cellY + spacing },
        { x: cellX, y: cellY + spacing },
      ];
    }
    
    case 'dots': {
      // For dots, create a square around the nearest dot
      const nearestX = Math.round(point.x / spacing) * spacing;
      const nearestY = Math.round(point.y / spacing) * spacing;
      const halfSpace = spacing / 2;
      
      return [
        { x: nearestX - halfSpace, y: nearestY - halfSpace },
        { x: nearestX + halfSpace, y: nearestY - halfSpace },
        { x: nearestX + halfSpace, y: nearestY + halfSpace },
        { x: nearestX - halfSpace, y: nearestY + halfSpace },
      ];
    }

    case 'isometric': {
      const tan30 = Math.tan(Math.PI / 6);
      const cos30 = Math.cos(Math.PI / 6);
      const spacing60 = (spacing * tan30) / cos30;

      const verticalIndex = Math.floor(point.x / spacing);
      const xLeft = verticalIndex * spacing;
      const xRight = (verticalIndex + 1) * spacing;

      const c60 = point.y - tan30 * point.x;
      const index60 = Math.floor(c60 / spacing60);
      const c60Low = index60 * spacing60;
      const c60High = (index60 + 1) * spacing60;

      const c120 = point.y + tan30 * point.x;
      const index120 = Math.floor(c120 / spacing60);
      const c120Low = index120 * spacing60;
      const c120High = (index120 + 1) * spacing60;

      const halfPlanes = [
        { a: 1, b: 0, c: -xLeft },
        { a: -1, b: 0, c: xRight },
        { a: -tan30, b: 1, c: -c60Low },
        { a: tan30, b: -1, c: c60High },
        { a: tan30, b: 1, c: -c120Low },
        { a: -tan30, b: -1, c: c120High },
      ];

      const polygon = intersectHalfPlanes(halfPlanes);
      if (polygon.length >= 3) {
        return polygon;
      }

      // Fallback: construct minimal triangle if numerical issues occur
      const intersection60 = (x: number, constant: number) => tan30 * x + constant;
      const intersection120 = (x: number, constant: number) => -tan30 * x + constant;

      return [
        { x: xLeft, y: intersection120(xLeft, c120Low) },
        { x: xRight, y: intersection60(xRight, c60Low) },
        { x: (c120Low - c60Low) / (2 * tan30), y: (c60Low + c120Low) / 2 },
      ];
    }

    case 'triangular': {
      const height = (spacing * Math.sqrt(3)) / 2;

      const latticeV = { x: spacing / 2, y: height };
      const latticeU = { x: spacing, y: 0 };

      const bCoord = point.y / height;
      const aCoord = point.x / spacing - bCoord / 2;

      const cellI = Math.floor(aCoord);
      const cellJ = Math.floor(bCoord);

      const fracA = aCoord - cellI;
      const fracB = bCoord - cellJ;

      const origin = {
        x: cellI * latticeU.x + cellJ * latticeV.x,
        y: cellI * latticeU.y + cellJ * latticeV.y,
      };

      const vertexB = { x: origin.x + latticeU.x, y: origin.y + latticeU.y };
      const vertexC = { x: origin.x + latticeV.x, y: origin.y + latticeV.y };
      const vertexD = { x: vertexB.x + latticeV.x, y: vertexB.y + latticeV.y };

      if (fracA + fracB <= 1) {
        return [origin, vertexB, vertexC];
      }

      return [vertexB, vertexD, vertexC];
    }
    
    case 'hexagonal': {
      // Hexagonal grid - find the hexagon based on axial coordinates
      const orientation = grid?.hexOrientation ?? 'pointy';
      
      if (orientation === 'pointy') {
        // Pointy-top hexagons
        const width = spacing * Math.sqrt(3);
        const verticalSpacing = spacing * 1.5;
        
        // Find approximate row and column
        const approxRow = Math.floor(point.y / verticalSpacing);
        const approxCol = Math.floor((point.x - (approxRow % 2) * (width / 2)) / width);
        
        // Check this hexagon and its neighbors to find the closest one
        const candidates: Array<{ row: number; col: number; dist: number }> = [];
        
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const row = approxRow + dr;
            const col = approxCol + dc;
            
            const offsetX = (row % 2) * (width / 2);
            const centerX = col * width + offsetX;
            const centerY = row * verticalSpacing;
            
            const dx = point.x - centerX;
            const dy = point.y - centerY;
            const dist = dx * dx + dy * dy;
            
            candidates.push({ row, col, dist });
          }
        }
        
        // Find the closest hexagon
        candidates.sort((a, b) => a.dist - b.dist);
        const { row, col } = candidates[0];
        
        const offsetX = (row % 2) * (width / 2);
        const centerX = col * width + offsetX;
        const centerY = row * verticalSpacing;
        
        // Create hexagon vertices
        const vertices: Point[] = [];
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          vertices.push({
            x: centerX + spacing * Math.cos(angle),
            y: centerY + spacing * Math.sin(angle),
          });
        }
        return vertices;
      } else {
        // Flat-top hexagons
        const width = spacing * 2;
        const height = spacing * Math.sqrt(3);
        const horizontalSpacing = width * 0.75;
        
        // Find approximate column and row
        const approxCol = Math.floor(point.x / horizontalSpacing);
        const approxRow = Math.floor((point.y - (approxCol % 2) * (height / 2)) / height);
        
        // Check this hexagon and its neighbors to find the closest one
        const candidates: Array<{ row: number; col: number; dist: number }> = [];
        
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const row = approxRow + dr;
            const col = approxCol + dc;
            
            const offsetY = (col % 2) * (height / 2);
            const centerX = col * horizontalSpacing;
            const centerY = row * height + offsetY;
            
            const dx = point.x - centerX;
            const dy = point.y - centerY;
            const dist = dx * dx + dy * dy;
            
            candidates.push({ row, col, dist });
          }
        }
        
        // Find the closest hexagon
        candidates.sort((a, b) => a.dist - b.dist);
        const { row, col } = candidates[0];
        
        const offsetY = (col % 2) * (height / 2);
        const centerX = col * horizontalSpacing;
        const centerY = row * height + offsetY;
        
        // Create hexagon vertices
        const vertices: Point[] = [];
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i + Math.PI / 6;
          vertices.push({
            x: centerX + spacing * Math.cos(angle),
            y: centerY + spacing * Math.sin(angle),
          });
        }
        return vertices;
      }
    }
    
    case 'diagonal': {
      // Diagonal grid uses two families of parallel lines:
      // - 45° lines: y - x = n * spacing (constant along each line)
      // - 135° lines: y + x = m * spacing (constant along each line)
      
      // Find which 45° line (y - x = constant)
      const diff45 = point.y - point.x;
      const n45 = Math.floor(diff45 / spacing);
      
      // Find which 135° line (y + x = constant)
      const sum135 = point.y + point.x;
      const n135 = Math.floor(sum135 / spacing);
      
      // The diamond is formed by the intersections of four lines:
      // - Two 45° lines: y - x = n45*spacing and y - x = (n45+1)*spacing
      // - Two 135° lines: y + x = n135*spacing and y + x = (n135+1)*spacing
      
      // Bottom vertex: intersection of y-x = n45*spacing and y+x = n135*spacing
      // y = x + n45*spacing and y = -x + n135*spacing
      // x + n45*spacing = -x + n135*spacing
      // 2x = n135*spacing - n45*spacing
      const xBottom = (n135 * spacing - n45 * spacing) / 2;
      const yBottom = xBottom + n45 * spacing;
      
      // Right vertex: intersection of y-x = n45*spacing and y+x = (n135+1)*spacing
      const xRight = ((n135 + 1) * spacing - n45 * spacing) / 2;
      const yRight = xRight + n45 * spacing;
      
      // Top vertex: intersection of y-x = (n45+1)*spacing and y+x = (n135+1)*spacing
      const xTop = ((n135 + 1) * spacing - (n45 + 1) * spacing) / 2;
      const yTop = xTop + (n45 + 1) * spacing;
      
      // Left vertex: intersection of y-x = (n45+1)*spacing and y+x = n135*spacing
      const xLeft = (n135 * spacing - (n45 + 1) * spacing) / 2;
      const yLeft = xLeft + (n45 + 1) * spacing;
      
      return [
        { x: xBottom, y: yBottom },
        { x: xRight, y: yRight },
        { x: xTop, y: yTop },
        { x: xLeft, y: yLeft },
      ];
    }
    
    case 'polar': {
      // Polar grid - create a circular sector
      const divisions = grid?.polarDivisions ?? 12;
      const angleStep = (2 * Math.PI) / divisions;
      
      // Calculate radius and angle from origin
      const radius = Math.sqrt(point.x * point.x + point.y * point.y);
      const angle = Math.atan2(point.y, point.x);
      
      // Find which ring and sector
      const ringIndex = Math.floor(radius / spacing);
      const sectorIndex = Math.floor((angle + Math.PI) / angleStep);
      
      const innerRadius = ringIndex * spacing;
      const outerRadius = (ringIndex + 1) * spacing;
      const startAngle = sectorIndex * angleStep - Math.PI;
      const endAngle = (sectorIndex + 1) * angleStep - Math.PI;
      
      // Create arc with approximation (8 points per arc)
      const vertices: Point[] = [];
      const segments = 8;
      
      // Outer arc
      for (let i = 0; i <= segments; i++) {
        const a = startAngle + (endAngle - startAngle) * (i / segments);
        vertices.push({
          x: outerRadius * Math.cos(a),
          y: outerRadius * Math.sin(a),
        });
      }
      
      // Inner arc (reverse)
      for (let i = segments; i >= 0; i--) {
        const a = startAngle + (endAngle - startAngle) * (i / segments);
        vertices.push({
          x: innerRadius * Math.cos(a),
          y: innerRadius * Math.sin(a),
        });
      }
      
      return vertices;
    }
    
    case 'parametric': {
      // For parametric grids, find the base cell and apply warp transformation
      // We need to use the inverse warp to find which cell we're in
      const stepX = spacing;
      const stepY = grid?.parametricStepY ?? spacing;

      if (!grid?.parametricWarp) {
        // No warp, use base rectangle respecting custom stepY
        const cellX = Math.floor(point.x / stepX) * stepX;
        const cellY = Math.floor(point.y / stepY) * stepY;
        return [
          { x: cellX, y: cellY },
          { x: cellX + stepX, y: cellY },
          { x: cellX + stepX, y: cellY + stepY },
          { x: cellX, y: cellY + stepY },
        ];
      }

      const warp = grid.parametricWarp;

      // To find which cell contains the point, we need to search nearby cells
      // Start with the approximate cell based on point coordinates
      const approxCol = Math.floor(point.x / stepX);
      const approxRow = Math.floor(point.y / stepY);
      
      // Check this cell and surrounding cells (3x3 grid)
      let bestCol = approxCol;
      let bestRow = approxRow;
      let minDist = Infinity;
      
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const row = approxRow + dr;
          const col = approxCol + dc;
          const baseX = col * stepX;
          const baseY = row * stepY;

          // Calculate center of this cell after warp
          const centerDisp = calculateDisplacement(
            baseX + stepX / 2,
            baseY + stepY / 2,
            warp
          );
          const warpedCenterX = baseX + stepX / 2 + centerDisp.dx;
          const warpedCenterY = baseY + stepY / 2 + centerDisp.dy;
          
          const dx = point.x - warpedCenterX;
          const dy = point.y - warpedCenterY;
          const dist = dx * dx + dy * dy;
          
          if (dist < minDist) {
            minDist = dist;
            bestCol = col;
            bestRow = row;
          }
        }
      }
      
      // Now create the warped cell vertices
      const cellX = bestCol * stepX;
      const cellY = bestRow * stepY;

      const baseVertices = [
        { x: cellX, y: cellY },
        { x: cellX + stepX, y: cellY },
        { x: cellX + stepX, y: cellY + stepY },
        { x: cellX, y: cellY + stepY },
      ];

      const segments = Math.max(8, Math.ceil(Math.max(stepX, stepY) / 10));
      const warpedPoints: Point[] = [];

      const pushWarpedPoint = (x: number, y: number) => {
        const displacement = calculateDisplacement(x, y, warp);
        warpedPoints.push({ x: x + displacement.dx, y: y + displacement.dy });
      };

      const sampleEdge = (start: Point, end: Point, includeStart: boolean) => {
        for (let i = includeStart ? 0 : 1; i <= segments; i++) {
          const t = i / segments;
          const x = start.x + (end.x - start.x) * t;
          const y = start.y + (end.y - start.y) * t;
          pushWarpedPoint(x, y);
        }
      };

      sampleEdge(baseVertices[0], baseVertices[1], true); // top edge
      sampleEdge(baseVertices[1], baseVertices[2], false); // right edge
      sampleEdge(baseVertices[2], baseVertices[3], false); // bottom edge
      sampleEdge(baseVertices[3], baseVertices[0], false); // left edge

      return warpedPoints;
    }
    
    default: {
      // Fallback to square
      const cellX = Math.floor(point.x / spacing) * spacing;
      const cellY = Math.floor(point.y / spacing) * spacing;

      return [
        { x: cellX, y: cellY },
        { x: cellX + spacing, y: cellY },
        { x: cellX + spacing, y: cellY + spacing },
        { x: cellX, y: cellY + spacing },
      ];
    }
  }
}

/**
 * Calculate displacement for parametric grid (copied from grid slice)
 */
function calculateDisplacement(
  x: number,
  y: number,
  warp: NonNullable<CanvasStore['grid']>['parametricWarp']
): { dx: number; dy: number } {
  if (!warp) return { dx: 0, dy: 0 };

  switch (warp.kind) {
    case 'sine2d': {
      const phaseX = warp.phaseX ?? 0;
      const phaseY = warp.phaseY ?? 0;
      const dx = warp.ampX * Math.sin((2 * Math.PI * warp.freqX * x) / 1024 + phaseX) *
                 Math.cos((2 * Math.PI * warp.freqY * y) / 1024 + phaseY);
      const dy = warp.ampY * Math.cos((2 * Math.PI * warp.freqX * x) / 1024 + phaseX) *
                 Math.sin((2 * Math.PI * warp.freqY * y) / 1024 + phaseY);
      return { dx, dy };
    }

    case 'radial': {
      const cx = warp.centerX ?? 0;
      const cy = warp.centerY ?? 0;
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const swirlTurns = warp.swirlTurns ?? 0;
      const maxR = 500;
      const swirlAngle = angle + (2 * Math.PI * swirlTurns * (r / maxR));

      const windowFactor = 0.5 * (1 - Math.cos(Math.PI * Math.min(r / maxR, 1)));
      const magnitude = windowFactor * warp.ampX;

      return {
        dx: magnitude * Math.cos(swirlAngle),
        dy: magnitude * Math.sin(swirlAngle),
      };
    }

    case 'perlin2d': {
      const seed = warp.seed ?? 0;
      const s1 = Math.sin(x * 0.01 + seed) * Math.cos(y * 0.01 + seed);
      const s2 = Math.sin(x * 0.02 + seed * 1.3) * Math.cos(y * 0.015 + seed * 1.7);
      const s3 = Math.sin(x * 0.007 + seed * 2.1) * Math.cos(y * 0.009 + seed * 2.3);

      const noiseX = (s1 + 0.5 * s2 + 0.25 * s3) / 1.75;
      const noiseY = (s2 + 0.5 * s3 + 0.25 * s1) / 1.75;

      return {
        dx: warp.ampX * noiseX * warp.freqX / 3,
        dy: warp.ampY * noiseY * warp.freqY / 3,
      };
    }

    default:
      return { dx: 0, dy: 0 };
  }
}

/**
 * Create a path element from vertices
 */
function createPathFromVertices(vertices: Point[], getState: () => CanvasStore): string {
  const state = getState();

  // Build SVG path string
  if (vertices.length === 0) return '';
  
  let pathDataString = `M ${vertices[0].x} ${vertices[0].y}`;
  
  for (let i = 1; i < vertices.length; i++) {
    pathDataString += ` L ${vertices[i].x} ${vertices[i].y}`;
  }
  
  pathDataString += ' Z'; // Close path
  
  // Parse the path string into commands and subpaths
  const commands = parsePathD(pathDataString);
  const subPathsData = extractSubpaths(commands);
  const subPaths = subPathsData.map(sp => sp.commands);
  
  // Get fill color from Editor (pencil state) or use default
  const pencilState = state.pencil;
  let fillColor = '#4299e1'; // Default blue
  let fillOpacity = 0.5; // Default opacity
  
  // Get fill opacity from selected path (same logic as EditorPanel)
  const selectedIds = state.selectedIds;
  let selectedPathFillOpacity = pencilState?.fillOpacity ?? 1; // fallback
  
  if (selectedIds.length > 0) {
    const pathElements = state.elements.filter(
      el => selectedIds.includes(el.id) && el.type === 'path'
    );
    
    if (pathElements.length > 0) {
      selectedPathFillOpacity = (pathElements[0].data as any).fillOpacity ?? selectedPathFillOpacity;
    }
  }
  
  // Ensure minimum 10% opacity
  fillOpacity = Math.max(0.1, selectedPathFillOpacity);
  
  // If pencil has a fill configured (not 'none'), use it
  if (pencilState && pencilState.fillColor && pencilState.fillColor !== 'none') {
    fillColor = pencilState.fillColor;
    // fillOpacity is already set above from selected path
  }
  
  // Add the element to canvas
  const elementId = state.addElement({
    type: 'path',
    data: {
      subPaths,
      strokeWidth: 0, // No stroke
      strokeColor: 'none',
      strokeOpacity: 0,
      fillColor: fillColor,
      fillOpacity: fillOpacity,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      fillRule: 'nonzero',
      strokeDasharray: 'none',
    },
  });

  return elementId;
}

/**
 * Main action: Fill a grid cell at the clicked point
 */
export function fillGridCell(point: Point, getState: () => CanvasStore): string | null {
  const state = getState() as CanvasStore;
  const grid = state.grid;

  if (!grid || !grid.enabled) {
    console.warn('Grid is not enabled');
    return null;
  }

  const spacing = grid.spacing;
  const gridType = grid.type;

  // Get the vertices for this cell
  const vertices = getGridCellVertices(point, gridType, spacing, state);

  if (vertices.length < 3) {
    console.warn('Not enough vertices to create a shape');
    return null;
  }

  // Create the path
  const elementId = createPathFromVertices(vertices, getState);

  return elementId;
}

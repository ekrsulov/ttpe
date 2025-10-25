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

  const pointInTriangle = (p: Point, a: Point, b: Point, c: Point): boolean => {
    const v0 = { x: c.x - a.x, y: c.y - a.y };
    const v1 = { x: b.x - a.x, y: b.y - a.y };
    const v2 = { x: p.x - a.x, y: p.y - a.y };

    const dot00 = v0.x * v0.x + v0.y * v0.y;
    const dot01 = v0.x * v1.x + v0.y * v1.y;
    const dot02 = v0.x * v2.x + v0.y * v2.y;
    const dot11 = v1.x * v1.x + v1.y * v1.y;
    const dot12 = v1.x * v2.x + v1.y * v2.y;

    const denom = dot00 * dot11 - dot01 * dot01;
    if (Math.abs(denom) < 1e-9) {
      return false;
    }

    const invDenom = 1 / denom;
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    const epsilon = 1e-6;
    return u >= -epsilon && v >= -epsilon && u + v <= 1 + epsilon;
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
      const spacing60 = spacing * tan30 / cos30;

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

      const intersection60 = (x: number, constant: number) => tan30 * x + constant;
      const intersection120 = (x: number, constant: number) => -tan30 * x + constant;

      return [
        { x: xLeft, y: intersection120(xLeft, c120Low) },
        { x: xLeft, y: intersection60(xLeft, c60High) },
        { x: xRight, y: intersection120(xRight, c120High) },
        { x: xRight, y: intersection60(xRight, c60Low) },
      ];
    }

    case 'triangular': {
      const height = spacing * Math.sqrt(3) / 2;
      const tan60 = Math.sqrt(3);
      const spacing60 = spacing * tan60;

      const row = Math.floor(point.y / height);
      const yLow = row * height;
      const yHigh = (row + 1) * height;

      const c60 = point.y - tan60 * point.x;
      const index60 = Math.floor(c60 / spacing60);
      const c60Low = index60 * spacing60;
      const c60High = (index60 + 1) * spacing60;

      const c120 = point.y + tan60 * point.x;
      const index120 = Math.floor(c120 / spacing60);
      const c120Low = index120 * spacing60;
      const c120High = (index120 + 1) * spacing60;

      const intersect60 = (yValue: number, constant: number) => ({
        x: (yValue - constant) / tan60,
        y: yValue,
      });

      const intersect120 = (yValue: number, constant: number) => ({
        x: (constant - yValue) / tan60,
        y: yValue,
      });

      const intersectSlopes = (constantA: number, constantB: number) => {
        const x = (constantB - constantA) / (2 * tan60);
        const y = tan60 * x + constantA;
        return { x, y };
      };

      const upward = [
        intersect60(yLow, c60High),
        intersect120(yLow, c120High),
        intersectSlopes(c60High, c120High),
      ];

      if (pointInTriangle(point, upward[0], upward[1], upward[2])) {
        return upward;
      }

      const downward = [
        intersect60(yHigh, c60Low),
        intersect120(yHigh, c120Low),
        intersectSlopes(c60Low, c120Low),
      ];

      if (pointInTriangle(point, downward[0], downward[1], downward[2])) {
        return downward;
      }

      // Fallback to upward triangle if numerical issues prevent containment detection
      return upward;
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

      // Apply warp to vertices
      return baseVertices.map(v => {
        const displacement = calculateDisplacement(v.x, v.y, warp);
        return {
          x: v.x + displacement.dx,
          y: v.y + displacement.dy,
        };
      });
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
  const state = getState() as CanvasStore & { gridFill?: { 
    fillColor: string;
    fillOpacity: number;
  }};
  const gridFill = state.gridFill;
  
  if (!gridFill) {
    console.error('GridFill state not found');
    return '';
  }

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
  
  // Get fill color from Editor (pencil state) or use gridFill default
  const pencilState = (state as any).pencil;
  let fillColor = gridFill.fillColor; // Default blue
  let fillOpacity = gridFill.fillOpacity;
  
  // If pencil has a fill configured (not 'none'), use it
  if (pencilState && pencilState.fillColor && pencilState.fillColor !== 'none') {
    fillColor = pencilState.fillColor;
    fillOpacity = pencilState.fillOpacity ?? fillOpacity;
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

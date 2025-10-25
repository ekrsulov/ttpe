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
      // Isometric uses a skewed coordinate system
      // The grid is made of rhombi that tile the plane
      const tan30 = Math.tan(Math.PI / 6);
      const sin30 = Math.sin(Math.PI / 6);
      const cos30 = Math.cos(Math.PI / 6);
      
      // Rhombus side length in the grid
      const side = spacing / cos30;
      
      // Transform point to isometric coordinates (u, v)
      // where u is along vertical axis, v is along 60° axis
      const u = point.x / spacing;
      const v = (point.y - tan30 * point.x) / (side * sin30);
      
      // Find the rhombus cell
      const iu = Math.floor(u);
      const iv = Math.floor(v);
      
      // Get the 4 corners of the rhombus in world space
      // Corner at (iu, iv)
      const x0 = iu * spacing;
      const y0 = iv * side * sin30 + tan30 * x0;
      
      // Corner at (iu+1, iv)  
      const x1 = (iu + 1) * spacing;
      const y1 = iv * side * sin30 + tan30 * x1;
      
      // Corner at (iu+1, iv+1)
      const x2 = (iu + 1) * spacing;
      const y2 = (iv + 1) * side * sin30 + tan30 * x2;
      
      // Corner at (iu, iv+1)
      const x3 = iu * spacing;
      const y3 = (iv + 1) * side * sin30 + tan30 * x3;
      
      return [
        { x: x0, y: y0 },
        { x: x1, y: y1 },
        { x: x2, y: y2 },
        { x: x3, y: y3 },
      ];
    }
    
    case 'triangular': {
      // Triangular grid: each row alternates between up and down triangles
      const height = spacing * Math.sqrt(3) / 2;
      
      // Find which row
      const row = Math.floor(point.y / height);
      const localY = point.y - row * height;
      
      // Find which column (each triangle has width = spacing)
      const col = Math.floor(point.x / spacing);
      const localX = point.x - col * spacing;
      
      // Determine if we're in an upward or downward triangle
      // based on the local position within the cell
      const slope = height / (spacing / 2);
      
      // Check if point is above or below the diagonal lines
      const leftLine = slope * localX; // y = slope * x (rises from left)
      const rightLine = height - slope * (localX - spacing / 2); // y = height - slope * (x - spacing/2) (falls from right)
      
      const isUpward = localY < Math.min(leftLine, rightLine);
      
      if (isUpward) {
        // Upward pointing triangle
        const yTop = row * height;
        const yBottom = (row + 1) * height;
        const xLeft = col * spacing;
        const xRight = (col + 1) * spacing;
        const xPeak = (col + 0.5) * spacing;
        
        return [
          { x: xLeft, y: yBottom },
          { x: xRight, y: yBottom },
          { x: xPeak, y: yTop },
        ];
      } else {
        // Downward pointing triangle
        const yTop = row * height;
        const yBottom = (row + 1) * height;
        const xLeft = col * spacing;
        const xRight = (col + 1) * spacing;
        const xPeak = (col + 0.5) * spacing;
        
        return [
          { x: xLeft, y: yTop },
          { x: xRight, y: yTop },
          { x: xPeak, y: yBottom },
        ];
      }
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
      if (!grid?.parametricWarp) {
        // No warp, use base square
        const cellX = Math.floor(point.x / spacing) * spacing;
        const cellY = Math.floor(point.y / spacing) * spacing;
        return [
          { x: cellX, y: cellY },
          { x: cellX + spacing, y: cellY },
          { x: cellX + spacing, y: cellY + spacing },
          { x: cellX, y: cellY + spacing },
        ];
      }
      
      const warp = grid.parametricWarp;
      
      // To find which cell contains the point, we need to search nearby cells
      // Start with the approximate cell based on point coordinates
      const approxCol = Math.floor(point.x / spacing);
      const approxRow = Math.floor(point.y / spacing);
      
      // Check this cell and surrounding cells (3x3 grid)
      let bestCol = approxCol;
      let bestRow = approxRow;
      let minDist = Infinity;
      
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const row = approxRow + dr;
          const col = approxCol + dc;
          const baseX = col * spacing;
          const baseY = row * spacing;
          
          // Calculate center of this cell after warp
          const centerDisp = calculateDisplacement(
            baseX + spacing / 2,
            baseY + spacing / 2,
            warp
          );
          const warpedCenterX = baseX + spacing / 2 + centerDisp.dx;
          const warpedCenterY = baseY + spacing / 2 + centerDisp.dy;
          
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
      const cellX = bestCol * spacing;
      const cellY = bestRow * spacing;
      
      const baseVertices = [
        { x: cellX, y: cellY },
        { x: cellX + spacing, y: cellY },
        { x: cellX + spacing, y: cellY + spacing },
        { x: cellX, y: cellY + spacing },
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
    
    default:
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

/**
 * Calculate displacement for parametric grid (copied from grid slice)
 */
function calculateDisplacement(x: number, y: number, warp: NonNullable<CanvasStore['grid']>['parametricWarp']): { dx: number; dy: number } {
  if (!warp) return { dx: 0, dy: 0 };

  const { kind, ampX, ampY } = warp;

  if (kind === 'sine2d') {
    const { freqX, freqY, phaseX = 0, phaseY = 0 } = warp;
    const dx = ampX * Math.sin(2 * Math.PI * freqX * x / 1024 + phaseX) * Math.cos(2 * Math.PI * freqY * y / 1024);
    const dy = ampY * Math.cos(2 * Math.PI * freqX * x / 1024) * Math.sin(2 * Math.PI * freqY * y / 1024 + phaseY);
    return { dx, dy };
  }

  if (kind === 'radial') {
    const { centerX = 0, centerY = 0, swirlTurns = 0 } = warp;
    const rx = x - centerX;
    const ry = y - centerY;
    const r = Math.sqrt(rx * rx + ry * ry);
    const maxR = 512;
    const t = Math.max(0, Math.min(1, r / maxR));
    const hann = 0.5 * (1 - Math.cos(Math.PI * t));
    const amp = Math.sqrt(ampX * ampX + ampY * ampY);
    const radialDisp = amp * hann;

    if (swirlTurns !== 0 && r > 0.01) {
      const theta = Math.atan2(ry, rx);
      const swirlAngle = 2 * Math.PI * swirlTurns * (1 - t);
      const newTheta = theta + swirlAngle;
      const newRx = r * Math.cos(newTheta);
      const newRy = r * Math.sin(newTheta);
      return {
        dx: newRx - rx + radialDisp * (rx / r),
        dy: newRy - ry + radialDisp * (ry / r),
      };
    }

    return r > 0.01 ? { dx: radialDisp * (rx / r), dy: radialDisp * (ry / r) } : { dx: 0, dy: 0 };
  }

  if (kind === 'perlin2d') {
    const { freqX, freqY, seed = 0 } = warp;
    const octaves = 3;
    let dx = 0;
    let dy = 0;
    let amplitude = 1.0;
    let frequency = 1.0;

    for (let oct = 0; oct < octaves; oct++) {
      const fx = freqX * frequency;
      const fy = freqY * frequency;
      const offsetX = oct * 100 + seed;
      const offsetY = oct * 200 + seed;

      dx += amplitude * Math.sin(2 * Math.PI * fx * (x + offsetX) / 1024) * Math.cos(2 * Math.PI * fy * (y + offsetY) / 1024);
      dy += amplitude * Math.cos(2 * Math.PI * fx * (x + offsetX) / 1024) * Math.sin(2 * Math.PI * fy * (y + offsetY) / 1024);

      amplitude *= 0.5;
      frequency *= 2.0;
    }

    return { dx: ampX * dx, dy: ampY * dy };
  }

  return { dx: 0, dy: 0 };
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

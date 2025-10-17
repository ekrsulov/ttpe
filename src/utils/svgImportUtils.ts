/**
 * SVG Import Utilities
 * Handles importing SVG files and converting them to internal path format
 * Supports path, rect, circle, ellipse, polygon, polyline, and line elements
 * Handles groups, transformations, and normalizes all paths to M, L, C, Z commands
 */

import { parsePath, absolutize, normalize } from 'path-data-parser';
import { parsePathD } from './pathParserUtils';
import type { Command, PathData, SubPath } from '../types';

export interface ImportedPathElement {
  type: 'path';
  data: PathData;
}

export interface ImportedGroupElement {
  type: 'group';
  name?: string;
  children: ImportedElement[];
}

export type ImportedElement = ImportedPathElement | ImportedGroupElement;

/**
 * Matrix for SVG transformations
 */
interface Matrix {
  a: number; // scaleX
  b: number; // skewY
  c: number; // skewX
  d: number; // scaleY
  e: number; // translateX
  f: number; // translateY
}

/**
 * Parse SVG transform attribute into a matrix
 */
function parseTransform(transformStr: string): Matrix {
  const matrix: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  
  if (!transformStr) return matrix;

  // Match transform functions
  const transforms = transformStr.match(/(\w+)\s*\(([^)]+)\)/g);
  if (!transforms) return matrix;

  transforms.forEach(transform => {
    const match = transform.match(/(\w+)\s*\(([^)]+)\)/);
    if (!match) return;

    const [, type, argsStr] = match;
    const args = argsStr.split(/[\s,]+/).map(parseFloat);

    switch (type) {
      case 'matrix': {
        const [a, b, c, d, e, f] = args;
        multiplyMatrices(matrix, { a, b, c, d, e, f });
        break;
      }
      case 'translate': {
        const tx = args[0] || 0;
        const ty = args[1] || 0;
        multiplyMatrices(matrix, { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty });
        break;
      }
      case 'scale': {
        const sx = args[0] || 1;
        const sy = args[1] !== undefined ? args[1] : sx;
        multiplyMatrices(matrix, { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 });
        break;
      }
      case 'rotate': {
        const angle = (args[0] || 0) * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        if (args.length > 1) {
          // Rotate around a point
          const cx = args[1];
          const cy = args[2];
          multiplyMatrices(matrix, { a: 1, b: 0, c: 0, d: 1, e: cx, f: cy });
          multiplyMatrices(matrix, { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 });
          multiplyMatrices(matrix, { a: 1, b: 0, c: 0, d: 1, e: -cx, f: -cy });
        } else {
          multiplyMatrices(matrix, { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 });
        }
        break;
      }
      case 'skewX': {
        const angle = (args[0] || 0) * Math.PI / 180;
        const tan = Math.tan(angle);
        multiplyMatrices(matrix, { a: 1, b: 0, c: tan, d: 1, e: 0, f: 0 });
        break;
      }
      case 'skewY': {
        const angle = (args[0] || 0) * Math.PI / 180;
        const tan = Math.tan(angle);
        multiplyMatrices(matrix, { a: 1, b: tan, c: 0, d: 1, e: 0, f: 0 });
        break;
      }
    }
  });

  return matrix;
}

/**
 * Multiply two transformation matrices
 */
function multiplyMatrices(m1: Matrix, m2: Matrix): void {
  const result = {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f
  };
  Object.assign(m1, result);
}

/**
 * Apply transformation matrix to a path
 */
function transformPath(pathData: string, matrix: Matrix): string {
  if (matrix.a === 1 && matrix.b === 0 && matrix.c === 0 && 
      matrix.d === 1 && matrix.e === 0 && matrix.f === 0) {
    return pathData; // Identity matrix, no transformation needed
  }

  const commands = parsePath(pathData);
  const transformedCommands = commands.map(cmd => {
    const data = [...cmd.data];
    
    // Transform coordinates based on command type
    // For path-data-parser, coordinates are in the data array
    const key = cmd.key;
    
    if (key === 'M' || key === 'L' || key === 'T') {
      // x, y at positions 0, 1
      const x = data[0];
      const y = data[1];
      data[0] = matrix.a * x + matrix.c * y + matrix.e;
      data[1] = matrix.b * x + matrix.d * y + matrix.f;
    } else if (key === 'C') {
      // x1, y1, x2, y2, x, y at positions 0-5
      for (let i = 0; i < 6; i += 2) {
        const x = data[i];
        const y = data[i + 1];
        data[i] = matrix.a * x + matrix.c * y + matrix.e;
        data[i + 1] = matrix.b * x + matrix.d * y + matrix.f;
      }
    } else if (key === 'S' || key === 'Q') {
      // x1, y1, x, y at positions 0-3
      for (let i = 0; i < 4; i += 2) {
        const x = data[i];
        const y = data[i + 1];
        data[i] = matrix.a * x + matrix.c * y + matrix.e;
        data[i + 1] = matrix.b * x + matrix.d * y + matrix.f;
      }
    } else if (key === 'A') {
      // rx, ry, rotation, large-arc, sweep, x, y
      // Transform only the end point (x, y at positions 5, 6)
      const x = data[5];
      const y = data[6];
      data[5] = matrix.a * x + matrix.c * y + matrix.e;
      data[6] = matrix.b * x + matrix.d * y + matrix.f;
      // Note: Full arc transformation would require converting to curves
    }
    
    return { key, data };
  });

  // Serialize back to path string
  return transformedCommands.map(cmd => {
    if (cmd.key === 'Z') {
      return 'Z';
    }
    return `${cmd.key} ${cmd.data.join(' ')}`;
  }).join(' ');
}

/**
 * Convert basic shapes to path data
 */
function shapeToPath(element: Element): string | null {
  const tagName = element.tagName.toLowerCase();

  switch (tagName) {
    case 'rect': {
      const x = parseFloat(element.getAttribute('x') || '0');
      const y = parseFloat(element.getAttribute('y') || '0');
      const width = parseFloat(element.getAttribute('width') || '0');
      const height = parseFloat(element.getAttribute('height') || '0');
      const rx = parseFloat(element.getAttribute('rx') || '0');
      const ry = parseFloat(element.getAttribute('ry') || element.getAttribute('rx') || '0');

      if (rx > 0 || ry > 0) {
        // Rounded rectangle
        const rxClamped = Math.min(rx, width / 2);
        const ryClamped = Math.min(ry, height / 2);
        
        return `M ${x + rxClamped} ${y} ` +
               `L ${x + width - rxClamped} ${y} ` +
               `Q ${x + width} ${y} ${x + width} ${y + ryClamped} ` +
               `L ${x + width} ${y + height - ryClamped} ` +
               `Q ${x + width} ${y + height} ${x + width - rxClamped} ${y + height} ` +
               `L ${x + rxClamped} ${y + height} ` +
               `Q ${x} ${y + height} ${x} ${y + height - ryClamped} ` +
               `L ${x} ${y + ryClamped} ` +
               `Q ${x} ${y} ${x + rxClamped} ${y} Z`;
      } else {
        // Regular rectangle
        return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
      }
    }

    case 'circle': {
      const cx = parseFloat(element.getAttribute('cx') || '0');
      const cy = parseFloat(element.getAttribute('cy') || '0');
      const r = parseFloat(element.getAttribute('r') || '0');
      
      // Use cubic bezier to approximate circle
      const k = 0.5522847498; // 4/3 * tan(π/8)
      const kr = k * r;
      
      return `M ${cx} ${cy - r} ` +
             `C ${cx + kr} ${cy - r} ${cx + r} ${cy - kr} ${cx + r} ${cy} ` +
             `C ${cx + r} ${cy + kr} ${cx + kr} ${cy + r} ${cx} ${cy + r} ` +
             `C ${cx - kr} ${cy + r} ${cx - r} ${cy + kr} ${cx - r} ${cy} ` +
             `C ${cx - r} ${cy - kr} ${cx - kr} ${cy - r} ${cx} ${cy - r} Z`;
    }

    case 'ellipse': {
      const cx = parseFloat(element.getAttribute('cx') || '0');
      const cy = parseFloat(element.getAttribute('cy') || '0');
      const rx = parseFloat(element.getAttribute('rx') || '0');
      const ry = parseFloat(element.getAttribute('ry') || '0');
      
      const k = 0.5522847498;
      const krx = k * rx;
      const kry = k * ry;
      
      return `M ${cx} ${cy - ry} ` +
             `C ${cx + krx} ${cy - ry} ${cx + rx} ${cy - kry} ${cx + rx} ${cy} ` +
             `C ${cx + rx} ${cy + kry} ${cx + krx} ${cy + ry} ${cx} ${cy + ry} ` +
             `C ${cx - krx} ${cy + ry} ${cx - rx} ${cy + kry} ${cx - rx} ${cy} ` +
             `C ${cx - rx} ${cy - kry} ${cx - krx} ${cy - ry} ${cx} ${cy - ry} Z`;
    }

    case 'line': {
      const x1 = parseFloat(element.getAttribute('x1') || '0');
      const y1 = parseFloat(element.getAttribute('y1') || '0');
      const x2 = parseFloat(element.getAttribute('x2') || '0');
      const y2 = parseFloat(element.getAttribute('y2') || '0');
      
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }

    case 'polyline':
    case 'polygon': {
      const points = element.getAttribute('points');
      if (!points) return null;
      
      const coords = points.trim().split(/[\s,]+/).map(parseFloat);
      if (coords.length < 2) return null;
      
      let path = `M ${coords[0]} ${coords[1]}`;
      for (let i = 2; i < coords.length; i += 2) {
        path += ` L ${coords[i]} ${coords[i + 1]}`;
      }
      
      if (tagName === 'polygon') {
        path += ' Z';
      }
      
      return path;
    }

    default:
      return null;
  }
}

/**
 * Extract presentation attributes from an element
 */
function extractStyleAttributes(element: Element): Partial<PathData> {
  const style: Partial<PathData> = {};

  // Helper to get attribute or style property
  const getAttr = (name: string): string | null => {
    return element.getAttribute(name) || null;
  };

  // Parse style attribute if present
  const styleAttr = element.getAttribute('style');
  const styleProps: Record<string, string> = {};
  if (styleAttr) {
    styleAttr.split(';').forEach(prop => {
      const [key, value] = prop.split(':').map(s => s.trim());
      if (key && value) {
        styleProps[key] = value;
      }
    });
  }

  // Get value from attribute or style
  const getValue = (attrName: string, styleName?: string): string | null => {
    return styleProps[styleName || attrName] || getAttr(attrName);
  };

  // Stroke
  const stroke = getValue('stroke');
  if (stroke && stroke !== 'none') {
    style.strokeColor = stroke;
  } else if (stroke === 'none') {
    style.strokeColor = 'none';
  }

  // Stroke width
  const strokeWidth = getValue('stroke-width', 'stroke-width');
  if (strokeWidth) {
    style.strokeWidth = parseFloat(strokeWidth);
  }

  // Stroke opacity
  const strokeOpacity = getValue('stroke-opacity', 'stroke-opacity');
  if (strokeOpacity) {
    style.strokeOpacity = parseFloat(strokeOpacity);
  }

  // Fill
  const fill = getValue('fill');
  if (fill && fill !== 'none') {
    style.fillColor = fill;
  } else if (fill === 'none') {
    style.fillColor = 'none';
  }

  // Fill opacity
  const fillOpacity = getValue('fill-opacity', 'fill-opacity');
  if (fillOpacity) {
    style.fillOpacity = parseFloat(fillOpacity);
  }

  // Stroke linecap
  const strokeLinecap = getValue('stroke-linecap', 'stroke-linecap');
  if (strokeLinecap && (strokeLinecap === 'butt' || strokeLinecap === 'round' || strokeLinecap === 'square')) {
    style.strokeLinecap = strokeLinecap as 'butt' | 'round' | 'square';
  }

  // Stroke linejoin
  const strokeLinejoin = getValue('stroke-linejoin', 'stroke-linejoin');
  if (strokeLinejoin && (strokeLinejoin === 'miter' || strokeLinejoin === 'round' || strokeLinejoin === 'bevel')) {
    style.strokeLinejoin = strokeLinejoin as 'miter' | 'round' | 'bevel';
  }

  // Fill rule
  const fillRule = getValue('fill-rule', 'fill-rule');
  if (fillRule && (fillRule === 'nonzero' || fillRule === 'evenodd')) {
    style.fillRule = fillRule as 'nonzero' | 'evenodd';
  }

  // Stroke dasharray
  const strokeDasharray = getValue('stroke-dasharray', 'stroke-dasharray');
  if (strokeDasharray && strokeDasharray !== 'none') {
    style.strokeDasharray = strokeDasharray;
  }

  return style;
}

/**
 * Normalize path data to use only M, L, C, Z commands
 */
function normalizeToMLCZ(pathData: string): string {
  try {
    // Use path-data-parser to parse, absolutize, and normalize
    const parsed = parsePath(pathData);
    const absolute = absolutize(parsed);
    const normalized = normalize(absolute);
    
    // Convert to string with only M, L, C, Z
    const result: string[] = [];
    
    normalized.forEach(cmd => {
      const type = cmd.key;
      
      switch (type) {
        case 'M':
          // data: [x, y]
          result.push(`M ${cmd.data[0]} ${cmd.data[1]}`);
          break;
        case 'L':
          // data: [x, y]
          result.push(`L ${cmd.data[0]} ${cmd.data[1]}`);
          break;
        case 'C':
          // data: [x1, y1, x2, y2, x, y]
          result.push(`C ${cmd.data[0]} ${cmd.data[1]} ${cmd.data[2]} ${cmd.data[3]} ${cmd.data[4]} ${cmd.data[5]}`);
          break;
        case 'Z':
          result.push('Z');
          break;
        default:
          // Other commands should have been normalized by path-data-parser
          console.warn(`Unexpected command type after normalization: ${type}`);
      }
    });
    
    return result.join(' ');
  } catch (error) {
    console.error('Error normalizing path:', error);
    return pathData; // Return original if normalization fails
  }
}

/**
 * Process an SVG element and extract path data
 */
function processElement(element: Element, parentTransform: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }): ImportedElement[] {
  const results: ImportedElement[] = [];
  
  // Get element's own transform
  const transformAttr = element.getAttribute('transform');
  const elementTransform = parseTransform(transformAttr || '');
  
  // Combine with parent transform
  const combinedTransform: Matrix = { ...parentTransform };
  multiplyMatrices(combinedTransform, elementTransform);
  
  const tagName = element.tagName.toLowerCase();
  
  // Handle groups - recursively process children
  if (tagName === 'g') {
    const groupChildren: ImportedElement[] = [];
    Array.from(element.children).forEach(child => {
      groupChildren.push(...processElement(child, combinedTransform));
    });

    if (groupChildren.length === 0) {
      return results;
    }

    const groupNameAttr = element.getAttribute('id') ||
      element.getAttribute('data-name') ||
      element.getAttribute('inkscape:label') ||
      element.getAttribute('sodipodi:label') ||
      undefined;

    results.push({
      type: 'group',
      name: groupNameAttr || undefined,
      children: groupChildren,
    });

    return results;
  }
  
  // Get path data
  let pathData: string | null = null;
  
  if (tagName === 'path') {
    pathData = element.getAttribute('d');
  } else {
    pathData = shapeToPath(element);
  }
  
  if (!pathData) return results;
  
  // Apply transformations
  const transformedPath = transformPath(pathData, combinedTransform);
  
  // Normalize to M, L, C, Z
  const normalizedPath = normalizeToMLCZ(transformedPath);
  
  // Parse into our internal format
  const commands = parsePathD(normalizedPath);
  
  // Extract style attributes
  const styleAttrs = extractStyleAttributes(element);
  
  // Group commands into subpaths (split by M commands)
  const subPaths: SubPath[] = [];
  let currentSubPath: Command[] = [];
  
  commands.forEach(cmd => {
    if (cmd.type === 'M') {
      if (currentSubPath.length > 0) {
        subPaths.push(currentSubPath);
      }
      currentSubPath = [cmd];
    } else {
      currentSubPath.push(cmd);
    }
  });
  
  if (currentSubPath.length > 0) {
    subPaths.push(currentSubPath);
  }
  
  if (subPaths.length === 0) return results;
  
  // Create PathData object with defaults
  const pathDataObj: PathData = {
    subPaths,
    strokeWidth: styleAttrs.strokeWidth ?? 1,
    strokeColor: styleAttrs.strokeColor ?? '#000000',
    strokeOpacity: styleAttrs.strokeOpacity ?? 1,
    fillColor: styleAttrs.fillColor ?? 'none',
    fillOpacity: styleAttrs.fillOpacity ?? 1,
    strokeLinecap: styleAttrs.strokeLinecap,
    strokeLinejoin: styleAttrs.strokeLinejoin,
    fillRule: styleAttrs.fillRule,
    strokeDasharray: styleAttrs.strokeDasharray,
  };
  
  results.push({
    type: 'path',
    data: pathDataObj,
  });

  return results;
}

/**
 * SVG dimensions extracted from width, height, and viewBox attributes
 */
export interface SVGDimensions {
  width: number;
  height: number;
  viewBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Import result containing both dimensions and path data
 */
export interface SVGImportResult {
  dimensions: SVGDimensions;
  paths: PathData[];
  elements: ImportedElement[];
}

/**
 * Import SVG file and return both dimensions and PathData array
 */
export async function importSVGWithDimensions(file: File): Promise<SVGImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const svgContent = e.target?.result as string;
        
        // Parse SVG
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, 'image/svg+xml');
        
        // Check for parsing errors
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
          reject(new Error('Invalid SVG file'));
          return;
        }
        
        const svgElement = doc.querySelector('svg');
        if (!svgElement) {
          reject(new Error('No SVG element found'));
          return;
        }
        
        // Extract dimensions
        const dimensions = extractSVGDimensions(svgElement);
        
        // Process all elements
        const elements: ImportedElement[] = [];
        Array.from(svgElement.children).forEach(child => {
          elements.push(...processElement(child));
        });

        const paths = flattenImportedElements(elements);

        if (paths.length === 0) {
          reject(new Error('No valid paths found in SVG'));
          return;
        }

        resolve({ dimensions, paths, elements });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

export function flattenImportedElements(elements: ImportedElement[]): PathData[] {
  const paths: PathData[] = [];

  elements.forEach(element => {
    if (element.type === 'path') {
      paths.push(element.data);
    } else {
      paths.push(...flattenImportedElements(element.children));
    }
  });

  return paths;
}

/**
 * Extract dimensions from SVG element
 */
function extractSVGDimensions(svgElement: Element): SVGDimensions {
  const width = parseFloat(svgElement.getAttribute('width') || '0');
  const height = parseFloat(svgElement.getAttribute('height') || '0');
  
  let viewBox: SVGDimensions['viewBox'] | undefined;
  const viewBoxAttr = svgElement.getAttribute('viewBox');
  if (viewBoxAttr) {
    const parts = viewBoxAttr.split(/\s+/).map(parseFloat);
    if (parts.length === 4) {
      viewBox = {
        x: parts[0],
        y: parts[1],
        width: parts[2],
        height: parts[3]
      };
    }
  }
  
  return {
    width: width || (viewBox ? viewBox.width : 0),
    height: height || (viewBox ? viewBox.height : 0),
    viewBox
  };
}

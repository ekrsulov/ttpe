// Text vectorization utilities for converting text to SVG paths using esm-potrace-wasm
import { potrace, init } from 'esm-potrace-wasm';
import { parsePath, serialize, absolutize, normalize } from 'path-data-parser';
import { PATH_DECIMAL_PRECISION, formatToPrecision } from './index';

// Cache for text vectorization to improve performance
const textVectorizationCache = new Map<string, string>();

// Initialize potrace once
let potraceInitialized = false;
const initPotrace = async () => {
  if (!potraceInitialized) {
    await init();
    potraceInitialized = true;
  }
};

// Utility function to round coordinates to configurable decimal places
const roundToPrecision = (num: number): number => {
  return formatToPrecision(num, PATH_DECIMAL_PRECISION);
};

// Function to convert text to SVG path using esm-potrace-wasm
export const textToPath = async (
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string = 'normal',
  fontStyle: string = 'normal'
): Promise<string> => {
  const cacheKey = `text2path-${text}-${x}-${y}-${fontSize}-${fontFamily}-${fontWeight}-${fontStyle}`;

  // Check cache first
  if (textVectorizationCache.has(cacheKey)) {
    return textVectorizationCache.get(cacheKey)!;
  }

  // Initialize potrace if not already done
  await initPotrace();

  // Create canvas for rendering text
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  // Set font for measurement
  const font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.font = font;
  
  // Measure text to determine canvas size
  const textMetrics = ctx.measureText(text);
  const textWidth = Math.ceil(textMetrics.width);
  
  // Use font metrics for more accurate height calculation
  const actualAscent = textMetrics.actualBoundingBoxAscent || fontSize * 0.8;
  const actualDescent = textMetrics.actualBoundingBoxDescent || fontSize * 0.2;
  const textHeight = Math.ceil(actualAscent + actualDescent);
  
  // Add padding
  const padding = Math.ceil(fontSize * 0.1);
  const canvasWidth = textWidth + (padding * 2);
  const canvasHeight = textHeight + (padding * 2);
  
  // Set canvas size (no resolution scaling - 1:1)
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  // Set font again after canvas resize
  ctx.font = font;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  
  // Clear canvas with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Draw text in black at the correct baseline position
  // textBaseline = 'alphabetic' means the y coordinate is the alphabetic baseline
  // Position the baseline at a specific distance from the top of the canvas
  ctx.fillStyle = 'black';
  const baselineY = actualAscent + padding; // Position baseline based on actual ascent
  ctx.fillText(text, padding, baselineY);

  try {
    // Use potrace to convert canvas to SVG with pathonly option
    const svgResult = await potrace(canvas, {
      turdsize: 2,
      turnpolicy: 4,
      alphamax: 1,
      opticurve: 1,
      opttolerance: 0.2,
      pathonly: false,  // Set back to false to get full SVG, then extract paths
      extractcolors: false,
    });

    // Extract path data from SVG result and position it correctly
    const pathData = extractPathFromSVGResult(svgResult, x, y, actualAscent, actualDescent);
    
    // Cache the result only if we got valid path data
    if (pathData) {
      textVectorizationCache.set(cacheKey, pathData);
    }
    
    return pathData;
  } catch {
    return '';
  }
};

// Helper function to extract and normalize path data from SVG result
const extractPathFromSVGResult = (
  svgString: string, 
  targetX: number, 
  targetY: number,
  actualAscent: number,
  actualDescent: number
): string => {
  if (!svgString || typeof svgString !== 'string') {
    return '';
  }

  // Parse SVG to extract path data
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
  
  // Check for parsing errors
  const parserError = svgDoc.querySelector('parsererror');
  if (parserError) {
    return '';
  }
  
  // Extract path elements
  const pathElements = svgDoc.querySelectorAll('path');
  
  if (pathElements.length === 0) {
    return '';
  }

  const allNormalizedSegments: Array<Array<{ key: string; data: number[] }>> = [];
  
  // First pass: Process each path element using path-data-parser
  for (const pathElement of pathElements) {
    const pathData = pathElement.getAttribute('d');
    
    if (!pathData) continue;
    
    try {
      // Parse the path string using path-data-parser
      const segments = parsePath(pathData);
      
      // Convert relative commands to absolute
      const absoluteSegments = absolutize(segments);
      
      // Normalize to only M, L, C, Z commands
      const normalizedSegments = normalize(absoluteSegments);
      
      allNormalizedSegments.push(normalizedSegments);
    } catch {
      // Error processing path data
    }
  }
  
  if (allNormalizedSegments.length === 0) {
    return '';
  }
  
  // Calculate global bounds for all paths together
  const globalBounds = calculateGlobalBounds(allNormalizedSegments);
  
  // Transform all paths using the same scale and offset to preserve relative positions
  const allTransformedPaths: string[] = [];
  
  for (const normalizedSegments of allNormalizedSegments) {
    try {
      // Transform coordinates to target position using global bounds
      const transformedSegments = transformSegmentsWithGlobalBounds(
        normalizedSegments,
        targetX,
        targetY,
        globalBounds,
        actualAscent,
        actualDescent
      );
      
      // Serialize back to path string
      const transformedPath = serialize(transformedSegments);
      
      if (transformedPath) {
        allTransformedPaths.push(transformedPath);
      }
    } catch {
      // Error transforming path data
    }
  }
  
  const result = allTransformedPaths.join(' ');
  
  return result;
};

// Calculate global bounds for all paths to preserve relative positions
const calculateGlobalBounds = (allSegments: Array<Array<{ key: string; data: number[] }>>): { minX: number, minY: number, maxX: number, maxY: number, width: number, height: number } => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const segments of allSegments) {
    for (const segment of segments) {
      const { key, data } = segment;
      
      if (key === 'M' || key === 'L') {
        // Move and Line commands have x,y coordinates
        for (let i = 0; i < data.length; i += 2) {
          const x = data[i];
          const y = data[i + 1];
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      } else if (key === 'C') {
        // Curve commands have multiple control points and end point
        for (let i = 0; i < data.length; i += 2) {
          const x = data[i];
          const y = data[i + 1];
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
  }
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
};

// Transform segments using global bounds to preserve relative positions between paths
const transformSegmentsWithGlobalBounds = (
  segments: Array<{ key: string; data: number[] }>,
  targetX: number,
  targetY: number,
  globalBounds: { minX: number, minY: number, maxX: number, maxY: number, width: number, height: number },
  actualAscent: number,
  actualDescent: number
): Array<{ key: string; data: number[] }> => {
  if (!segments || segments.length === 0) {
    return [];
  }

  // Usar las métricas reales del texto para cálculos más precisos
  const realTextHeight = actualAscent + actualDescent;
  
  // Factor de escala basado en la altura real del texto
  const scaleFactor = realTextHeight / globalBounds.height;
  
  // Posicionamiento más preciso usando las métricas reales
  // targetY es la baseline, la esquina superior izquierda está en targetY - actualAscent
  const textTopLeftX = targetX;
  const textTopLeftY = targetY - actualAscent;
  
  // Offset para mover el path a la esquina superior izquierda exacta del texto
  const offsetX = textTopLeftX - (globalBounds.minX * scaleFactor);
  const offsetY = textTopLeftY - (globalBounds.minY * scaleFactor);
  
  // Transform coordinates
  const transformedSegments = segments.map(segment => {
    const { key, data } = segment;
    
    if (key === 'Z') {
      // Close path command has no data
      return { key, data };
    }
    
    const transformedData = [];
    for (let i = 0; i < data.length; i += 2) {
      let x = data[i];
      let y = data[i + 1];
      
      // Aplicar escala y offset
      x = (x * scaleFactor) + offsetX;
      // Restaurar la inversión Y para manejar diferencia de coordenadas Canvas/SVG
      y = offsetY + (globalBounds.maxY - y) * scaleFactor;
      
      transformedData.push(roundToPrecision(x));
      transformedData.push(roundToPrecision(y));
    }
    
    return { key, data: transformedData };
  });
  
  return transformedSegments;
};




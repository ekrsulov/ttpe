// Text vectorization utilities for converting text to SVG paths using esm-potrace-wasm
import { potrace, init } from 'esm-potrace-wasm';
import { parsePath, serialize, absolutize, normalize } from 'path-data-parser';
import { PATH_DECIMAL_PRECISION, formatToPrecision } from './index';
import type { Command } from '../types';
import { parsePathD } from './pathParserUtils';
import { isTTFFont, ttfTextToPath } from './ttfFontUtils';

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

  // Check if this is a TTF font - if so, use opentype.js directly
  if (isTTFFont(fontFamily)) {
    try {
      const pathData = await ttfTextToPath(text, x, y, fontSize, fontFamily);
      
      // Cache the result
      if (pathData) {
        textVectorizationCache.set(cacheKey, pathData);
      }
      
      return pathData;
    } catch (_error) {
      // Fall through to vectorization method if TTF fails
    }
  }

  // Initialize potrace if not already done
  await initPotrace();

  // Scale factor: render at higher resolution for better vectorization
  // But limit it to avoid memory issues with potrace-wasm
  const maxCanvasWidth = 4096; // Maximum width
  const maxCanvasHeight = 1024; // Maximum height (more restrictive - potrace issue)
  let renderScale = 4;
  
  // First, measure at original size to estimate final canvas size
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  const font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.font = font;
  const estimateMetrics = ctx.measureText(text);
  const estimateWidth = Math.ceil(estimateMetrics.width);
  const estimateHeight = Math.ceil(fontSize * 1.2);
  
  // Adjust renderScale if estimated canvas would be too large
  const estimatedScaledWidth = estimateWidth * renderScale;
  const estimatedScaledHeight = estimateHeight * renderScale;
  
  // Check both width and height limits separately
  if (estimatedScaledWidth > maxCanvasWidth || estimatedScaledHeight > maxCanvasHeight) {
    const scaleByWidth = maxCanvasWidth / estimateWidth;
    const scaleByHeight = maxCanvasHeight / estimateHeight;
    renderScale = Math.floor(Math.min(scaleByWidth, scaleByHeight));
    renderScale = Math.max(1, renderScale); // Ensure at least 1x
  }

  const scaledFontSize = fontSize * renderScale;

  // Set font for measurement at scaled size
  const scaledFont = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${fontFamily}`;
  ctx.font = scaledFont;

  // Measure text to determine canvas size (at scaled size)
  const textMetrics = ctx.measureText(text);
  const textWidth = Math.ceil(textMetrics.width);

  // Use actual bounding box for tighter fit
  let scaledAscent = textMetrics.actualBoundingBoxAscent || scaledFontSize * 0.8;
  let scaledDescent = textMetrics.actualBoundingBoxDescent || scaledFontSize * 0.2;
  let scaledLeft = textMetrics.actualBoundingBoxLeft || 0;
  let scaledRight = textMetrics.actualBoundingBoxRight || textWidth;

  // Use actual bounding box dimensions for minimal padding
  let actualTextWidth = Math.ceil(scaledRight - scaledLeft);
  let actualTextHeight = Math.ceil(scaledAscent + scaledDescent);

  // Minimal padding - just 2 pixels to avoid edge artifacts
  const padding = 2;
  let canvasWidth = actualTextWidth + (padding * 2);
  let canvasHeight = actualTextHeight + (padding * 2);

  // CRITICAL: Check if canvas height exceeds limit and recalculate with smaller scale if needed
  if (canvasHeight > maxCanvasHeight) {
    const heightWithoutPadding = actualTextHeight;
    const unscaledHeight = heightWithoutPadding / renderScale;
    const newRenderScale = Math.floor((maxCanvasHeight - padding * 2) / unscaledHeight);
    renderScale = Math.max(1, newRenderScale);
    
    // Recalculate with new scale
    const newScaledFontSize = fontSize * renderScale;
    const newScaledFont = `${fontStyle} ${fontWeight} ${newScaledFontSize}px ${fontFamily}`;
    ctx.font = newScaledFont;
    
    const newMetrics = ctx.measureText(text);
    scaledAscent = newMetrics.actualBoundingBoxAscent || newScaledFontSize * 0.8;
    scaledDescent = newMetrics.actualBoundingBoxDescent || newScaledFontSize * 0.2;
    scaledLeft = newMetrics.actualBoundingBoxLeft || 0;
    scaledRight = newMetrics.actualBoundingBoxRight || Math.ceil(newMetrics.width);
    
    actualTextWidth = Math.ceil(scaledRight - scaledLeft);
    actualTextHeight = Math.ceil(scaledAscent + scaledDescent);
    
    canvasWidth = actualTextWidth + (padding * 2);
    canvasHeight = actualTextHeight + (padding * 2);
  }

  // Keep unscaled metrics for final positioning
  const actualAscent = scaledAscent / renderScale;
  const actualDescent = scaledDescent / renderScale;

  // Set canvas size at scaled resolution
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  // Emergency check: verify height constraint (potrace has issues with tall canvases)
  if (canvasHeight > maxCanvasHeight) {
    return '';
  }

  // Set font again after canvas resize
  ctx.font = scaledFont;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // Clear canvas with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw text in black at the correct baseline position
  // Adjust for actualBoundingBoxLeft to ensure text starts at padding
  ctx.fillStyle = 'black';
  const baselineY = scaledAscent + padding;
  const textX = padding - scaledLeft; // Compensate for left bearing
  ctx.fillText(text, textX, baselineY);

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
    // Pass unscaled metrics and renderScale to scale down the result
    const pathData = extractPathFromSVGResult(svgResult, x, y, actualAscent, actualDescent);

    // Cache the result only if we got valid path data
    if (pathData) {
      textVectorizationCache.set(cacheKey, pathData);
    }

    return pathData;
  } catch (_error) {
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
    } catch (_error) {
      // Error transforming path
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
  // actualAscent y actualDescent ya están sin escalar (en el tamaño original del fontSize)
  const realTextHeight = actualAscent + actualDescent;

  // globalBounds contiene las coordenadas del SVG generado por potrace
  // que está en el tamaño del canvas escalado (renderScale * fontSize)
  // Para convertir de coordenadas del canvas escalado a coordenadas finales:
  // 1. Las coordenadas del canvas están en escala renderScale
  // 2. realTextHeight es el tamaño final deseado (sin escalar)
  // 3. globalBounds.height es el tamaño del canvas (escalado)
  // Por lo tanto: scaleFactor = tamaño_final / tamaño_canvas
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

/**
 * Convert text to structured path commands (instead of SVG string)
 */
export const textToPathCommands = async (
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string = 'normal',
  fontStyle: string = 'normal'
): Promise<Command[]> => {
  // Get the SVG path string first
  const pathString = await textToPath(text, x, y, fontSize, fontFamily, fontWeight, fontStyle);

  if (!pathString) {
    return [];
  }

  // Parse the string into commands
  const commands = parsePathD(pathString);

  // Return commands directly without removing Z commands
  return commands;
};




// Measurement utilities for text and path elements
// Cache for text measurements to improve performance
const textMeasurementCache = new (globalThis as any).Map();

// Cache for path measurements to improve performance
const pathMeasurementCache = new (globalThis as any).Map();

// Utility function to round coordinates to 2 decimal places
const roundTo2Decimals = (num: number): number => {
  return Math.round(num * 100) / 100;
};

// Function to convert text to path using ghost canvas vectorization (contour tracing)
export const textToPath = (
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string = 'normal',
  fontStyle: string = 'normal',
  textDecoration: string = 'none',
  resolution: number = 2.5
): string => {
  const cacheKey = `text2path-${text}-${x}-${y}-${fontSize}-${fontFamily}-${fontWeight}-${fontStyle}-${textDecoration}-${resolution}`;

  // Check cache first
  if (textMeasurementCache.has(cacheKey)) {
    return textMeasurementCache.get(cacheKey)!;
  }

  // Create ghost canvas for measuring
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  if (!measureCtx) {
    return '';
  }

  // Set font for measurement
  measureCtx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

  // Calculate vertical adjustment to match text baseline positioning
  const ascentAdjustment = fontSize * 0.8; // Approximate ascent for most fonts
  const adjustedOffsetY = y - ascentAdjustment;

  const allPaths: string[] = [];
  let currentX = x;

  // Process each character individually
  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Skip spaces
    if (char === ' ') {
      const spaceWidth = measureCtx.measureText(' ').width;
      currentX += spaceWidth;
      continue;
    }

    // Measure character width
    const charWidth = measureCtx.measureText(char).width;

    // Create canvas for this character
    const charCanvas = document.createElement('canvas');
    const charCtx = charCanvas.getContext('2d');
    if (!charCtx) continue;

    // Set canvas size for this character
    const charCanvasWidth = Math.ceil(charWidth * resolution);
    const charCanvasHeight = Math.ceil(fontSize * 1.2 * resolution);

    charCanvas.width = charCanvasWidth;
    charCanvas.height = charCanvasHeight;

    // Scale context for higher resolution
    charCtx.scale(resolution, resolution);
    charCtx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    charCtx.textBaseline = 'top';

    // Draw character at (0, 0)
    charCtx.fillText(char, 0, 0);

    // Get image data for this character
    const imageData = charCtx.getImageData(0, 0, charCanvas.width, charCanvas.height);
    const pixels = imageData.data;

    // Find contours for this character
    const contours = findContours(pixels, charCanvas.width, charCanvas.height);

    // Convert contours to SVG path for this character
    if (contours.length > 0) {
      const charPaths = contoursToSVGPath(contours, resolution, currentX, adjustedOffsetY);
      if (charPaths) {
        allPaths.push(charPaths);
      }
    }

    // Move to next character position
    currentX += charWidth;
  }

  // Combine all character paths into a single path
  const finalPath = allPaths.join(' ');

  // Cache the result
  textMeasurementCache.set(cacheKey, finalPath);

  return finalPath;
};

// Helper function to find contours in pixel data (edge detection)
const findContours = (pixels: Uint8ClampedArray, width: number, height: number): number[][] => {
  const contours: number[][] = [];
  const visited = new Set<string>();

  // Edge detection algorithm - find pixels that are on the boundary
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      if (visited.has(key)) continue;

      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha > 80) { // If pixel is part of text (reduced threshold for better curve detection)
        // Check if this is an edge pixel (has transparent neighbors)
        if (isEdgePixel(pixels, width, height, x, y)) {
          const contour = traceContour(pixels, width, height, x, y, visited);
          // Only add contours with meaningful length (at least 4 points = 2 coordinate pairs)
          if (contour.length >= 4) {
            contours.push(contour);
          }
        }
      }
    }
  }

  return contours;
};

// Check if a pixel is on the edge (has at least one transparent neighbor)
const isEdgePixel = (pixels: Uint8ClampedArray, width: number, height: number, x: number, y: number): boolean => {
  const alpha = pixels[(y * width + x) * 4 + 3];
  if (alpha <= 100) return false; // Not a text pixel (reduced threshold)

  // Check all 8 neighbors
  const neighbors = [
    [x-1, y-1], [x, y-1], [x+1, y-1],
    [x-1, y],             [x+1, y],
    [x-1, y+1], [x, y+1], [x+1, y+1]
  ];

  for (const [nx, ny] of neighbors) {
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      const neighborAlpha = pixels[(ny * width + nx) * 4 + 3];
      if (neighborAlpha <= 100) { // Reduced threshold for better edge detection
        return true; // Has transparent neighbor = edge pixel
      }
    } else {
      return true; // Edge of canvas = edge pixel
    }
  }

  return false;
};

// Trace a single contour using improved boundary tracing
const traceContour = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  visited: Set<string>
): number[] => {
  const contour: number[] = [];
  let x = startX;
  let y = startY;
  let direction = 0;

  const startKey = `${startX},${startY}`;
  let currentKey = startKey;
  let steps = 0;
  const maxSteps = width * height; // Prevent infinite loops

  // Add starting point
  contour.push(x, y);
  visited.add(currentKey);

  do {
    if (steps++ > maxSteps) break; // Safety check

    // Find next boundary pixel using 8-connectivity
    let found = false;
    for (let i = 0; i < 8; i++) {
      const newDirection = (direction + i) % 8;
      const [dx, dy] = getDirectionOffset(newDirection);
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const neighborKey = `${nx},${ny}`;

        // Check if this pixel is part of the text (not visited and has alpha > threshold)
        if (!visited.has(neighborKey)) {
          const neighborAlpha = pixels[(ny * width + nx) * 4 + 3];
          if (neighborAlpha > 100) { // Reduced threshold for better curve detection
            // Check if this is a boundary pixel
            if (isEdgePixel(pixels, width, height, nx, ny)) {
              x = nx;
              y = ny;
              direction = (newDirection + 6) % 8; // Prepare for next iteration
              currentKey = neighborKey;
              contour.push(x, y);
              visited.add(currentKey);
              found = true;
              break;
            }
          }
        }
      }
    }

    if (!found) break;

  } while (currentKey !== startKey || contour.length < 8);

  return contour;
};

// Get direction offset for Moore-Neighbor tracing
const getDirectionOffset = (direction: number): [number, number] => {
  const offsets: [number, number][] = [
    [1, 0],   // right
    [1, 1],   // down-right
    [0, 1],   // down
    [-1, 1],  // down-left
    [-1, 0],  // left
    [-1, -1], // up-left
    [0, -1],  // up
    [1, -1]   // up-right
  ];
  return offsets[direction];
};

// Filter and merge nearby contours to create more continuous paths
const filterAndMergeContours = (contours: number[][]): number[][] => {
  if (contours.length === 0) return contours;

  // Filter out very small contours - be more aggressive for cleaner paths
  let filteredContours = contours.filter(contour => contour.length >= 8); // Increased threshold for cleaner paths

  // Sort contours by size (larger first) to prioritize main shapes
  filteredContours = filteredContours.sort((a, b) => b.length - a.length);

  // For most letters, we only need 1-2 main contours (outer shape and hole)
  // Keep only the largest contours to avoid noise
  return filteredContours.slice(0, Math.min(3, filteredContours.length)); // Reduced from 8 to 3
};

// Convert contours to SVG path string with proper positioning
const contoursToSVGPath = (contours: number[][], resolution: number, offsetX: number, offsetY: number): string => {
  if (contours.length === 0) return '';

  // Filter and merge nearby contours
  const filteredContours = filterAndMergeContours(contours);

  if (filteredContours.length === 0) return '';

  const pathParts: string[] = [];

  // For cleaner paths, process contours separately but more efficiently
  for (let contourIndex = 0; contourIndex < filteredContours.length; contourIndex++) {
    const contour = filteredContours[contourIndex];

    if (contour.length < 4) continue;

    // Simplify contour with adjusted tolerance for curves
    const simplifiedContour = simplifyContour(contour, 1.0);
    const lineSimplifiedContour = simplifyColinearPoints(simplifiedContour, 1.5);

    if (lineSimplifiedContour.length < 4) continue;

    // Start new subpath for each contour (this is correct for SVG)
    let contourPath = '';

    // Process each point in the contour
    for (let i = 0; i < lineSimplifiedContour.length; i += 2) {
      const x = roundTo2Decimals((lineSimplifiedContour[i] / resolution) + offsetX);
      const y = roundTo2Decimals((lineSimplifiedContour[i + 1] / resolution) + offsetY);

      if (contourPath === '') {
        // First point of this contour
        contourPath = `M ${x} ${y}`;
      } else {
        // Subsequent points use line commands
        contourPath += ` L ${x} ${y}`;
      }
    }

    // Close this contour
    if (contourPath !== '') {
      contourPath += ' Z';
      pathParts.push(contourPath);
    }
  }

  return pathParts.join(' ');
};

// Simplify contour using Douglas-Peucker algorithm to reduce points
const simplifyContour = (contour: number[], tolerance: number): number[] => {
  if (contour.length <= 4) return contour;

  let maxDistance = 0;
  let index = 0;

  // Find point with maximum distance from line
  const startX = contour[0];
  const startY = contour[1];
  const endX = contour[contour.length - 2];
  const endY = contour[contour.length - 1];

  for (let i = 2; i < contour.length - 2; i += 2) {
    const pointX = contour[i];
    const pointY = contour[i + 1];

    const distance = pointToLineDistance(pointX, pointY, startX, startY, endX, endY);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const leftContour = simplifyContour(contour.slice(0, index + 2), tolerance);
    const rightContour = simplifyContour(contour.slice(index), tolerance);

    return [...leftContour.slice(0, -2), ...rightContour];
  } else {
    return [startX, startY, endX, endY];
  }
};

// Additional simplification to remove colinear points and create straighter lines
const simplifyColinearPoints = (contour: number[], angleTolerance: number = 1.0): number[] => {
  if (contour.length <= 6) return contour;

  const simplified: number[] = [contour[0], contour[1]]; // Always keep first point

  for (let i = 2; i < contour.length - 2; i += 2) {
    const prevX = simplified[simplified.length - 2];
    const prevY = simplified[simplified.length - 1];
    const currX = contour[i];
    const currY = contour[i + 1];
    const nextX = contour[i + 2];
    const nextY = contour[i + 3];

    // Calculate angle between three points
    const angle = calculateAngle(prevX, prevY, currX, currY, nextX, nextY);

    // If angle is close to 180 degrees (straight line), skip current point
    if (Math.abs(angle - 180) > angleTolerance) {
      simplified.push(currX, currY);
    }
  }

  // Always keep last point
  simplified.push(contour[contour.length - 2], contour[contour.length - 1]);

  return simplified;
};

// Calculate angle between three points in degrees
const calculateAngle = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): number => {
  const dx1 = x2 - x1;
  const dy1 = y2 - y1;
  const dx2 = x3 - x2;
  const dy2 = y3 - y2;

  const dot = dx1 * dx2 + dy1 * dy2;
  const mag1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const mag2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosAngle = dot / (mag1 * mag2);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);

  return angle;
};

// Calculate distance from point to line
const pointToLineDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
};

// Debug function to test individual character conversion
export const debugCharToPath = (
  char: string,
  x: number,
  y: number,
  fontSize: number,
  fontFamily: string,
  resolution: number = 3.0
): { path: string; contours: number[][]; debug: any } => {
  // Create canvas for this character
  const charCanvas = document.createElement('canvas');
  const charCtx = charCanvas.getContext('2d');
  if (!charCtx) {
    return { path: '', contours: [], debug: { error: 'No context' } };
  }

  // Set font for measurement
  charCtx.font = `normal normal ${fontSize}px ${fontFamily}`;
  const charWidth = charCtx.measureText(char).width;

  // Set canvas size for this character
  const charCanvasWidth = Math.ceil(charWidth * resolution);
  const charCanvasHeight = Math.ceil(fontSize * 1.2 * resolution);

  charCanvas.width = charCanvasWidth;
  charCanvas.height = charCanvasHeight;

  // Scale context for higher resolution
  charCtx.scale(resolution, resolution);
  charCtx.font = `normal normal ${fontSize}px ${fontFamily}`;
  charCtx.textBaseline = 'top';

  // Draw character at (0, 0)
  charCtx.fillText(char, 0, 0);

  // Get image data for this character
  const imageData = charCtx.getImageData(0, 0, charCanvas.width, charCanvas.height);
  const pixels = imageData.data;

  // Find contours for this character
  const contours = findContours(pixels, charCanvas.width, charCanvas.height);

  // Convert contours to SVG path for this character
  const path = contours.length > 0 ? contoursToSVGPath(contours, resolution, x, y) : '';

  return {
    path,
    contours,
    debug: {
      char,
      canvasWidth: charCanvasWidth,
      canvasHeight: charCanvasHeight,
      charWidth,
      resolution,
      pixelCount: pixels.length / 4,
      contourCount: contours.length,
      totalContourPoints: contours.reduce((sum, c) => sum + c.length, 0)
    }
  };
};

// Function to measure text using a ghost canvas
export const measureText = (
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: string = 'normal',
  fontStyle: string = 'normal',
  textDecoration: string = 'none',
  zoom: number = 1
): { width: number; height: number } => {
  const cacheKey = `${text}-${fontSize}-${fontFamily}-${fontWeight}-${fontStyle}-${textDecoration}-${zoom}`;

  // Check cache first
  if (textMeasurementCache.has(cacheKey)) {
    return textMeasurementCache.get(cacheKey)!;
  }

  // Create ghost canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Fallback approximation with zoom consideration
    const approxWidth = text.length * (fontSize * zoom / 2);
    const approxHeight = fontSize * zoom;
    return { width: approxWidth, height: approxHeight };
  }

  // Set font with zoom consideration and text decorations
  const scaledFontSize = fontSize * zoom;
  ctx.font = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${fontFamily}`;

  // Measure text
  const metrics = ctx.measureText(text);
  const width = metrics.width;

  // Get more precise height if available
  const actualHeight = metrics.actualBoundingBoxAscent && metrics.actualBoundingBoxDescent
    ? metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
    : scaledFontSize;

  const result = { width, height: actualHeight };

  // Cache the result
  textMeasurementCache.set(cacheKey, result);

  return result;
};

// Function to measure path bounds using a ghost SVG (considering stroke width)
export const measurePath = (
  d: string,
  strokeWidth: number,
  zoom: number
): { minX: number; minY: number; maxX: number; maxY: number } => {
  const cacheKey = `${d}-${strokeWidth}-${zoom}`;

  // Check cache first
  if (pathMeasurementCache.has(cacheKey)) {
    return pathMeasurementCache.get(cacheKey)!;
  }

  // Create ghost SVG element
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.position = 'absolute';
  svg.style.left = '-9999px';
  svg.style.top = '-9999px';
  svg.style.width = '1px';
  svg.style.height = '1px';
  svg.style.visibility = 'hidden';

  // Create path element
  const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  // Use the provided path data string
  pathElement.setAttribute('d', d);
  pathElement.setAttribute('stroke', '#000000');
  pathElement.setAttribute('stroke-width', (strokeWidth * zoom).toString());
  pathElement.setAttribute('stroke-linecap', 'round');
  pathElement.setAttribute('stroke-linejoin', 'round');
  pathElement.setAttribute('fill', 'none');

  // Add path to SVG
  svg.appendChild(pathElement);

  // Temporarily add to document to get bbox
  document.body.appendChild(svg);

  try {
    // Get bounding box from SVG (geometry only)
    const bbox = pathElement.getBBox();

    // Add stroke width to get the visual bounds
    const halfStroke = strokeWidth / 2;
    const result = {
      minX: bbox.x - halfStroke,
      minY: bbox.y - halfStroke,
      maxX: bbox.x + bbox.width + halfStroke,
      maxY: bbox.y + bbox.height + halfStroke,
    };

    // Cache the result
    pathMeasurementCache.set(cacheKey, result);

    return result;
  } finally {
    // Clean up
    document.body.removeChild(svg);
  }
};
// Measurement utilities for text and path elements
// Cache for text measurements to improve performance
const textMeasurementCache = new Map<string, { width: number; height: number }>();

// Cache for path measurements to improve performance
const pathMeasurementCache = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();

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
    // Fallback approximation
    const approxWidth = text.length * (fontSize / 2);
    const approxHeight = fontSize;
    return { width: approxWidth, height: approxHeight };
  }

  // Set font with zoom consideration and text decorations
  const scaledFontSize = fontSize / zoom;
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
  points: Array<{ x: number; y: number }>,
  strokeWidth: number,
  zoom: number
): { minX: number; minY: number; maxX: number; maxY: number } => {
  const cacheKey = `${JSON.stringify(points)}-${strokeWidth}-${zoom}`;

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

  // Create path data string with original coordinates
  const pathData = points.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  pathElement.setAttribute('d', pathData);
  pathElement.setAttribute('stroke', '#000000');
  pathElement.setAttribute('stroke-width', strokeWidth.toString());
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
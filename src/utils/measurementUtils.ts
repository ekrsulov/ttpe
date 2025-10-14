// Measurement utilities for path elements
// Cache for path measurements to improve performance
const pathMeasurementCache = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();

// Function to measure path bounds using a ghost SVG element
export const measurePath = (
  subPaths: import('../types').SubPath[],
  strokeWidth: number,
  zoom: number
): { minX: number; minY: number; maxX: number; maxY: number } => {
  // Generate d string from subPaths
  const d = subPaths.flat().map(cmd => {
    switch (cmd.type) {
      case 'M':
        return `M ${cmd.position.x} ${cmd.position.y}`;
      case 'L':
        return `L ${cmd.position.x} ${cmd.position.y}`;
      case 'C':
        return `C ${cmd.controlPoint1.x} ${cmd.controlPoint1.y} ${cmd.controlPoint2.x} ${cmd.controlPoint2.y} ${cmd.position.x} ${cmd.position.y}`;
      case 'Z':
        return 'Z';
      default:
        return '';
    }
  }).join(' ');

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

/**
 * Measure bounds of a subpath from commands
 * Unifies the logic previously duplicated in Canvas, CanvasRenderer, and subpathPluginSlice
 */
export const measureSubpathBounds = (
  commands: import('../types').Command[],
  strokeWidth: number = 1,
  zoom: number = 1
): { minX: number; minY: number; maxX: number; maxY: number } => {
  // Convert commands to subpath format for measurePath
  const subPaths = [commands];
  return measurePath(subPaths, strokeWidth, zoom);
};

/**
 * Accumulate bounding boxes from multiple command sets
 * Centralizes the logic that was duplicated in Canvas and transformationPluginSlice
 */
export const accumulateBounds = (
  commandsList: import('../types').Command[][],
  strokeWidth: number,
  zoom: number
): { minX: number; minY: number; maxX: number; maxY: number } | null => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  commandsList.forEach((commands) => {
    const bounds = measurePath([commands], strokeWidth, zoom);
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  });

  return minX === Infinity ? null : { minX, minY, maxX, maxY };
};

// Measurement utilities for path elements
// Cache for path measurements to improve performance
const pathMeasurementCache = new (globalThis as any).Map();

// Function to measure path bounds using a ghost SVG element
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
  pathElement.setAttribute('stroke-width', (strokeWidth / zoom).toString());
  pathElement.setAttribute('stroke-linecap', 'round');
  pathElement.setAttribute('stroke-linejoin', 'round');
  pathElement.setAttribute('fill', 'none');
  pathElement.setAttribute('vector-effect', 'non-scaling-stroke');

  // Add path to SVG
  svg.appendChild(pathElement);

  // Temporarily add to document to get bbox
  document.body.appendChild(svg);

  try {
    // Get bounding box from SVG (geometry only)
    const bbox = pathElement.getBBox();

    // Add stroke width to get the visual bounds
    const halfStroke = (strokeWidth / zoom) / 2;
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

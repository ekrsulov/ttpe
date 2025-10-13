/**
 * Visual Center Algorithm
 * Based on https://github.com/javierbyte/visual-center
 * 
 * This algorithm finds the visual/optical center of a shape by analyzing
 * the distribution of pixels and their distances from candidate center points.
 */

const COLOR_DIFF_WEIGHT_EXPO = 0.333;
const ROUNDS = 250;

interface RGBColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface Point {
  x: number;
  y: number;
}

interface VisualCenterOptions {
  bgColor: RGBColor;
  height: number;
  width: number;
  maxDiff: number;
  maxDistance: number;
}

/**
 * Calculate the visual center of an RGB matrix
 */
export function calculateVisualCenter(rgbMatrix: RGBColor[][]): Point {
  let visualLeft = 0.5;
  let visualTop = 0.5;

  // Iteratively refine the visual center
  ({ visualLeft } = recursiveGetCoord(rgbMatrix, visualLeft, visualTop, 'X', 1 / ROUNDS));
  ({ visualLeft } = recursiveGetCoord(rgbMatrix, visualLeft, visualTop, 'X', -1 / ROUNDS));
  ({ visualTop } = recursiveGetCoord(rgbMatrix, visualLeft, visualTop, 'Y', 1 / ROUNDS));
  ({ visualTop } = recursiveGetCoord(rgbMatrix, visualLeft, visualTop, 'Y', -1 / ROUNDS));

  return { 
    x: visualLeft, 
    y: visualTop 
  };
}

/**
 * Recursively find the optimal coordinate along an axis
 */
function recursiveGetCoord(
  rgbMatrix: RGBColor[][],
  visualLeft: number,
  visualTop: number,
  currentAxis: 'X' | 'Y',
  stepSize: number
): { visualLeft: number; visualTop: number } {
  const bgColor = normalizeColor(rgbMatrix[0][0]);
  const height = rgbMatrix.length;
  const width = rgbMatrix[0].length;

  const ops: VisualCenterOptions = {
    bgColor,
    height,
    width,
    maxDiff:
      Math.max(bgColor.r, 255 - bgColor.r) +
      Math.max(bgColor.g, 255 - bgColor.g) +
      Math.max(bgColor.b, 255 - bgColor.b),
    maxDistance: getDistance([0, 0], [width, height])
  };

  let visualLeftToApply = visualLeft;
  let visualTopToApply = visualTop;
  let newVisualLeft = visualLeft;
  let newVisualTop = visualTop;

  if (currentAxis === 'X') {
    newVisualLeft += stepSize;
  } else {
    newVisualTop += stepSize;
  }

  let oldCenterIntensity = getCenterIntensity(rgbMatrix, visualLeft, visualTop, ops);
  let newCenterIntensity = getCenterIntensity(rgbMatrix, newVisualLeft, newVisualTop, ops);

  while (newCenterIntensity > oldCenterIntensity) {
    visualLeftToApply = newVisualLeft;
    visualTopToApply = newVisualTop;

    if (currentAxis === 'X') {
      newVisualLeft += stepSize;
    } else {
      newVisualTop += stepSize;
    }

    oldCenterIntensity = newCenterIntensity;
    newCenterIntensity = getCenterIntensity(rgbMatrix, newVisualLeft, newVisualTop, ops);
  }

  return {
    visualLeft: visualLeftToApply,
    visualTop: visualTopToApply
  };
}

/**
 * Calculate the intensity of a point as the visual center
 */
function getCenterIntensity(
  rgbMatrix: RGBColor[][],
  visualLeft: number,
  visualTop: number,
  ops: VisualCenterOptions
): number {
  const { bgColor, height, width, maxDiff, maxDistance } = ops;

  const centerCol = visualTop * height;
  const centerRow = visualLeft * width;
  const centerPoint: [number, number] = [centerCol, centerRow];

  return rgbMatrix.reduce((resRow, row, rowIdx) => {
    return (
      resRow +
      row.reduce((resCol, col, colIdx) => {
        const cellColorDiff = rgbDiff(bgColor, col, maxDiff);

        if (!cellColorDiff) return resCol;

        const cellDistance = getDistance(centerPoint, [rowIdx, colIdx]);
        const cellColorWeight =
          cellColorDiff *
          Math.pow(1 - cellDistance / maxDistance, 0.5) *
          1000;

        return resCol + cellColorWeight;
      }, 0)
    );
  }, 0);
}

/**
 * Calculate distance between two points
 */
function getDistance(pointA: [number, number], pointB: [number, number]): number {
  return Math.pow(
    Math.pow(pointA[0] - pointB[0], 2) + Math.pow(pointA[1] - pointB[1], 2),
    0.5
  );
}

/**
 * Normalize color with alpha channel
 */
function normalizeColor(color: RGBColor): RGBColor {
  return {
    r: Math.floor(color.r * (color.a / 255) + 255 * (1 - color.a / 255)),
    g: Math.floor(color.g * (color.a / 255) + 255 * (1 - color.a / 255)),
    b: Math.floor(color.b * (color.a / 255) + 255 * (1 - color.a / 255)),
    a: 255
  };
}

/**
 * Calculate the difference between two RGB colors
 */
function rgbDiff(baseColor: RGBColor, testColor: RGBColor, maxDiff: number): number {
  if (testColor.a === 0) return 0;

  const diff =
    Math.abs(baseColor.r - testColor.r) +
    Math.abs(baseColor.g - testColor.g) +
    Math.abs(baseColor.b - testColor.b);

  const result =
    Math.pow(diff / maxDiff, COLOR_DIFF_WEIGHT_EXPO) *
    (testColor.a / 255) *
    1000;

  return result;
}

/**
 * Convert SVG path to RGB matrix for visual center calculation
 * The path will be scaled relative to the container size to maintain proper proportions
 * Considers both fill and stroke with all their properties for accurate visual representation
 */
export async function pathToRGBMatrix(
  svgPath: string,
  containerWidth: number,
  containerHeight: number,
  fillColor: string = 'black',
  fillOpacity: number = 1,
  strokeColor: string = 'none',
  strokeWidth: number = 0,
  strokeOpacity: number = 1,
  strokeLinecap: 'butt' | 'round' | 'square' = 'butt',
  strokeLinejoin: 'miter' | 'round' | 'bevel' = 'miter',
  strokeDasharray: string = '',
  scaleStrokeWidth: boolean = false, // Control if stroke scales with the path
  size: number = 420
): Promise<RGBColor[][]> {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary SVG to get the path's bounds
      const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      tempSvg.style.position = 'absolute';
      tempSvg.style.visibility = 'hidden';
      document.body.appendChild(tempSvg);

      const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      tempPath.setAttribute('d', svgPath);
      tempSvg.appendChild(tempPath);

      // Get the bounding box of the content path
      const contentBbox = tempPath.getBBox();
      document.body.removeChild(tempSvg);

      // Calculate scale based on container size, not content size
      // This ensures the content is scaled proportionally to how it appears in the container
      const padding = 20; // Add some padding
      const availableSize = size - padding * 2;
      
      // Scale based on the container dimensions
      const containerScale = Math.min(
        availableSize / containerWidth,
        availableSize / containerHeight
      );

      // Scale the content with the same ratio as the container
      const scale = containerScale;

      // Center the content in the canvas (REQUIRED for visual-center algorithm)
      const scaledContentWidth = contentBbox.width * scale;
      const scaledContentHeight = contentBbox.height * scale;
      const offsetX = (size - scaledContentWidth) / 2 - contentBbox.x * scale;
      const offsetY = (size - scaledContentHeight) / 2 - contentBbox.y * scale;

      // Create the final SVG with proper scaling
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', size.toString());
      svg.setAttribute('height', size.toString());
      svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', svgPath);
      
      // For visual-center algorithm to work, we need contrast between the shape and background
      // The algorithm assumes white background, so we need to ensure the shape is visible
      // If the fill is white or very light, we need to use black instead
      // If the fill is 'none', use the stroke color or default to black
      
      let effectiveFill = fillColor;
      let effectiveFillOpacity = fillOpacity;
      let effectiveStroke = strokeColor;
      let effectiveStrokeWidth = strokeWidth;
      let effectiveStrokeOpacity = strokeOpacity;
      
      // Check if fill is white/light or transparent - if so, use black for visibility
      const isLightOrTransparent = 
        fillColor === '#ffffff' || 
        fillColor === '#fff' || 
        fillColor === 'white' ||
        fillColor === 'none' || 
        fillColor === 'transparent' ||
        fillColor.toLowerCase().includes('rgb(255') ||
        fillColor.toLowerCase().includes('rgba(255') ||
        fillOpacity === 0;
      
      if (isLightOrTransparent) {
        // If we have a visible stroke, use it
        if (strokeColor !== 'none' && strokeColor !== 'transparent' && strokeWidth > 0 && strokeOpacity > 0) {
          effectiveFill = 'none';
          effectiveFillOpacity = 0;
          effectiveStroke = strokeColor;
          effectiveStrokeWidth = strokeWidth;
          effectiveStrokeOpacity = strokeOpacity;
        } else {
          // No visible stroke, use black fill for contrast
          effectiveFill = 'black';
          effectiveFillOpacity = 1;
          effectiveStroke = 'none';
          effectiveStrokeWidth = 0;
          effectiveStrokeOpacity = 0;
        }
      } else if (fillColor === 'none' || fillColor === 'transparent' || fillOpacity === 0) {
        // Fill is none but not white, check stroke
        if (strokeColor !== 'none' && strokeColor !== 'transparent' && strokeWidth > 0 && strokeOpacity > 0) {
          effectiveFill = strokeColor; // Use stroke as fill for better detection
          effectiveFillOpacity = strokeOpacity;
          effectiveStroke = 'none';
          effectiveStrokeWidth = 0;
          effectiveStrokeOpacity = 0;
        } else {
          effectiveFill = 'black';
          effectiveFillOpacity = 1;
          effectiveStroke = 'none';
          effectiveStrokeWidth = 0;
          effectiveStrokeOpacity = 0;
        }
      }
      
      // Apply all fill properties
      path.setAttribute('fill', effectiveFill);
      path.setAttribute('fill-opacity', effectiveFillOpacity.toString());
      
      // Calculate stroke width based on scaleStrokeWidth parameter
      // If false (default), keep original stroke width (non-scaling stroke)
      // If true, scale stroke proportionally with the path
      const finalStrokeWidth = scaleStrokeWidth 
        ? effectiveStrokeWidth * scale 
        : effectiveStrokeWidth;
      
      // Apply all stroke properties
      path.setAttribute('stroke', effectiveStroke);
      path.setAttribute('stroke-width', finalStrokeWidth.toString());
      path.setAttribute('stroke-opacity', effectiveStrokeOpacity.toString());
      path.setAttribute('stroke-linecap', strokeLinecap);
      path.setAttribute('stroke-linejoin', strokeLinejoin);
      
      // Apply dasharray
      // Scale dasharray only if scaleStrokeWidth is true
      if (strokeDasharray && strokeDasharray !== '' && effectiveStroke !== 'none') {
        if (scaleStrokeWidth) {
          const scaledDasharray = strokeDasharray
            .split(/[\s,]+/)
            .map(val => (parseFloat(val) * scale).toString())
            .join(' ');
          path.setAttribute('stroke-dasharray', scaledDasharray);
        } else {
          path.setAttribute('stroke-dasharray', strokeDasharray);
        }
      }
      
      path.setAttribute('transform', `translate(${offsetX}, ${offsetY}) scale(${scale})`);
      svg.appendChild(path);

      // Convert to data URL
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const dataUrl = 'data:image/svg+xml;base64,' + btoa(svgString);

      // Debug: Log the generated image data URL and properties
      console.log('[Visual Center Debug] Generated image data URL:', dataUrl);
      console.log('[Visual Center Debug] Container dimensions:', { containerWidth, containerHeight });
      console.log('[Visual Center Debug] Content bbox:', contentBbox);
      console.log('[Visual Center Debug] Scale:', scale);
      console.log('[Visual Center Debug] Styles:', { 
        fill: effectiveFill,
        fillOpacity: effectiveFillOpacity,
        stroke: effectiveStroke, 
        strokeWidth: scaleStrokeWidth ? effectiveStrokeWidth * scale : effectiveStrokeWidth,
        strokeWidthScaled: scaleStrokeWidth,
        strokeOpacity: effectiveStrokeOpacity,
        strokeLinecap,
        strokeLinejoin,
        strokeDasharray: strokeDasharray ? 'applied' : 'none',
        originalFill: fillColor,
        originalFillOpacity: fillOpacity,
        originalStroke: strokeColor,
        originalStrokeWidth: strokeWidth,
        originalStrokeOpacity: strokeOpacity,
        wasAdjustedForContrast: isLightOrTransparent
      });

      // Load into image
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Fill with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);

        // Draw the image
        ctx.drawImage(img, 0, 0, size, size);

        // Get pixel data
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        // Convert to RGB matrix
        const rgbMatrix: RGBColor[][] = [];
        for (let y = 0; y < size; y++) {
          const row: RGBColor[] = [];
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            row.push({
              r: data[idx],
              g: data[idx + 1],
              b: data[idx + 2],
              a: data[idx + 3]
            });
          }
          rgbMatrix.push(row);
        }

        resolve(rgbMatrix);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = dataUrl;
    } catch (error) {
      reject(error);
    }
  });
}

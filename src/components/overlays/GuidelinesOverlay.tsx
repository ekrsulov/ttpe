import React from 'react';
import type { GuidelineMatch, DistanceGuidelineMatch } from '../../store/slices/plugins/guidelinesPluginSlice';
import type { PathData } from '../../types';
import { measurePath } from '../../utils/measurementUtils';

interface GuidelinesOverlayProps {
  guidelines: {
    enabled: boolean;
    distanceEnabled: boolean;
    debugMode: boolean;
    currentMatches: GuidelineMatch[];
    currentDistanceMatches: DistanceGuidelineMatch[];
  };
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  elements: Array<{
    id: string;
    type: string;
    data: unknown;
  }>;
  selectedIds: string[];
}

export const GuidelinesOverlay: React.FC<GuidelinesOverlayProps> = ({
  guidelines,
  viewport,
  elements,
  selectedIds,
}) => {
  if (!guidelines.enabled) {
    return null;
  }

  const strokeWidth = 1 / viewport.zoom;
  const activeGuidelineStrokeWidth = 2 / viewport.zoom; // Thicker for active guidelines
  const guidelineColor = '#FF0000'; // Red for active alignment guidelines
  const debugGuidelineColor = 'rgba(255, 0, 255, 0.15)'; // Very transparent magenta for debug
  const distanceColor = '#0066CC'; // Blue for distance guidelines (both reference and current)
  const referenceDistanceColor = '#0066CC'; // Same blue for reference distance guidelines

  // Calculate canvas bounds for infinite lines
  const canvasWidth = 10000;
  const canvasHeight = 10000;

  // In debug mode, calculate all possible guidelines for all elements
  const debugGuidelines: GuidelineMatch[] = [];
  const debugDistances: Array<DistanceGuidelineMatch & { 
    bounds1?: { minX: number; minY: number; maxX: number; maxY: number };
    bounds2?: { minX: number; minY: number; maxX: number; maxY: number };
  }> = [];
  
  if (guidelines.debugMode) {
    // Collect bounds for all non-selected elements
    const elementBounds = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();
    
    elements.forEach((element) => {
      if (element.type !== 'path' || selectedIds.includes(element.id)) return;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pathData = element.data as any;
      if (!pathData?.subPaths) return;

      // Simple bounds calculation
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pathData.subPaths.forEach((subPath: any[]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subPath.forEach((cmd: any) => {
          if (cmd.type === 'M' || cmd.type === 'L') {
            minX = Math.min(minX, cmd.position.x);
            minY = Math.min(minY, cmd.position.y);
            maxX = Math.max(maxX, cmd.position.x);
            maxY = Math.max(maxY, cmd.position.y);
          } else if (cmd.type === 'C') {
            minX = Math.min(minX, cmd.position.x, cmd.controlPoint1.x, cmd.controlPoint2.x);
            minY = Math.min(minY, cmd.position.y, cmd.controlPoint1.y, cmd.controlPoint2.y);
            maxX = Math.max(maxX, cmd.position.x, cmd.controlPoint1.x, cmd.controlPoint2.x);
            maxY = Math.max(maxY, cmd.position.y, cmd.controlPoint1.y, cmd.controlPoint2.y);
          }
        });
      });

      if (!isFinite(minX)) return;

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      // Store bounds
      elementBounds.set(element.id, { minX, minY, maxX, maxY });

      // Add all guidelines for this element
      debugGuidelines.push({ type: 'left', position: minX, elementIds: [element.id] });
      debugGuidelines.push({ type: 'right', position: maxX, elementIds: [element.id] });
      debugGuidelines.push({ type: 'top', position: minY, elementIds: [element.id] });
      debugGuidelines.push({ type: 'bottom', position: maxY, elementIds: [element.id] });
      debugGuidelines.push({ type: 'centerX', position: centerX, elementIds: [element.id] });
      debugGuidelines.push({ type: 'centerY', position: centerY, elementIds: [element.id] });
    });

    // Calculate all possible distances between elements (filtered by projection bands)
    const boundsArray = Array.from(elementBounds.entries());
    
    // Helper function to check if two ranges overlap
    const rangesOverlap = (
      min1: number, max1: number, 
      min2: number, max2: number
    ): boolean => {
      return !(max1 < min2 || max2 < min1);
    };
    
    // Horizontal distances - only for elements whose Y ranges overlap
    for (let i = 0; i < boundsArray.length - 1; i++) {
      for (let j = i + 1; j < boundsArray.length; j++) {
        const [id1, bounds1] = boundsArray[i];
        const [id2, bounds2] = boundsArray[j];
        
        // Check if Y ranges overlap (in horizontal band)
        if (!rangesOverlap(bounds1.minY, bounds1.maxY, bounds2.minY, bounds2.maxY)) {
          continue;
        }
        
        // Check if elements are horizontally adjacent
        const distance1 = Math.round(bounds2.minX - bounds1.maxX);
        const distance2 = Math.round(bounds1.minX - bounds2.maxX);
        
        if (distance1 > 0) {
          debugDistances.push({
            axis: 'horizontal',
            distance: distance1,
            referenceStart: bounds1.maxX,
            referenceEnd: bounds2.minX,
            referenceElementIds: [id1, id2],
            currentStart: bounds1.maxX,
            currentEnd: bounds2.minX,
            currentElementId: id1,
            bounds1,
            bounds2,
          });
        }
        
        if (distance2 > 0) {
          debugDistances.push({
            axis: 'horizontal',
            distance: distance2,
            referenceStart: bounds2.maxX,
            referenceEnd: bounds1.minX,
            referenceElementIds: [id2, id1],
            currentStart: bounds2.maxX,
            currentEnd: bounds1.minX,
            currentElementId: id2,
            bounds1: bounds2,
            bounds2: bounds1,
          });
        }
      }
    }
    
    // Vertical distances - only for elements whose X ranges overlap
    for (let i = 0; i < boundsArray.length - 1; i++) {
      for (let j = i + 1; j < boundsArray.length; j++) {
        const [id1, bounds1] = boundsArray[i];
        const [id2, bounds2] = boundsArray[j];
        
        // Check if X ranges overlap (in vertical band)
        if (!rangesOverlap(bounds1.minX, bounds1.maxX, bounds2.minX, bounds2.maxX)) {
          continue;
        }
        
        // Check if elements are vertically adjacent
        const distance1 = Math.round(bounds2.minY - bounds1.maxY);
        const distance2 = Math.round(bounds1.minY - bounds2.maxY);
        
        if (distance1 > 0) {
          debugDistances.push({
            axis: 'vertical',
            distance: distance1,
            referenceStart: bounds1.maxY,
            referenceEnd: bounds2.minY,
            referenceElementIds: [id1, id2],
            currentStart: bounds1.maxY,
            currentEnd: bounds2.minY,
            currentElementId: id1,
            bounds1,
            bounds2,
          });
        }
        
        if (distance2 > 0) {
          debugDistances.push({
            axis: 'vertical',
            distance: distance2,
            referenceStart: bounds2.maxY,
            referenceEnd: bounds1.minY,
            referenceElementIds: [id2, id1],
            currentStart: bounds2.maxY,
            currentEnd: bounds1.minY,
            currentElementId: id2,
            bounds1: bounds2,
            bounds2: bounds1,
          });
        }
      }
    }
  }

  return (
    <g>
      {/* Debug Guidelines (all possible guidelines) */}
      {guidelines.debugMode && debugGuidelines.map((match, index) => {
        let x1, y1, x2, y2;

        switch (match.type) {
          case 'left':
          case 'right':
          case 'centerX':
            // Vertical line
            x1 = match.position;
            y1 = -canvasHeight;
            x2 = match.position;
            y2 = canvasHeight;
            break;
          case 'top':
          case 'bottom':
          case 'centerY':
            // Horizontal line
            x1 = -canvasWidth;
            y1 = match.position;
            x2 = canvasWidth;
            y2 = match.position;
            break;
          default:
            return null;
        }

        return (
          <line
            key={`debug-${index}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={debugGuidelineColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
            pointerEvents="none"
            opacity={1}
          />
        );
      })}

      {/* Debug Distance Guidelines */}
      {guidelines.debugMode && guidelines.distanceEnabled && debugDistances.map((match, index) => {
        const isHorizontal = match.axis === 'horizontal';
        
        // Get bounds for the two elements involved (stored in the match object)
        const bounds1 = match.bounds1;
        const bounds2 = match.bounds2;
        
        if (!bounds1 || !bounds2) return null;
        
        // Calculate perpendicular midpoint (where the line should be drawn)
        // For horizontal: Y coordinate at the vertical overlap center
        // For vertical: X coordinate at the horizontal overlap center
        const perpendicularMid = isHorizontal
          ? (Math.max(bounds1.minY, bounds2.minY) + Math.min(bounds1.maxY, bounds2.maxY)) / 2
          : (Math.max(bounds1.minX, bounds2.minX) + Math.min(bounds1.maxX, bounds2.maxX)) / 2;
        
        return (
          <g key={`debug-distance-${index}`} opacity={0.15}>
            {/* Distance line */}
            <line
              x1={isHorizontal ? match.referenceStart : perpendicularMid}
              y1={isHorizontal ? perpendicularMid : match.referenceStart}
              x2={isHorizontal ? match.referenceEnd : perpendicularMid}
              y2={isHorizontal ? perpendicularMid : match.referenceEnd}
              stroke="rgba(0, 255, 255, 0.3)"
              strokeWidth={strokeWidth}
              pointerEvents="none"
            />
            {/* Arrow caps */}
            <line
              x1={isHorizontal ? match.referenceStart : perpendicularMid - 3 / viewport.zoom}
              y1={isHorizontal ? perpendicularMid - 3 / viewport.zoom : match.referenceStart}
              x2={isHorizontal ? match.referenceStart : perpendicularMid + 3 / viewport.zoom}
              y2={isHorizontal ? perpendicularMid + 3 / viewport.zoom : match.referenceStart}
              stroke="rgba(0, 255, 255, 0.3)"
              strokeWidth={strokeWidth}
              pointerEvents="none"
            />
            <line
              x1={isHorizontal ? match.referenceEnd : perpendicularMid - 3 / viewport.zoom}
              y1={isHorizontal ? perpendicularMid - 3 / viewport.zoom : match.referenceEnd}
              x2={isHorizontal ? match.referenceEnd : perpendicularMid + 3 / viewport.zoom}
              y2={isHorizontal ? perpendicularMid + 3 / viewport.zoom : match.referenceEnd}
              stroke="rgba(0, 255, 255, 0.3)"
              strokeWidth={strokeWidth}
              pointerEvents="none"
            />
            {/* Distance label */}
            <text
              x={isHorizontal ? (match.referenceStart + match.referenceEnd) / 2 : perpendicularMid + 10 / viewport.zoom}
              y={isHorizontal ? perpendicularMid - 3 / viewport.zoom : (match.referenceStart + match.referenceEnd) / 2}
              fill="rgba(0, 255, 255, 0.4)"
              fontSize={10 / viewport.zoom}
              fontFamily="monospace"
              pointerEvents="none"
              textAnchor="middle"
            >
              {match.distance}
            </text>
          </g>
        );
      })}

      {/* Active Alignment Guidelines */}
      {guidelines.currentMatches.map((match, index) => {
        let x1, y1, x2, y2;

        switch (match.type) {
          case 'left':
          case 'right':
          case 'centerX':
            // Vertical line
            x1 = match.position;
            y1 = -canvasHeight;
            x2 = match.position;
            y2 = canvasHeight;
            break;
          case 'top':
          case 'bottom':
          case 'centerY':
            // Horizontal line
            x1 = -canvasWidth;
            y1 = match.position;
            x2 = canvasWidth;
            y2 = match.position;
            break;
          default:
            return null;
        }

        return (
          <line
            key={`alignment-${index}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={guidelineColor}
            strokeWidth={activeGuidelineStrokeWidth}
            pointerEvents="none"
            opacity={1}
          />
        );
      })}

      {/* Distance Guidelines - Only show the smallest distance value (but draw all lines with that value) */}
      {guidelines.distanceEnabled && guidelines.currentDistanceMatches.length > 0 && (() => {
        // Find the smallest distance value
        const minDistance = Math.min(...guidelines.currentDistanceMatches.map(m => m.distance));
        
        // Filter all matches that have this minimum distance
        const matchesWithMinDistance = guidelines.currentDistanceMatches.filter(
          m => Math.abs(m.distance - minDistance) < 0.1 // Use small epsilon for floating point comparison
        );
        
        return matchesWithMinDistance.map((match, index) => {
        const isHorizontal = match.axis === 'horizontal';
        
        // Calculate perpendicular midpoint based on element bounds
        const elementBoundsMap = new Map<string, ReturnType<typeof measurePath>>();
        elements.forEach(el => {
          if (el.type === 'path') {
            const bounds = measurePath((el.data as PathData).subPaths, (el.data as PathData).strokeWidth, viewport.zoom);
            elementBoundsMap.set(el.id, bounds);
          }
        });
        
        const refBounds1 = elementBoundsMap.get(match.referenceElementIds[0]);
        const refBounds2 = elementBoundsMap.get(match.referenceElementIds[1]);
        const currentBounds = elementBoundsMap.get(match.currentElementId);
        
        if (!refBounds1 || !refBounds2 || !currentBounds) {
          return null;
        }

        // Check if this is a 2-element case (reference and current are the same pair)
        const isTwoElementCase = 
          match.referenceStart === match.currentStart && 
          match.referenceEnd === match.currentEnd;
        
        // For horizontal: Y coordinate at vertical overlap center
        // For vertical: X coordinate at horizontal overlap center
        const refPerpendicularMid = isHorizontal
          ? (Math.max(refBounds1.minY, refBounds2.minY) + Math.min(refBounds1.maxY, refBounds2.maxY)) / 2
          : (Math.max(refBounds1.minX, refBounds2.minX) + Math.min(refBounds1.maxX, refBounds2.maxX)) / 2;
        
        // Find the "other" element involved in current distance
        const otherElement = elements.find(el => 
          el.id !== match.currentElementId && 
          (isHorizontal 
            ? (el.type === 'path' && (
                Math.abs(measurePath((el.data as PathData).subPaths, (el.data as PathData).strokeWidth, viewport.zoom).maxX - match.currentStart) < 0.1 ||
                Math.abs(measurePath((el.data as PathData).subPaths, (el.data as PathData).strokeWidth, viewport.zoom).minX - match.currentEnd) < 0.1
              ))
            : (el.type === 'path' && (
                Math.abs(measurePath((el.data as PathData).subPaths, (el.data as PathData).strokeWidth, viewport.zoom).maxY - match.currentStart) < 0.1 ||
                Math.abs(measurePath((el.data as PathData).subPaths, (el.data as PathData).strokeWidth, viewport.zoom).minY - match.currentEnd) < 0.1
              ))
          )
        );
        
        const otherBounds = otherElement ? elementBoundsMap.get(otherElement.id) : null;
        
        const currentPerpendicularMid = otherBounds 
          ? (isHorizontal
              ? (Math.max(currentBounds.minY, otherBounds.minY) + Math.min(currentBounds.maxY, otherBounds.maxY)) / 2
              : (Math.max(currentBounds.minX, otherBounds.minX) + Math.min(currentBounds.maxX, otherBounds.maxX)) / 2)
          : refPerpendicularMid;
        
        // Draw reference distance line
        const refLine = (
          <g key={`distance-ref-${index}`}>
            <line
              x1={isHorizontal ? match.referenceStart : refPerpendicularMid}
              y1={isHorizontal ? refPerpendicularMid : match.referenceStart}
              x2={isHorizontal ? match.referenceEnd : refPerpendicularMid}
              y2={isHorizontal ? refPerpendicularMid : match.referenceEnd}
              stroke={referenceDistanceColor}
              strokeWidth={activeGuidelineStrokeWidth}
              pointerEvents="none"
              opacity={1}
            />
            {/* Arrow caps for reference */}
            <line
              x1={isHorizontal ? match.referenceStart : refPerpendicularMid - 5 / viewport.zoom}
              y1={isHorizontal ? refPerpendicularMid - 5 / viewport.zoom : match.referenceStart}
              x2={isHorizontal ? match.referenceStart : refPerpendicularMid + 5 / viewport.zoom}
              y2={isHorizontal ? refPerpendicularMid + 5 / viewport.zoom : match.referenceStart}
              stroke={referenceDistanceColor}
              strokeWidth={activeGuidelineStrokeWidth}
              pointerEvents="none"
              opacity={1}
            />
            <line
              x1={isHorizontal ? match.referenceEnd : refPerpendicularMid - 5 / viewport.zoom}
              y1={isHorizontal ? refPerpendicularMid - 5 / viewport.zoom : match.referenceEnd}
              x2={isHorizontal ? match.referenceEnd : refPerpendicularMid + 5 / viewport.zoom}
              y2={isHorizontal ? refPerpendicularMid + 5 / viewport.zoom : match.referenceEnd}
              stroke={referenceDistanceColor}
              strokeWidth={activeGuidelineStrokeWidth}
              pointerEvents="none"
              opacity={1}
            />
            {/* Distance label with white background tag */}
            <g>
              <rect
                x={isHorizontal ? (match.referenceStart + match.referenceEnd) / 2 - 15 / viewport.zoom : refPerpendicularMid + 5 / viewport.zoom}
                y={isHorizontal ? refPerpendicularMid - 15 / viewport.zoom : (match.referenceStart + match.referenceEnd) / 2 - 10 / viewport.zoom}
                width={30 / viewport.zoom}
                height={16 / viewport.zoom}
                fill="white"
                rx={3 / viewport.zoom}
                ry={3 / viewport.zoom}
                pointerEvents="none"
              />
              <text
                x={isHorizontal ? (match.referenceStart + match.referenceEnd) / 2 : refPerpendicularMid + 20 / viewport.zoom}
                y={isHorizontal ? refPerpendicularMid - 5 / viewport.zoom : (match.referenceStart + match.referenceEnd) / 2 + 3 / viewport.zoom}
                fill={referenceDistanceColor}
                fontSize={12 / viewport.zoom}
                fontFamily="sans-serif"
                pointerEvents="none"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {Math.round(match.distance)}
              </text>
            </g>
          </g>
        );

        // Draw current distance line
        const currentLine = (
          <g key={`distance-current-${index}`}>
            <line
              x1={isHorizontal ? match.currentStart : currentPerpendicularMid}
              y1={isHorizontal ? currentPerpendicularMid : match.currentStart}
              x2={isHorizontal ? match.currentEnd : currentPerpendicularMid}
              y2={isHorizontal ? currentPerpendicularMid : match.currentEnd}
              stroke={distanceColor}
              strokeWidth={activeGuidelineStrokeWidth}
              pointerEvents="none"
              opacity={1}
            />
            {/* Arrow caps for current */}
            <line
              x1={isHorizontal ? match.currentStart : currentPerpendicularMid - 5 / viewport.zoom}
              y1={isHorizontal ? currentPerpendicularMid - 5 / viewport.zoom : match.currentStart}
              x2={isHorizontal ? match.currentStart : currentPerpendicularMid + 5 / viewport.zoom}
              y2={isHorizontal ? currentPerpendicularMid + 5 / viewport.zoom : match.currentStart}
              stroke={distanceColor}
              strokeWidth={activeGuidelineStrokeWidth}
              pointerEvents="none"
              opacity={1}
            />
            <line
              x1={isHorizontal ? match.currentEnd : currentPerpendicularMid - 5 / viewport.zoom}
              y1={isHorizontal ? currentPerpendicularMid - 5 / viewport.zoom : match.currentEnd}
              x2={isHorizontal ? match.currentEnd : currentPerpendicularMid + 5 / viewport.zoom}
              y2={isHorizontal ? currentPerpendicularMid + 5 / viewport.zoom : match.currentEnd}
              stroke={distanceColor}
              strokeWidth={activeGuidelineStrokeWidth}
              pointerEvents="none"
              opacity={1}
            />
            
            {/* Distance label with white background tag */}
            <g>
              <rect
                x={isHorizontal ? (match.currentStart + match.currentEnd) / 2 - 15 / viewport.zoom : currentPerpendicularMid + 5 / viewport.zoom}
                y={isHorizontal ? currentPerpendicularMid - 15 / viewport.zoom : (match.currentStart + match.currentEnd) / 2 - 10 / viewport.zoom}
                width={30 / viewport.zoom}
                height={16 / viewport.zoom}
                fill="white"
                rx={3 / viewport.zoom}
                ry={3 / viewport.zoom}
                pointerEvents="none"
              />
              <text
                x={isHorizontal ? (match.currentStart + match.currentEnd) / 2 : currentPerpendicularMid + 20 / viewport.zoom}
                y={isHorizontal ? currentPerpendicularMid - 5 / viewport.zoom : (match.currentStart + match.currentEnd) / 2 + 3 / viewport.zoom}
                fill={distanceColor}
                fontSize={12 / viewport.zoom}
                fontFamily="sans-serif"
                pointerEvents="none"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {Math.round(match.distance)}
              </text>
            </g>
          </g>
        );

        return (
          <React.Fragment key={`distance-group-${index}`}>
            {isTwoElementCase ? (
              // For 2-element case, only draw one line (not separate ref and current)
              <g key={`distance-single-${index}`}>
                <line
                  x1={isHorizontal ? match.currentStart : currentPerpendicularMid}
                  y1={isHorizontal ? currentPerpendicularMid : match.currentStart}
                  x2={isHorizontal ? match.currentEnd : currentPerpendicularMid}
                  y2={isHorizontal ? currentPerpendicularMid : match.currentEnd}
                  stroke={distanceColor}
                  strokeWidth={activeGuidelineStrokeWidth}
                  pointerEvents="none"
                  opacity={1}
                />
                {/* Arrow caps */}
                <line
                  x1={isHorizontal ? match.currentStart : currentPerpendicularMid - 5 / viewport.zoom}
                  y1={isHorizontal ? currentPerpendicularMid - 5 / viewport.zoom : match.currentStart}
                  x2={isHorizontal ? match.currentStart : currentPerpendicularMid + 5 / viewport.zoom}
                  y2={isHorizontal ? currentPerpendicularMid + 5 / viewport.zoom : match.currentStart}
                  stroke={distanceColor}
                  strokeWidth={activeGuidelineStrokeWidth}
                  pointerEvents="none"
                  opacity={1}
                />
                <line
                  x1={isHorizontal ? match.currentEnd : currentPerpendicularMid - 5 / viewport.zoom}
                  y1={isHorizontal ? currentPerpendicularMid - 5 / viewport.zoom : match.currentEnd}
                  x2={isHorizontal ? match.currentEnd : currentPerpendicularMid + 5 / viewport.zoom}
                  y2={isHorizontal ? currentPerpendicularMid + 5 / viewport.zoom : match.currentEnd}
                  stroke={distanceColor}
                  strokeWidth={activeGuidelineStrokeWidth}
                  pointerEvents="none"
                  opacity={1}
                />
                {/* Distance label */}
                <g>
                  <rect
                    x={isHorizontal ? (match.currentStart + match.currentEnd) / 2 - 15 / viewport.zoom : currentPerpendicularMid + 5 / viewport.zoom}
                    y={isHorizontal ? currentPerpendicularMid - 15 / viewport.zoom : (match.currentStart + match.currentEnd) / 2 - 10 / viewport.zoom}
                    width={30 / viewport.zoom}
                    height={16 / viewport.zoom}
                    fill="white"
                    rx={3 / viewport.zoom}
                    ry={3 / viewport.zoom}
                    pointerEvents="none"
                  />
                  <text
                    x={isHorizontal ? (match.currentStart + match.currentEnd) / 2 : currentPerpendicularMid + 20 / viewport.zoom}
                    y={isHorizontal ? currentPerpendicularMid - 5 / viewport.zoom : (match.currentStart + match.currentEnd) / 2 + 3 / viewport.zoom}
                    fill={distanceColor}
                    fontSize={12 / viewport.zoom}
                    fontFamily="sans-serif"
                    pointerEvents="none"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {Math.round(match.distance)}
                  </text>
                </g>
              </g>
            ) : (
              // For multi-element case, draw both reference and current lines
              <>
                {refLine}
                {currentLine}
              </>
            )}
          </React.Fragment>
        );
      });
      })()}
    </g>
  );
};

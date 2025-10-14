import React, { useMemo } from 'react';
import type { GuidelineMatch, DistanceGuidelineMatch } from '../../store/slices/plugins/guidelinesPluginSlice';
import type { PathData } from '../../types';
import { 
  calculateElementBoundsMap, 
  calculatePerpendicularMidpoint,
  rangesOverlap,
  type Bounds
} from '../../utils/guidelinesHelpers';
import { GuidelineLine, DistanceLabel } from './GuidelineComponents';
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
  // In debug mode, calculate all possible guidelines for all elements
  // useMemo must be called before any early returns
  const { debugGuidelines, debugDistances } = useMemo(() => {
    if (!guidelines.enabled || !guidelines.debugMode) {
      return { debugGuidelines: [], debugDistances: [] };
    }

    // Use centralized helper to calculate bounds for all non-selected elements
    const boundsMap = calculateElementBoundsMap(elements, selectedIds, viewport.zoom);
    
    const debugGuidelinesArray: GuidelineMatch[] = [];
    const debugDistancesArray: Array<DistanceGuidelineMatch & { 
      bounds1?: Bounds;
      bounds2?: Bounds;
    }> = [];

    // Generate guidelines for each element
    boundsMap.forEach((info) => {
      debugGuidelinesArray.push({ type: 'left', position: info.bounds.minX, elementIds: [info.id] });
      debugGuidelinesArray.push({ type: 'right', position: info.bounds.maxX, elementIds: [info.id] });
      debugGuidelinesArray.push({ type: 'top', position: info.bounds.minY, elementIds: [info.id] });
      debugGuidelinesArray.push({ type: 'bottom', position: info.bounds.maxY, elementIds: [info.id] });
      debugGuidelinesArray.push({ type: 'centerX', position: info.centerX, elementIds: [info.id] });
      debugGuidelinesArray.push({ type: 'centerY', position: info.centerY, elementIds: [info.id] });
    });

    // Calculate all possible distances between elements (filtered by projection bands)
    const boundsArray = Array.from(boundsMap.values());
    
    // Horizontal distances - only for elements whose Y ranges overlap
    for (let i = 0; i < boundsArray.length - 1; i++) {
      for (let j = i + 1; j < boundsArray.length; j++) {
        const info1 = boundsArray[i];
        const info2 = boundsArray[j];
        
        // Check if Y ranges overlap (in horizontal band)
        if (!rangesOverlap(info1.bounds.minY, info1.bounds.maxY, info2.bounds.minY, info2.bounds.maxY)) {
          continue;
        }
        
        // Check if elements are horizontally adjacent
        const distance1 = Math.round(info2.bounds.minX - info1.bounds.maxX);
        const distance2 = Math.round(info1.bounds.minX - info2.bounds.maxX);
        
        if (distance1 > 0) {
          debugDistancesArray.push({
            axis: 'horizontal',
            distance: distance1,
            referenceStart: info1.bounds.maxX,
            referenceEnd: info2.bounds.minX,
            referenceElementIds: [info1.id, info2.id],
            currentStart: info1.bounds.maxX,
            currentEnd: info2.bounds.minX,
            currentElementId: info1.id,
            bounds1: info1.bounds,
            bounds2: info2.bounds,
          });
        }
        
        if (distance2 > 0) {
          debugDistancesArray.push({
            axis: 'horizontal',
            distance: distance2,
            referenceStart: info2.bounds.maxX,
            referenceEnd: info1.bounds.minX,
            referenceElementIds: [info2.id, info1.id],
            currentStart: info2.bounds.maxX,
            currentEnd: info1.bounds.minX,
            currentElementId: info2.id,
            bounds1: info2.bounds,
            bounds2: info1.bounds,
          });
        }
      }
    }
    
    // Vertical distances - only for elements whose X ranges overlap
    for (let i = 0; i < boundsArray.length - 1; i++) {
      for (let j = i + 1; j < boundsArray.length; j++) {
        const info1 = boundsArray[i];
        const info2 = boundsArray[j];
        
        // Check if X ranges overlap (in vertical band)
        if (!rangesOverlap(info1.bounds.minX, info1.bounds.maxX, info2.bounds.minX, info2.bounds.maxX)) {
          continue;
        }
        
        // Check if elements are vertically adjacent
        const distance1 = Math.round(info2.bounds.minY - info1.bounds.maxY);
        const distance2 = Math.round(info1.bounds.minY - info2.bounds.maxY);
        
        if (distance1 > 0) {
          debugDistancesArray.push({
            axis: 'vertical',
            distance: distance1,
            referenceStart: info1.bounds.maxY,
            referenceEnd: info2.bounds.minY,
            referenceElementIds: [info1.id, info2.id],
            currentStart: info1.bounds.maxY,
            currentEnd: info2.bounds.minY,
            currentElementId: info1.id,
            bounds1: info1.bounds,
            bounds2: info2.bounds,
          });
        }
        
        if (distance2 > 0) {
          debugDistancesArray.push({
            axis: 'vertical',
            distance: distance2,
            referenceStart: info2.bounds.maxY,
            referenceEnd: info1.bounds.minY,
            referenceElementIds: [info2.id, info1.id],
            currentStart: info2.bounds.maxY,
            currentEnd: info1.bounds.minY,
            currentElementId: info2.id,
            bounds1: info2.bounds,
            bounds2: info1.bounds,
          });
        }
      }
    }

    return { debugGuidelines: debugGuidelinesArray, debugDistances: debugDistancesArray };
  }, [guidelines.enabled, guidelines.debugMode, elements, selectedIds, viewport.zoom]);

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

  return (
    <g>
      {/* Debug Guidelines (all possible guidelines) */}
      {debugGuidelines.map((match, index) => (
        <GuidelineLine
          key={`debug-${index}`}
          type={match.type}
          position={match.position}
          canvasSize={{ width: canvasWidth, height: canvasHeight }}
          strokeWidth={strokeWidth}
          color={debugGuidelineColor}
          dashArray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
          opacity={1}
        />
      ))}

      {/* Debug Distance Guidelines */}
      {guidelines.distanceEnabled && debugDistances.map((match, index) => {
        const bounds1 = match.bounds1;
        const bounds2 = match.bounds2;
        
        if (!bounds1 || !bounds2) return null;
        
        // Use centralized helper for perpendicular midpoint calculation
        const perpendicularMid = calculatePerpendicularMidpoint(
          match.axis,
          bounds1,
          bounds2
        );
        
        return (
          <DistanceLabel
            key={`debug-distance-${index}`}
            axis={match.axis}
            start={match.referenceStart}
            end={match.referenceEnd}
            distance={match.distance}
            otherAxisPosition={perpendicularMid}
            strokeWidth={strokeWidth}
            color="rgba(0, 255, 255, 0.3)"
            zoom={viewport.zoom}
            opacity={0.15}
            withBackground={false}
          />
        );
      })}

      {/* Active Alignment Guidelines */}
      {guidelines.currentMatches.map((match, index) => (
        <GuidelineLine
          key={`alignment-${index}`}
          type={match.type}
          position={match.position}
          canvasSize={{ width: canvasWidth, height: canvasHeight }}
          strokeWidth={activeGuidelineStrokeWidth}
          color={guidelineColor}
          opacity={1}
        />
      ))}

      {/* Distance Guidelines - Only show the smallest distance value (but draw all lines with that value) */}
      {guidelines.distanceEnabled && guidelines.currentDistanceMatches.length > 0 && (() => {
        // Find the smallest distance value
        const minDistance = Math.min(...guidelines.currentDistanceMatches.map(m => m.distance));
        
        // Filter all matches that have this minimum distance
        const matchesWithMinDistance = guidelines.currentDistanceMatches.filter(
          m => Math.abs(m.distance - minDistance) < 0.1 // Use small epsilon for floating point comparison
        );
        
        // Calculate element bounds once for all matches (performance optimization)
        const elementBoundsMap = new Map<string, Bounds>();
        elements.forEach(el => {
          if (el.type === 'path') {
            const bounds = measurePath((el.data as PathData).subPaths, (el.data as PathData).strokeWidth || 0, viewport.zoom);
            elementBoundsMap.set(el.id, bounds);
          }
        });
        
        return matchesWithMinDistance.map((match, index) => {
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
          
          // Use centralized helper for perpendicular midpoint calculation
          const refPerpendicularMid = calculatePerpendicularMidpoint(
            match.axis,
            refBounds1,
            refBounds2
          );
          
          // Find the "other" element involved in current distance
          const otherElement = elements.find(el => {
            if (el.id === match.currentElementId || el.type !== 'path') return false;
            const bounds = elementBoundsMap.get(el.id);
            if (!bounds) return false;
            
            if (match.axis === 'horizontal') {
              return Math.abs(bounds.maxX - match.currentStart) < 0.1 ||
                     Math.abs(bounds.minX - match.currentEnd) < 0.1;
            } else {
              return Math.abs(bounds.maxY - match.currentStart) < 0.1 ||
                     Math.abs(bounds.minY - match.currentEnd) < 0.1;
            }
          });
          
          const otherBounds = otherElement ? elementBoundsMap.get(otherElement.id) : null;
          
          const currentPerpendicularMid = otherBounds 
            ? calculatePerpendicularMidpoint(match.axis, currentBounds, otherBounds)
            : refPerpendicularMid;
          
          if (isTwoElementCase) {
            // For 2-element case, only draw one line (not separate ref and current)
            return (
              <DistanceLabel
                key={`distance-single-${index}`}
                axis={match.axis}
                start={match.currentStart}
                end={match.currentEnd}
                distance={match.distance}
                otherAxisPosition={currentPerpendicularMid}
                strokeWidth={activeGuidelineStrokeWidth}
                color={distanceColor}
                zoom={viewport.zoom}
                opacity={1}
                withBackground={true}
              />
            );
          } else {
            // For multi-element case, draw both reference and current lines
            return (
              <React.Fragment key={`distance-group-${index}`}>
                <DistanceLabel
                  key={`distance-ref-${index}`}
                  axis={match.axis}
                  start={match.referenceStart}
                  end={match.referenceEnd}
                  distance={match.distance}
                  otherAxisPosition={refPerpendicularMid}
                  strokeWidth={activeGuidelineStrokeWidth}
                  color={referenceDistanceColor}
                  zoom={viewport.zoom}
                  opacity={1}
                  withBackground={true}
                />
                <DistanceLabel
                  key={`distance-current-${index}`}
                  axis={match.axis}
                  start={match.currentStart}
                  end={match.currentEnd}
                  distance={match.distance}
                  otherAxisPosition={currentPerpendicularMid}
                  strokeWidth={activeGuidelineStrokeWidth}
                  color={distanceColor}
                  zoom={viewport.zoom}
                  opacity={1}
                  withBackground={true}
                />
              </React.Fragment>
            );
          }
        });
      })()}
    </g>
  );
};

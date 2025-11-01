import React, { useMemo } from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import type { GuidelineMatch, DistanceGuidelineMatch } from './slice';
import { 
  calculateElementBoundsMap,
  calculatePerpendicularMidpoint,
  type Bounds
} from '../../utils/guidelinesHelpers';
import { guidelineDistanceScan } from '../../utils/guidelinesCore';
import { GuidelineLine, DistanceLabel } from './GuidelineComponents';

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
  const labelBackgroundColor = useColorModeValue('rgba(255, 255, 255, 0.5)', 'rgba(26, 32, 44, 0.5)');
  const distanceTextColor = useColorModeValue('black', '#CCCCCC'); // Black for light mode, light gray for dark mode
  
  // In debug mode, calculate all possible guidelines for all elements
  // useMemo must be called before any early returns
  const { debugGuidelines, debugDistances } = useMemo(() => {
    if (!guidelines.enabled || !guidelines.debugMode) {
      return { debugGuidelines: [], debugDistances: [] };
    }

    // Use centralized helper to calculate bounds for all non-selected elements
    const boundsMap = calculateElementBoundsMap(elements, selectedIds, viewport.zoom);
    
    const debugGuidelinesArray: GuidelineMatch[] = [];

    // Generate guidelines for each element
    boundsMap.forEach((info) => {
      debugGuidelinesArray.push({ type: 'left', position: info.bounds.minX, elementIds: [info.id] });
      debugGuidelinesArray.push({ type: 'right', position: info.bounds.maxX, elementIds: [info.id] });
      debugGuidelinesArray.push({ type: 'top', position: info.bounds.minY, elementIds: [info.id] });
      debugGuidelinesArray.push({ type: 'bottom', position: info.bounds.maxY, elementIds: [info.id] });
      debugGuidelinesArray.push({ type: 'centerX', position: info.centerX, elementIds: [info.id] });
      debugGuidelinesArray.push({ type: 'centerY', position: info.centerY, elementIds: [info.id] });
    });

    // Use centralized distance scan function
    const boundsArray = Array.from(boundsMap.values());
    const distanceResults = guidelineDistanceScan(boundsArray, { roundDistance: true });
    
    // Convert results to the format expected by the overlay
    const debugDistancesArray = distanceResults.map((result) => ({
      axis: result.axis,
      distance: result.distance,
      referenceStart: result.referenceStart,
      referenceEnd: result.referenceEnd,
      referenceElementIds: result.referenceElementIds,
      currentStart: result.referenceStart,
      currentEnd: result.referenceEnd,
      currentElementId: result.referenceElementIds[0],
      bounds1: result.bounds1,
      bounds2: result.bounds2,
    }));

    return { debugGuidelines: debugGuidelinesArray, debugDistances: debugDistancesArray };
  }, [guidelines.enabled, guidelines.debugMode, elements, selectedIds, viewport.zoom]);

  if (!guidelines.enabled) {
    return null;
  }

  const strokeWidth = 1 / viewport.zoom;
  const activeGuidelineStrokeWidth = 2 / viewport.zoom; // Thicker for active guidelines
  const guidelineColor = '#FF0000'; // Red for active alignment guidelines
  const debugGuidelineColor = 'rgba(255, 0, 255, 0.15)'; // Very transparent magenta for debug
  const distanceColor = '#666666'; // Gray for distance guidelines (both reference and current)
  const referenceDistanceColor = '#666666'; // Same gray for reference distance guidelines

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
        
        // Use centralized bounds calculation instead of manual iteration
        const elementBoundsInfo = calculateElementBoundsMap(elements, [], viewport.zoom);
        const elementBoundsMap = new Map<string, Bounds>();
        elementBoundsInfo.forEach((info, id) => {
          elementBoundsMap.set(id, info.bounds);
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
                backgroundColor={labelBackgroundColor}
                textColor={distanceTextColor}
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
                  backgroundColor={labelBackgroundColor}
                  textColor={distanceTextColor}
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
                  backgroundColor={labelBackgroundColor}
                  textColor={distanceTextColor}
                />
              </React.Fragment>
            );
          }
        });
      })()}
    </g>
  );
};

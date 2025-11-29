import type { StateCreator } from 'zustand';
import type { PathData } from '../../types';
import { rangesOverlap, calculateElementBoundsMap } from '../../utils/guidelinesHelpers';

export interface GuidelineMatch {
  type: 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY';
  position: number;
  elementIds: string[];
}

export interface DistanceGuidelineMatch {
  axis: 'horizontal' | 'vertical';
  distance: number;
  // Reference pair that establishes the distance
  referenceStart: number;
  referenceEnd: number;
  referenceElementIds: [string, string];
  // Current element being moved
  currentStart: number;
  currentEnd: number;
  currentElementId: string;
}

export interface GuidelinesPluginSlice {
  // State
  guidelines: {
    enabled: boolean;
    distanceEnabled: boolean;
    debugMode: boolean;
    snapThreshold: number; // pixels
    currentMatches: GuidelineMatch[];
    currentDistanceMatches: DistanceGuidelineMatch[];
    stickyState: {
      isSticky: boolean;
      stickyOffset: { x: number; y: number };
      lastStickyTime: number;
    };
  };

  // Actions
  updateGuidelinesState: (state: Partial<GuidelinesPluginSlice['guidelines']>) => void;
  findAlignmentGuidelines: (elementId: string, currentBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }) => GuidelineMatch[];
  findDistanceGuidelines: (elementId: string, currentBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }, alignmentMatches?: GuidelineMatch[]) => DistanceGuidelineMatch[];
  checkStickySnap: (
    deltaX: number, 
    deltaY: number, 
    projectedBounds: { minX: number; minY: number; maxX: number; maxY: number }
  ) => { x: number; y: number; snapped: boolean };
  clearGuidelines: () => void;
}

export const createGuidelinesPluginSlice: StateCreator<GuidelinesPluginSlice, [], [], GuidelinesPluginSlice> = (set, get) => {
  return {
    // Initial state
    guidelines: {
      enabled: true,
      distanceEnabled: true,
      debugMode: false,
      snapThreshold: 5, // 5 pixels
      currentMatches: [],
      currentDistanceMatches: [],
      stickyState: {
        isSticky: false,
        stickyOffset: { x: 0, y: 0 },
        lastStickyTime: 0,
      },
    },

    // Actions
    updateGuidelinesState: (state) => {
      set((current) => ({
        guidelines: { ...current.guidelines, ...state },
      }));
    },

    // Find alignment guidelines (edges and centers)
    findAlignmentGuidelines: (elementId, currentBounds) => {
      const state = get();
      
      if (!state.guidelines.enabled) {
        return [];
      }

      const matches: GuidelineMatch[] = [];
      // Access elements and viewport from parent state through type assertion
      const fullState = get() as unknown as { 
        elements: Array<{ id: string; type: string; data: PathData }>; 
        viewport: { zoom: number; panX: number; panY: number }; 
      };
      
      const { elements, viewport } = fullState;
      
      if (!elements || !viewport) {
        return [];
      }

      const threshold = state.guidelines.snapThreshold / viewport.zoom;

      const currentCenterX = (currentBounds.minX + currentBounds.maxX) / 2;
      const currentCenterY = (currentBounds.minY + currentBounds.maxY) / 2;

      // Calculate viewport center
      const viewportCenterX = (window.innerWidth / 2 - viewport.panX) / viewport.zoom;
      const viewportCenterY = (window.innerHeight / 2 - viewport.panY) / viewport.zoom;

      // Priority: center > edges
      // We'll collect all possible matches and then filter by priority
      const potentialMatches: Array<{ 
        match: GuidelineMatch; 
        priority: number; // 1 = center, 2 = edge
      }> = [];

      // Add viewport center guidelines
      if (Math.abs(currentCenterX - viewportCenterX) < threshold) {
        potentialMatches.push({
          match: { type: 'centerX', position: viewportCenterX, elementIds: ['viewport'] },
          priority: 1
        });
      }

      if (Math.abs(currentCenterY - viewportCenterY) < threshold) {
        potentialMatches.push({
          match: { type: 'centerY', position: viewportCenterY, elementIds: ['viewport'] },
          priority: 1
        });
      }

      // Use centralized bounds calculation with caching
      const boundsMap = calculateElementBoundsMap(
        elements,
        [elementId], // exclude current element
        viewport.zoom,
        { includeStroke: true }
      );

      // Check against all other elements using cached bounds
      boundsMap.forEach((boundsInfo) => {
        const { id: refElementId, bounds, centerX, centerY } = boundsInfo;

        // === HORIZONTAL ALIGNMENTS ===
        
        // Center X alignment (highest priority)
        if (Math.abs(currentCenterX - centerX) < threshold) {
          const existing = potentialMatches.find(
            m => m.match.type === 'centerX' && Math.abs(m.match.position - centerX) < threshold
          );
          if (existing) {
            existing.match.elementIds.push(refElementId);
          } else {
            potentialMatches.push({
              match: { type: 'centerX', position: centerX, elementIds: [refElementId] },
              priority: 1
            });
          }
        }
        
        // Left edge alignment (edge-to-edge)
        if (Math.abs(currentBounds.minX - bounds.minX) < threshold) {
          const existing = potentialMatches.find(
            m => m.match.type === 'left' && Math.abs(m.match.position - bounds.minX) < threshold
          );
          if (existing) {
            existing.match.elementIds.push(refElementId);
          } else {
            potentialMatches.push({
              match: { type: 'left', position: bounds.minX, elementIds: [refElementId] },
              priority: 2
            });
          }
        }

        // Left edge entering/exiting from right (current.minX touches reference.maxX)
        if (Math.abs(currentBounds.minX - bounds.maxX) < threshold) {
          const existing = potentialMatches.find(
            m => m.match.type === 'left' && Math.abs(m.match.position - bounds.maxX) < threshold
          );
          if (existing) {
            existing.match.elementIds.push(refElementId);
          } else {
            potentialMatches.push({
              match: { type: 'left', position: bounds.maxX, elementIds: [refElementId] },
              priority: 2
            });
          }
        }

        // Right edge alignment (edge-to-edge)
        if (Math.abs(currentBounds.maxX - bounds.maxX) < threshold) {
          const existing = potentialMatches.find(
            m => m.match.type === 'right' && Math.abs(m.match.position - bounds.maxX) < threshold
          );
          if (existing) {
            existing.match.elementIds.push(refElementId);
          } else {
            potentialMatches.push({
              match: { type: 'right', position: bounds.maxX, elementIds: [refElementId] },
              priority: 2
            });
          }
        }

        // Right edge entering/exiting from left (current.maxX touches reference.minX)
        if (Math.abs(currentBounds.maxX - bounds.minX) < threshold) {
          const existing = potentialMatches.find(
            m => m.match.type === 'right' && Math.abs(m.match.position - bounds.minX) < threshold
          );
          if (existing) {
            existing.match.elementIds.push(refElementId);
          } else {
            potentialMatches.push({
              match: { type: 'right', position: bounds.minX, elementIds: [refElementId] },
              priority: 2
            });
          }
        }

        // === VERTICAL ALIGNMENTS ===
        
        // Center Y alignment (highest priority)
        if (Math.abs(currentCenterY - centerY) < threshold) {
          const existing = potentialMatches.find(
            m => m.match.type === 'centerY' && Math.abs(m.match.position - centerY) < threshold
          );
          if (existing) {
            existing.match.elementIds.push(refElementId);
          } else {
            potentialMatches.push({
              match: { type: 'centerY', position: centerY, elementIds: [refElementId] },
              priority: 1
            });
          }
        }

        // Top edge alignment (edge-to-edge)
        if (Math.abs(currentBounds.minY - bounds.minY) < threshold) {
          const existing = potentialMatches.find(
            m => m.match.type === 'top' && Math.abs(m.match.position - bounds.minY) < threshold
          );
          if (existing) {
            existing.match.elementIds.push(refElementId);
          } else {
            potentialMatches.push({
              match: { type: 'top', position: bounds.minY, elementIds: [refElementId] },
              priority: 2
            });
          }
        }

        // Top edge entering/exiting from bottom (current.minY touches reference.maxY)
        if (Math.abs(currentBounds.minY - bounds.maxY) < threshold) {
          const existing = potentialMatches.find(
            m => m.match.type === 'top' && Math.abs(m.match.position - bounds.maxY) < threshold
          );
          if (existing) {
            existing.match.elementIds.push(refElementId);
          } else {
            potentialMatches.push({
              match: { type: 'top', position: bounds.maxY, elementIds: [refElementId] },
              priority: 2
            });
          }
        }

        // Bottom edge alignment (edge-to-edge)
        if (Math.abs(currentBounds.maxY - bounds.maxY) < threshold) {
          const existing = potentialMatches.find(
            m => m.match.type === 'bottom' && Math.abs(m.match.position - bounds.maxY) < threshold
          );
          if (existing) {
            existing.match.elementIds.push(refElementId);
          } else {
            potentialMatches.push({
              match: { type: 'bottom', position: bounds.maxY, elementIds: [refElementId] },
              priority: 2
            });
          }
        }

        // Bottom edge entering/exiting from top (current.maxY touches reference.minY)
        if (Math.abs(currentBounds.maxY - bounds.minY) < threshold) {
          const existing = potentialMatches.find(
            m => m.match.type === 'bottom' && Math.abs(m.match.position - bounds.minY) < threshold
          );
          if (existing) {
            existing.match.elementIds.push(refElementId);
          } else {
            potentialMatches.push({
              match: { type: 'bottom', position: bounds.minY, elementIds: [refElementId] },
              priority: 2
            });
          }
        }
      });

      // Prioritization logic:
      // 1. Find the highest priority match in each axis (horizontal and vertical)
      // 2. Return at most one horizontal and one vertical guideline
      
      const horizontalMatches = potentialMatches.filter(
        m => m.match.type === 'left' || m.match.type === 'right' || m.match.type === 'centerX'
      );
      const verticalMatches = potentialMatches.filter(
        m => m.match.type === 'top' || m.match.type === 'bottom' || m.match.type === 'centerY'
      );

      // Get the highest priority (lowest number) horizontal match
      if (horizontalMatches.length > 0) {
        horizontalMatches.sort((a, b) => a.priority - b.priority);
        matches.push(horizontalMatches[0].match);
      }

      // Get the highest priority (lowest number) vertical match
      if (verticalMatches.length > 0) {
        verticalMatches.sort((a, b) => a.priority - b.priority);
        matches.push(verticalMatches[0].match);
      }

      return matches;
    },

    // Find distance guidelines
    findDistanceGuidelines: (elementId, currentBounds, alignmentMatches = []) => {
      const state = get();
      
      if (!state.guidelines.enabled || !state.guidelines.distanceEnabled) {
        return [];
      }

      const matches: DistanceGuidelineMatch[] = [];
      const fullState = get() as unknown as { 
        elements: Array<{ id: string; type: string; data: PathData }>; 
        viewport: { zoom: number; panX: number; panY: number }; 
      };
      const { elements, viewport } = fullState;
      
      if (!elements || !viewport) {
        return [];
      }

      const threshold = state.guidelines.snapThreshold / viewport.zoom;

      // Use centralized bounds calculation for all other elements
      const boundsMap = calculateElementBoundsMap(
        elements,
        [elementId], // exclude current element
        viewport.zoom,
        { includeStroke: true }
      );

      // Special case: when an alignment guideline involves exactly 2 elements (current + 1 reference)
      // Show the direct distance between those 2 aligned elements
      alignmentMatches.forEach(match => {
        // Check if this alignment has exactly 1 reference element (plus the current one = 2 total)
        if (match.elementIds.length === 1) {
          const referenceElementId = match.elementIds[0];
          const refBoundsInfo = boundsMap.get(referenceElementId);
          
          if (refBoundsInfo) {
            const refBounds = refBoundsInfo.bounds;

            // Determine axis based on alignment type
            const isVerticalAlignment = match.type === 'centerX' || match.type === 'left' || match.type === 'right';
            const isHorizontalAlignment = match.type === 'centerY' || match.type === 'top' || match.type === 'bottom';

            if (isVerticalAlignment) {
              // Elements are vertically aligned (same X/column), show vertical distance (Y axis)
              const verticalGap = Math.min(
                Math.abs(currentBounds.minY - refBounds.maxY), // current is below
                Math.abs(refBounds.minY - currentBounds.maxY)  // current is above
              );
              
              const distance = Math.round(verticalGap);
              if (distance > 0) {
                if (currentBounds.minY > refBounds.maxY) {
                  // Current is below
                  matches.push({
                    axis: 'vertical',
                    distance,
                    referenceStart: refBounds.maxY,
                    referenceEnd: currentBounds.minY,
                    referenceElementIds: [referenceElementId, elementId],
                    currentStart: refBounds.maxY,
                    currentEnd: currentBounds.minY,
                    currentElementId: elementId,
                  });
                } else {
                  // Current is above
                  matches.push({
                    axis: 'vertical',
                    distance,
                    referenceStart: currentBounds.maxY,
                    referenceEnd: refBounds.minY,
                    referenceElementIds: [elementId, referenceElementId],
                    currentStart: currentBounds.maxY,
                    currentEnd: refBounds.minY,
                    currentElementId: elementId,
                  });
                }
              }
            } else if (isHorizontalAlignment) {
              // Elements are horizontally aligned (same Y/row), show horizontal distance (X axis)
              const horizontalGap = Math.min(
                Math.abs(currentBounds.minX - refBounds.maxX), // current is to the right
                Math.abs(refBounds.minX - currentBounds.maxX)  // current is to the left
              );
              
              const distance = Math.round(horizontalGap);
              if (distance > 0) {
                if (currentBounds.minX > refBounds.maxX) {
                  // Current is to the right
                  matches.push({
                    axis: 'horizontal',
                    distance,
                    referenceStart: refBounds.maxX,
                    referenceEnd: currentBounds.minX,
                    referenceElementIds: [referenceElementId, elementId],
                    currentStart: refBounds.maxX,
                    currentEnd: currentBounds.minX,
                    currentElementId: elementId,
                  });
                } else {
                  // Current is to the left
                  matches.push({
                    axis: 'horizontal',
                    distance,
                    referenceStart: currentBounds.maxX,
                    referenceEnd: refBounds.minX,
                    referenceElementIds: [elementId, referenceElementId],
                    currentStart: currentBounds.maxX,
                    currentEnd: refBounds.minX,
                    currentElementId: elementId,
                  });
                }
              }
            }
          }
        }
      });

      // If we already have matches from 2-element alignments, return them
      // (no need to look for distance patterns with multiple elements)
      if (matches.length > 0 && boundsMap.size < 2) {
        return matches;
      }

      if (boundsMap.size < 2) {
        return []; // Need at least 2 other elements to establish a distance pattern
      }

      // Convert boundsMap to simple format for distance calculations
      const elementBounds = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();
      boundsMap.forEach((info, id) => {
        elementBounds.set(id, info.bounds);
      });

      // === HORIZONTAL DISTANCES ===
      // Filter elements that are in the horizontal band (Y range overlaps with current element)
      // Use centralized rangesOverlap helper
      const horizontalBandElements = Array.from(elementBounds.entries()).filter(
        ([, bounds]) => rangesOverlap(currentBounds.minY, currentBounds.maxY, bounds.minY, bounds.maxY)
      );

      // Find horizontal distance patterns only among elements in the horizontal band
      const horizontalDistances = new Map<number, Array<{ start: number; end: number; ids: [string, string] }>>();
      
      const sortedByX = horizontalBandElements.sort((a, b) => a[1].minX - b[1].minX);
      
      for (let i = 0; i < sortedByX.length - 1; i++) {
        const [id1, bounds1] = sortedByX[i];
        const [id2, bounds2] = sortedByX[i + 1];
        
        // Distance between right edge of first and left edge of second
        const distance = Math.round(bounds2.minX - bounds1.maxX);
        
        if (distance > 0) {
          if (!horizontalDistances.has(distance)) {
            horizontalDistances.set(distance, []);
          }
          horizontalDistances.get(distance)!.push({
            start: bounds1.maxX,
            end: bounds2.minX,
            ids: [id1, id2]
          });
        }
      }

      // Check if current element matches any horizontal distance
      horizontalDistances.forEach((pairs, distance) => {
        if (pairs.length > 0) {
          // Check distance from any element in the band to the current one
          sortedByX.forEach(([, otherBounds]) => {
            // Check if current element is to the right of this element
            const currentDistance = currentBounds.minX - otherBounds.maxX;
            if (Math.abs(currentDistance - distance) < threshold && currentDistance > 0) {
              // Use all pairs as reference, not just the first one
              pairs.forEach(pair => {
                matches.push({
                  axis: 'horizontal',
                  distance,
                  referenceStart: pair.start,
                  referenceEnd: pair.end,
                  referenceElementIds: pair.ids,
                  currentStart: otherBounds.maxX,
                  currentEnd: currentBounds.minX,
                  currentElementId: elementId,
                });
              });
            }

            // Check if current element is to the left of this element
            const currentDistance2 = otherBounds.minX - currentBounds.maxX;
            if (Math.abs(currentDistance2 - distance) < threshold && currentDistance2 > 0) {
              // Use all pairs as reference, not just the first one
              pairs.forEach(pair => {
                matches.push({
                  axis: 'horizontal',
                  distance,
                  referenceStart: pair.start,
                  referenceEnd: pair.end,
                  referenceElementIds: pair.ids,
                  currentStart: currentBounds.maxX,
                  currentEnd: otherBounds.minX,
                  currentElementId: elementId,
                });
              });
            }
          });
        }
      });

      // === VERTICAL DISTANCES ===
      // Filter elements that are in the vertical band (X range overlaps with current element)
      const verticalBandElements = Array.from(elementBounds.entries()).filter(
        ([, bounds]) => rangesOverlap(currentBounds.minX, currentBounds.maxX, bounds.minX, bounds.maxX)
      );

      // Find vertical distance patterns only among elements in the vertical band
      const verticalDistances = new Map<number, Array<{ start: number; end: number; ids: [string, string] }>>();
      
      const sortedByY = verticalBandElements.sort((a, b) => a[1].minY - b[1].minY);
      
      for (let i = 0; i < sortedByY.length - 1; i++) {
        const [id1, bounds1] = sortedByY[i];
        const [id2, bounds2] = sortedByY[i + 1];
        
        // Distance between bottom edge of first and top edge of second
        const distance = Math.round(bounds2.minY - bounds1.maxY);
        
        if (distance > 0) {
          if (!verticalDistances.has(distance)) {
            verticalDistances.set(distance, []);
          }
          verticalDistances.get(distance)!.push({
            start: bounds1.maxY,
            end: bounds2.minY,
            ids: [id1, id2]
          });
        }
      }

      // Check if current element matches any vertical distance
      verticalDistances.forEach((pairs, distance) => {
        if (pairs.length > 0) {
          // Check distance from any element in the band to the current one
          sortedByY.forEach(([, otherBounds]) => {
            // Check if current element is below this element
            const currentDistance = currentBounds.minY - otherBounds.maxY;
            if (Math.abs(currentDistance - distance) < threshold && currentDistance > 0) {
              // Use all pairs as reference, not just the first one
              pairs.forEach(pair => {
                matches.push({
                  axis: 'vertical',
                  distance,
                  referenceStart: pair.start,
                  referenceEnd: pair.end,
                  referenceElementIds: pair.ids,
                  currentStart: otherBounds.maxY,
                  currentEnd: currentBounds.minY,
                  currentElementId: elementId,
                });
              });
            }

            // Check if current element is above this element
            const currentDistance2 = otherBounds.minY - currentBounds.maxY;
            if (Math.abs(currentDistance2 - distance) < threshold && currentDistance2 > 0) {
              // Use all pairs as reference, not just the first one
              pairs.forEach(pair => {
                matches.push({
                  axis: 'vertical',
                  distance,
                  referenceStart: pair.start,
                  referenceEnd: pair.end,
                  referenceElementIds: pair.ids,
                  currentStart: currentBounds.maxY,
                  currentEnd: otherBounds.minY,
                  currentElementId: elementId,
                });
              });
            }
          });
        }
      });

      return matches;
    },

    // Check if movement should snap to guidelines
    // Returns adjusted delta and updates sticky state
    checkStickySnap: (
      deltaX: number, 
      deltaY: number, 
      projectedBounds: { minX: number; minY: number; maxX: number; maxY: number }
    ) => {
      const state = get();
      const { guidelines } = state;
      const fullState = get() as unknown as { viewport: { zoom: number; panX: number; panY: number } };
      const { viewport } = fullState;

      if (!guidelines.enabled || !viewport) {
        return { x: deltaX, y: deltaY, snapped: false };
      }

      const snapThreshold = guidelines.snapThreshold / viewport.zoom;
      const stickyThreshold = snapThreshold * 2; // Threshold to break out of sticky
      
      let snapOffsetX = 0;
      let snapOffsetY = 0;
      let hasSnapX = false;
      let hasSnapY = false;

      // Check alignment guidelines for snap
      guidelines.currentMatches.forEach((match: GuidelineMatch) => {
        if (match.type === 'left') {
          const diff = match.position - projectedBounds.minX;
          if (Math.abs(diff) < snapThreshold) {
            snapOffsetX = diff;
            hasSnapX = true;
          }
        } else if (match.type === 'right') {
          const diff = match.position - projectedBounds.maxX;
          if (Math.abs(diff) < snapThreshold) {
            snapOffsetX = diff;
            hasSnapX = true;
          }
        } else if (match.type === 'centerX') {
          const currentCenterX = (projectedBounds.minX + projectedBounds.maxX) / 2;
          const diff = match.position - currentCenterX;
          if (Math.abs(diff) < snapThreshold) {
            snapOffsetX = diff;
            hasSnapX = true;
          }
        } else if (match.type === 'top') {
          const diff = match.position - projectedBounds.minY;
          if (Math.abs(diff) < snapThreshold) {
            snapOffsetY = diff;
            hasSnapY = true;
          }
        } else if (match.type === 'bottom') {
          const diff = match.position - projectedBounds.maxY;
          if (Math.abs(diff) < snapThreshold) {
            snapOffsetY = diff;
            hasSnapY = true;
          }
        } else if (match.type === 'centerY') {
          const currentCenterY = (projectedBounds.minY + projectedBounds.maxY) / 2;
          const diff = match.position - currentCenterY;
          if (Math.abs(diff) < snapThreshold) {
            snapOffsetY = diff;
            hasSnapY = true;
          }
        }
      });

      // Check distance guidelines for snap (they already represent exact distances)
      guidelines.currentDistanceMatches.forEach((match: DistanceGuidelineMatch) => {
        if (match.axis === 'horizontal') {
          // For horizontal distances, we want the gap to match exactly
          // The match already represents the correct position, so we just need to check threshold
          const currentGap = match.currentEnd - match.currentStart;
          const diff = match.distance - currentGap;
          if (Math.abs(diff) < snapThreshold) {
            snapOffsetX = diff;
            hasSnapX = true;
          }
        } else if (match.axis === 'vertical') {
          const currentGap = match.currentEnd - match.currentStart;
          const diff = match.distance - currentGap;
          if (Math.abs(diff) < snapThreshold) {
            snapOffsetY = diff;
            hasSnapY = true;
          }
        }
      });

      // Handle sticky state
      const currentSticky = guidelines.stickyState;
      let newStickyOffsetX = currentSticky.stickyOffset.x;
      let newStickyOffsetY = currentSticky.stickyOffset.y;
      let isSticky = currentSticky.isSticky;

      if (hasSnapX || hasSnapY) {
        // We have a snap, enter or maintain sticky mode
        if (!isSticky) {
          // Just entered sticky mode
          newStickyOffsetX = 0;
          newStickyOffsetY = 0;
          isSticky = true;
        }
        
        // Accumulate the "mouse overflow" (movement that didn't translate to element movement)
        // When snapped, the actual delta is different from intended delta
        if (hasSnapX) {
          const intendedMovement = deltaX;
          const actualMovement = deltaX + snapOffsetX;
          newStickyOffsetX += (intendedMovement - actualMovement);
        }
        
        if (hasSnapY) {
          const intendedMovement = deltaY;
          const actualMovement = deltaY + snapOffsetY;
          newStickyOffsetY += (intendedMovement - actualMovement);
        }

        // Check if accumulated offset exceeds threshold (break out of sticky)
        if (Math.abs(newStickyOffsetX) > stickyThreshold) {
          hasSnapX = false;
          snapOffsetX = 0;
          newStickyOffsetX = 0;
        }
        
        if (Math.abs(newStickyOffsetY) > stickyThreshold) {
          hasSnapY = false;
          snapOffsetY = 0;
          newStickyOffsetY = 0;
        }
        
        // If both axes broke free, exit sticky mode
        if (!hasSnapX && !hasSnapY) {
          isSticky = false;
        }

        // Update sticky state
        set(current => ({
          guidelines: {
            ...current.guidelines,
            stickyState: {
              isSticky,
              stickyOffset: { x: newStickyOffsetX, y: newStickyOffsetY },
              lastStickyTime: Date.now(),
            },
          },
        }));
      } else if (isSticky) {
        // No snap but still sticky, reset
        set(current => ({
          guidelines: {
            ...current.guidelines,
            stickyState: {
              isSticky: false,
              stickyOffset: { x: 0, y: 0 },
              lastStickyTime: 0,
            },
          },
        }));
      }

      // Return adjusted delta
      return {
        x: hasSnapX ? deltaX + snapOffsetX : deltaX,
        y: hasSnapY ? deltaY + snapOffsetY : deltaY,
        snapped: hasSnapX || hasSnapY,
      };
    },

    // Clear all guidelines
    clearGuidelines: () => {
      set(current => ({
        guidelines: {
          ...current.guidelines,
          currentMatches: [],
          currentDistanceMatches: [],
          stickyState: {
            isSticky: false,
            stickyOffset: { x: 0, y: 0 },
            lastStickyTime: 0,
          },
        },
      }));
    },
  };
};

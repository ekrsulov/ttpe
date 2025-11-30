import type { StateCreator } from 'zustand';
import type { PathData } from '../../types';
import { rangesOverlap, calculateElementBoundsMap } from '../../utils/guidelinesHelpers';
import {
  type GuidelinesState,
  type GuidelineMatch,
  type DistanceGuidelineMatch,
  type SizeMatch,
  type AngleSnapMatch,
  type ManualGuide,
  type HoverMeasurement,
  type Bounds,
  DEFAULT_GUIDELINES_CONFIG,
  COMMON_ANGLES,
} from './types';

export type { GuidelineMatch, DistanceGuidelineMatch, SizeMatch, AngleSnapMatch, ManualGuide, HoverMeasurement } from './types';

export interface GuidelinesPluginSlice {
  // State
  guidelines: GuidelinesState;

  // Actions - State updates
  updateGuidelinesState: (state: Partial<GuidelinesState>) => void;
  
  // Manual guides management
  addManualGuide: (type: 'horizontal' | 'vertical', position: number, frameId?: string | null) => string;
  removeManualGuide: (guideId: string) => void;
  updateManualGuide: (guideId: string, updates: Partial<ManualGuide>) => void;
  clearManualGuides: () => void;
  
  // Guideline finding
  findAlignmentGuidelines: (elementId: string, currentBounds: Bounds) => GuidelineMatch[];
  findDistanceGuidelines: (elementId: string, currentBounds: Bounds, alignmentMatches?: GuidelineMatch[]) => DistanceGuidelineMatch[];
  findSizeMatches: (elementId: string, currentBounds: Bounds) => SizeMatch[];
  findAngleSnap: (angle: number) => AngleSnapMatch | null;
  
  // Hover measurements
  calculateHoverMeasurements: (elementId: string) => HoverMeasurement[];
  setHoveredElement: (elementId: string | null) => void;
  setAltPressed: (pressed: boolean) => void;
  
  // Snapping
  checkStickySnap: (
    deltaX: number, 
    deltaY: number, 
    projectedBounds: Bounds
  ) => { x: number; y: number; snapped: boolean };
  snapAngle: (angle: number) => number;
  
  // Resize snapping
  snapResizeBounds: (
    elementId: string,
    newBounds: Bounds,
    originalBounds: Bounds,
    handle: string
  ) => { 
    snappedBounds: Bounds; 
    didSnap: boolean; 
    snapX: number | null; 
    snapY: number | null;
  };
  
  // Ruler interaction
  startDraggingGuide: (type: 'horizontal' | 'vertical', position: number) => void;
  updateDraggingGuide: (position: number) => void;
  finishDraggingGuide: () => void;
  cancelDraggingGuide: () => void;
  
  // Cleanup
  clearGuidelines: () => void;
}

// Generate unique ID for guides
let guideIdCounter = 0;
const generateGuideId = () => `guide-${Date.now()}-${guideIdCounter++}`;

export const createGuidelinesPluginSlice: StateCreator<GuidelinesPluginSlice, [], [], GuidelinesPluginSlice> = (set, get) => {
  return {
    // Initial state
    guidelines: {
      ...DEFAULT_GUIDELINES_CONFIG,
      manualGuides: [],
      currentMatches: [],
      currentDistanceMatches: [],
      currentSizeMatches: [],
      currentAngleSnap: null,
      hoverMeasurements: [],
      isAltPressed: false,
      hoveredElementId: null,
      stickyState: {
        isSticky: false,
        stickyOffset: { x: 0, y: 0 },
        lastStickyTime: 0,
      },
      isDraggingGuide: false,
      draggingGuideType: null,
      draggingGuidePosition: null,
    },

    // Actions
    updateGuidelinesState: (state) => {
      set((current) => ({
        guidelines: { ...current.guidelines, ...state },
      }));
    },

    // Manual guides management
    addManualGuide: (type, position, frameId = null) => {
      const id = generateGuideId();
      const state = get();
      const newGuide: ManualGuide = {
        id,
        type,
        position,
        color: state.guidelines.manualGuideColor,
        locked: false,
        frameId,
      };
      
      set((current) => ({
        guidelines: {
          ...current.guidelines,
          manualGuides: [...current.guidelines.manualGuides, newGuide],
        },
      }));
      
      return id;
    },

    removeManualGuide: (guideId) => {
      set((current) => ({
        guidelines: {
          ...current.guidelines,
          manualGuides: current.guidelines.manualGuides.filter(g => g.id !== guideId),
        },
      }));
    },

    updateManualGuide: (guideId, updates) => {
      set((current) => ({
        guidelines: {
          ...current.guidelines,
          manualGuides: current.guidelines.manualGuides.map(g =>
            g.id === guideId ? { ...g, ...updates } : g
          ),
        },
      }));
    },

    clearManualGuides: () => {
      set((current) => ({
        guidelines: {
          ...current.guidelines,
          manualGuides: [],
        },
      }));
    },

    // Find alignment guidelines (edges and centers)
    findAlignmentGuidelines: (elementId, currentBounds) => {
      const state = get();
      
      if (!state.guidelines.enabled) {
        return [];
      }

      const matches: GuidelineMatch[] = [];
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

      // Priority: center > edges, manual guides have same priority as element centers
      const potentialMatches: Array<{ 
        match: GuidelineMatch; 
        priority: number; // 1 = center/manual, 2 = edge
      }> = [];

      // Check manual guides first (if enabled)
      if (state.guidelines.snapToManualGuides && state.guidelines.manualGuidesEnabled) {
        state.guidelines.manualGuides.forEach(guide => {
          if (guide.locked) return;
          
          if (guide.type === 'vertical') {
            // Check left edge
            if (state.guidelines.snapToEdges && Math.abs(currentBounds.minX - guide.position) < threshold) {
              potentialMatches.push({
                match: { type: 'left', position: guide.position, elementIds: [], isManualGuide: true, guideId: guide.id },
                priority: 1
              });
            }
            // Check right edge
            if (state.guidelines.snapToEdges && Math.abs(currentBounds.maxX - guide.position) < threshold) {
              potentialMatches.push({
                match: { type: 'right', position: guide.position, elementIds: [], isManualGuide: true, guideId: guide.id },
                priority: 1
              });
            }
            // Check center
            if (state.guidelines.snapToCenters && Math.abs(currentCenterX - guide.position) < threshold) {
              potentialMatches.push({
                match: { type: 'centerX', position: guide.position, elementIds: [], isManualGuide: true, guideId: guide.id },
                priority: 1
              });
            }
          } else {
            // Horizontal guide
            if (state.guidelines.snapToEdges && Math.abs(currentBounds.minY - guide.position) < threshold) {
              potentialMatches.push({
                match: { type: 'top', position: guide.position, elementIds: [], isManualGuide: true, guideId: guide.id },
                priority: 1
              });
            }
            if (state.guidelines.snapToEdges && Math.abs(currentBounds.maxY - guide.position) < threshold) {
              potentialMatches.push({
                match: { type: 'bottom', position: guide.position, elementIds: [], isManualGuide: true, guideId: guide.id },
                priority: 1
              });
            }
            if (state.guidelines.snapToCenters && Math.abs(currentCenterY - guide.position) < threshold) {
              potentialMatches.push({
                match: { type: 'centerY', position: guide.position, elementIds: [], isManualGuide: true, guideId: guide.id },
                priority: 1
              });
            }
          }
        });
      }

      // Calculate viewport center
      if (state.guidelines.snapToViewportCenter) {
        const viewportCenterX = (window.innerWidth / 2 - viewport.panX) / viewport.zoom;
        const viewportCenterY = (window.innerHeight / 2 - viewport.panY) / viewport.zoom;

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
      }

      // Use centralized bounds calculation with caching
      const boundsMap = calculateElementBoundsMap(
        elements,
        [elementId],
        viewport.zoom,
        { includeStroke: true }
      );

      // Check against all other elements using cached bounds
      boundsMap.forEach((boundsInfo) => {
        const { id: refElementId, bounds, centerX, centerY } = boundsInfo;

        // === HORIZONTAL ALIGNMENTS ===
        
        // Center X alignment (highest priority)
        if (state.guidelines.snapToCenters && Math.abs(currentCenterX - centerX) < threshold) {
          const existing = potentialMatches.find(
            m => m.match.type === 'centerX' && !m.match.isManualGuide && Math.abs(m.match.position - centerX) < threshold
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
        
        if (state.guidelines.snapToEdges) {
          // Left edge alignment (edge-to-edge)
          if (Math.abs(currentBounds.minX - bounds.minX) < threshold) {
            const existing = potentialMatches.find(
              m => m.match.type === 'left' && !m.match.isManualGuide && Math.abs(m.match.position - bounds.minX) < threshold
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

          // Left edge entering/exiting from right
          if (Math.abs(currentBounds.minX - bounds.maxX) < threshold) {
            const existing = potentialMatches.find(
              m => m.match.type === 'left' && !m.match.isManualGuide && Math.abs(m.match.position - bounds.maxX) < threshold
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

          // Right edge alignment
          if (Math.abs(currentBounds.maxX - bounds.maxX) < threshold) {
            const existing = potentialMatches.find(
              m => m.match.type === 'right' && !m.match.isManualGuide && Math.abs(m.match.position - bounds.maxX) < threshold
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

          // Right edge entering/exiting from left
          if (Math.abs(currentBounds.maxX - bounds.minX) < threshold) {
            const existing = potentialMatches.find(
              m => m.match.type === 'right' && !m.match.isManualGuide && Math.abs(m.match.position - bounds.minX) < threshold
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
        }

        // === VERTICAL ALIGNMENTS ===
        
        // Center Y alignment (highest priority)
        if (state.guidelines.snapToCenters && Math.abs(currentCenterY - centerY) < threshold) {
          const existing = potentialMatches.find(
            m => m.match.type === 'centerY' && !m.match.isManualGuide && Math.abs(m.match.position - centerY) < threshold
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

        if (state.guidelines.snapToEdges) {
          // Top edge alignment
          if (Math.abs(currentBounds.minY - bounds.minY) < threshold) {
            const existing = potentialMatches.find(
              m => m.match.type === 'top' && !m.match.isManualGuide && Math.abs(m.match.position - bounds.minY) < threshold
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

          // Top edge entering/exiting from bottom
          if (Math.abs(currentBounds.minY - bounds.maxY) < threshold) {
            const existing = potentialMatches.find(
              m => m.match.type === 'top' && !m.match.isManualGuide && Math.abs(m.match.position - bounds.maxY) < threshold
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

          // Bottom edge alignment
          if (Math.abs(currentBounds.maxY - bounds.maxY) < threshold) {
            const existing = potentialMatches.find(
              m => m.match.type === 'bottom' && !m.match.isManualGuide && Math.abs(m.match.position - bounds.maxY) < threshold
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

          // Bottom edge entering/exiting from top
          if (Math.abs(currentBounds.maxY - bounds.minY) < threshold) {
            const existing = potentialMatches.find(
              m => m.match.type === 'bottom' && !m.match.isManualGuide && Math.abs(m.match.position - bounds.minY) < threshold
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
        }
      });

      // Prioritization logic
      const horizontalMatches = potentialMatches.filter(
        m => m.match.type === 'left' || m.match.type === 'right' || m.match.type === 'centerX'
      );
      const verticalMatches = potentialMatches.filter(
        m => m.match.type === 'top' || m.match.type === 'bottom' || m.match.type === 'centerY'
      );

      // Get the highest priority horizontal match
      if (horizontalMatches.length > 0) {
        horizontalMatches.sort((a, b) => a.priority - b.priority);
        matches.push(horizontalMatches[0].match);
      }

      // Get the highest priority vertical match
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

      const boundsMap = calculateElementBoundsMap(
        elements,
        [elementId],
        viewport.zoom,
        { includeStroke: true }
      );

      // Special case: when an alignment guideline involves exactly 2 elements
      alignmentMatches.forEach(match => {
        if (match.elementIds.length === 1 && !match.isManualGuide) {
          const referenceElementId = match.elementIds[0];
          const refBoundsInfo = boundsMap.get(referenceElementId);
          
          if (refBoundsInfo) {
            const refBounds = refBoundsInfo.bounds;
            const isVerticalAlignment = match.type === 'centerX' || match.type === 'left' || match.type === 'right';
            const isHorizontalAlignment = match.type === 'centerY' || match.type === 'top' || match.type === 'bottom';

            if (isVerticalAlignment) {
              const verticalGap = Math.min(
                Math.abs(currentBounds.minY - refBounds.maxY),
                Math.abs(refBounds.minY - currentBounds.maxY)
              );
              
              const distance = Math.round(verticalGap);
              if (distance > 0) {
                if (currentBounds.minY > refBounds.maxY) {
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
              const horizontalGap = Math.min(
                Math.abs(currentBounds.minX - refBounds.maxX),
                Math.abs(refBounds.minX - currentBounds.maxX)
              );
              
              const distance = Math.round(horizontalGap);
              if (distance > 0) {
                if (currentBounds.minX > refBounds.maxX) {
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

      if (matches.length > 0 && boundsMap.size < 2) {
        return matches;
      }

      if (boundsMap.size < 2) {
        return [];
      }

      // Convert boundsMap to simple format
      const elementBounds = new Map<string, Bounds>();
      boundsMap.forEach((info, id) => {
        elementBounds.set(id, info.bounds);
      });

      // === HORIZONTAL DISTANCES ===
      const horizontalBandElements = Array.from(elementBounds.entries()).filter(
        ([, bounds]) => rangesOverlap(currentBounds.minY, currentBounds.maxY, bounds.minY, bounds.maxY)
      );

      const horizontalDistances = new Map<number, Array<{ start: number; end: number; ids: [string, string] }>>();
      const sortedByX = horizontalBandElements.sort((a, b) => a[1].minX - b[1].minX);
      
      for (let i = 0; i < sortedByX.length - 1; i++) {
        const [id1, bounds1] = sortedByX[i];
        const [id2, bounds2] = sortedByX[i + 1];
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

      horizontalDistances.forEach((pairs, distance) => {
        if (pairs.length > 0) {
          sortedByX.forEach(([, otherBounds]) => {
            const currentDistance = currentBounds.minX - otherBounds.maxX;
            if (Math.abs(currentDistance - distance) < threshold && currentDistance > 0) {
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

            const currentDistance2 = otherBounds.minX - currentBounds.maxX;
            if (Math.abs(currentDistance2 - distance) < threshold && currentDistance2 > 0) {
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
      const verticalBandElements = Array.from(elementBounds.entries()).filter(
        ([, bounds]) => rangesOverlap(currentBounds.minX, currentBounds.maxX, bounds.minX, bounds.maxX)
      );

      const verticalDistances = new Map<number, Array<{ start: number; end: number; ids: [string, string] }>>();
      const sortedByY = verticalBandElements.sort((a, b) => a[1].minY - b[1].minY);
      
      for (let i = 0; i < sortedByY.length - 1; i++) {
        const [id1, bounds1] = sortedByY[i];
        const [id2, bounds2] = sortedByY[i + 1];
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

      verticalDistances.forEach((pairs, distance) => {
        if (pairs.length > 0) {
          sortedByY.forEach(([, otherBounds]) => {
            const currentDistance = currentBounds.minY - otherBounds.maxY;
            if (Math.abs(currentDistance - distance) < threshold && currentDistance > 0) {
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

            const currentDistance2 = otherBounds.minY - currentBounds.maxY;
            if (Math.abs(currentDistance2 - distance) < threshold && currentDistance2 > 0) {
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

    // Find size matches
    findSizeMatches: (elementId, currentBounds) => {
      const state = get();
      
      if (!state.guidelines.enabled || !state.guidelines.sizeMatchingEnabled) {
        return [];
      }

      const matches: SizeMatch[] = [];
      const fullState = get() as unknown as { 
        elements: Array<{ id: string; type: string; data: PathData }>; 
        viewport: { zoom: number; panX: number; panY: number }; 
      };
      const { elements, viewport } = fullState;
      
      if (!elements || !viewport) {
        return [];
      }

      const threshold = state.guidelines.snapThreshold / viewport.zoom;
      const currentWidth = currentBounds.maxX - currentBounds.minX;
      const currentHeight = currentBounds.maxY - currentBounds.minY;

      const boundsMap = calculateElementBoundsMap(
        elements,
        [elementId],
        viewport.zoom,
        { includeStroke: true }
      );

      const widthMatches: string[] = [];
      const heightMatches: string[] = [];

      boundsMap.forEach((boundsInfo) => {
        const refWidth = boundsInfo.bounds.maxX - boundsInfo.bounds.minX;
        const refHeight = boundsInfo.bounds.maxY - boundsInfo.bounds.minY;

        if (Math.abs(currentWidth - refWidth) < threshold) {
          widthMatches.push(boundsInfo.id);
        }

        if (Math.abs(currentHeight - refHeight) < threshold) {
          heightMatches.push(boundsInfo.id);
        }
      });

      if (widthMatches.length > 0) {
        matches.push({
          type: 'width',
          value: currentWidth,
          matchingElementIds: widthMatches,
          currentElementId: elementId,
        });
      }

      if (heightMatches.length > 0) {
        matches.push({
          type: 'height',
          value: currentHeight,
          matchingElementIds: heightMatches,
          currentElementId: elementId,
        });
      }

      return matches;
    },

    // Find angle snap
    findAngleSnap: (angle) => {
      const state = get();
      
      if (!state.guidelines.enabled || !state.guidelines.angleSnapEnabled) {
        return null;
      }

      const threshold = state.guidelines.angleSnapThreshold;
      
      // Normalize angle to 0-360
      let normalizedAngle = angle % 360;
      if (normalizedAngle < 0) normalizedAngle += 360;

      for (const commonAngle of COMMON_ANGLES) {
        const diff = Math.abs(normalizedAngle - commonAngle);
        const wrappedDiff = Math.min(diff, 360 - diff);
        
        if (wrappedDiff < threshold) {
          return {
            angle: normalizedAngle,
            snappedAngle: commonAngle === 360 ? 0 : commonAngle,
            originalAngle: angle,
          };
        }
      }

      return null;
    },

    // Calculate hover measurements
    calculateHoverMeasurements: (elementId) => {
      const state = get();
      
      if (!state.guidelines.enabled || !state.guidelines.isAltPressed) {
        return [];
      }

      const measurements: HoverMeasurement[] = [];
      const fullState = get() as unknown as { 
        elements: Array<{ id: string; type: string; data: PathData }>; 
        viewport: { zoom: number; panX: number; panY: number }; 
      };
      const { elements, viewport } = fullState;
      
      if (!elements || !viewport) {
        return [];
      }

      const boundsMap = calculateElementBoundsMap(
        elements,
        [],
        viewport.zoom,
        { includeStroke: true }
      );

      const currentBoundsInfo = boundsMap.get(elementId);
      if (!currentBoundsInfo) {
        return [];
      }

      const currentBounds = currentBoundsInfo.bounds;

      // Measure to other elements
      boundsMap.forEach((otherBoundsInfo, otherId) => {
        if (otherId === elementId) return;

        const otherBounds = otherBoundsInfo.bounds;

        // Check if in horizontal band
        if (rangesOverlap(currentBounds.minY, currentBounds.maxY, otherBounds.minY, otherBounds.maxY)) {
          const overlapMinY = Math.max(currentBounds.minY, otherBounds.minY);
          const overlapMaxY = Math.min(currentBounds.maxY, otherBounds.maxY);
          const perpendicularY = (overlapMinY + overlapMaxY) / 2;

          // Distance to the right
          if (otherBounds.minX > currentBounds.maxX) {
            measurements.push({
              elementId,
              targetId: otherId,
              axis: 'horizontal',
              distance: Math.round(otherBounds.minX - currentBounds.maxX),
              start: currentBounds.maxX,
              end: otherBounds.minX,
              perpendicularPosition: perpendicularY,
            });
          }
          // Distance to the left
          else if (currentBounds.minX > otherBounds.maxX) {
            measurements.push({
              elementId,
              targetId: otherId,
              axis: 'horizontal',
              distance: Math.round(currentBounds.minX - otherBounds.maxX),
              start: otherBounds.maxX,
              end: currentBounds.minX,
              perpendicularPosition: perpendicularY,
            });
          }
        }

        // Check if in vertical band
        if (rangesOverlap(currentBounds.minX, currentBounds.maxX, otherBounds.minX, otherBounds.maxX)) {
          const overlapMinX = Math.max(currentBounds.minX, otherBounds.minX);
          const overlapMaxX = Math.min(currentBounds.maxX, otherBounds.maxX);
          const perpendicularX = (overlapMinX + overlapMaxX) / 2;

          // Distance below
          if (otherBounds.minY > currentBounds.maxY) {
            measurements.push({
              elementId,
              targetId: otherId,
              axis: 'vertical',
              distance: Math.round(otherBounds.minY - currentBounds.maxY),
              start: currentBounds.maxY,
              end: otherBounds.minY,
              perpendicularPosition: perpendicularX,
            });
          }
          // Distance above
          else if (currentBounds.minY > otherBounds.maxY) {
            measurements.push({
              elementId,
              targetId: otherId,
              axis: 'vertical',
              distance: Math.round(currentBounds.minY - otherBounds.maxY),
              start: otherBounds.maxY,
              end: currentBounds.minY,
              perpendicularPosition: perpendicularX,
            });
          }
        }
      });

      // Measure to manual guides
      if (state.guidelines.manualGuidesEnabled) {
        state.guidelines.manualGuides.forEach(guide => {
          if (guide.type === 'vertical') {
            const perpendicularY = (currentBounds.minY + currentBounds.maxY) / 2;
            
            if (guide.position > currentBounds.maxX) {
              measurements.push({
                elementId,
                targetId: 'guide',
                guideId: guide.id,
                axis: 'horizontal',
                distance: Math.round(guide.position - currentBounds.maxX),
                start: currentBounds.maxX,
                end: guide.position,
                perpendicularPosition: perpendicularY,
              });
            } else if (guide.position < currentBounds.minX) {
              measurements.push({
                elementId,
                targetId: 'guide',
                guideId: guide.id,
                axis: 'horizontal',
                distance: Math.round(currentBounds.minX - guide.position),
                start: guide.position,
                end: currentBounds.minX,
                perpendicularPosition: perpendicularY,
              });
            }
          } else {
            const perpendicularX = (currentBounds.minX + currentBounds.maxX) / 2;
            
            if (guide.position > currentBounds.maxY) {
              measurements.push({
                elementId,
                targetId: 'guide',
                guideId: guide.id,
                axis: 'vertical',
                distance: Math.round(guide.position - currentBounds.maxY),
                start: currentBounds.maxY,
                end: guide.position,
                perpendicularPosition: perpendicularX,
              });
            } else if (guide.position < currentBounds.minY) {
              measurements.push({
                elementId,
                targetId: 'guide',
                guideId: guide.id,
                axis: 'vertical',
                distance: Math.round(currentBounds.minY - guide.position),
                start: guide.position,
                end: currentBounds.minY,
                perpendicularPosition: perpendicularX,
              });
            }
          }
        });
      }

      return measurements;
    },

    setHoveredElement: (elementId) => {
      const state = get();
      
      if (elementId && state.guidelines.isAltPressed) {
        const measurements = state.calculateHoverMeasurements(elementId);
        set((current) => ({
          guidelines: {
            ...current.guidelines,
            hoveredElementId: elementId,
            hoverMeasurements: measurements,
          },
        }));
      } else {
        set((current) => ({
          guidelines: {
            ...current.guidelines,
            hoveredElementId: elementId,
            hoverMeasurements: [],
          },
        }));
      }
    },

    setAltPressed: (pressed) => {
      set((current) => {
        const newState = {
          guidelines: {
            ...current.guidelines,
            isAltPressed: pressed,
          },
        };
        
        // Recalculate measurements if we have a hovered element
        if (pressed && current.guidelines.hoveredElementId) {
          const measurements = get().calculateHoverMeasurements(current.guidelines.hoveredElementId);
          newState.guidelines.hoverMeasurements = measurements;
        } else {
          newState.guidelines.hoverMeasurements = [];
        }
        
        return newState;
      });
    },

    // Check if movement should snap to guidelines
    checkStickySnap: (deltaX, deltaY, projectedBounds) => {
      const state = get();
      const { guidelines } = state;
      const fullState = get() as unknown as { viewport: { zoom: number; panX: number; panY: number } };
      const { viewport } = fullState;

      if (!guidelines.enabled || !viewport) {
        return { x: deltaX, y: deltaY, snapped: false };
      }

      const snapThreshold = guidelines.snapThreshold / viewport.zoom;
      const stickyThreshold = snapThreshold * 2;
      
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

      // Check distance guidelines for snap
      guidelines.currentDistanceMatches.forEach((match: DistanceGuidelineMatch) => {
        if (match.axis === 'horizontal') {
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
        if (!isSticky) {
          newStickyOffsetX = 0;
          newStickyOffsetY = 0;
          isSticky = true;
        }
        
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
        
        if (!hasSnapX && !hasSnapY) {
          isSticky = false;
        }

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

      return {
        x: hasSnapX ? deltaX + snapOffsetX : deltaX,
        y: hasSnapY ? deltaY + snapOffsetY : deltaY,
        snapped: hasSnapX || hasSnapY,
      };
    },

    // Snap angle to common angles
    snapAngle: (angle) => {
      const state = get();
      const angleSnap = state.findAngleSnap(angle);
      
      if (angleSnap) {
        set(current => ({
          guidelines: {
            ...current.guidelines,
            currentAngleSnap: angleSnap,
          },
        }));
        return angleSnap.snappedAngle;
      }
      
      set(current => ({
        guidelines: {
          ...current.guidelines,
          currentAngleSnap: null,
        },
      }));
      
      return angle;
    },

    // Snap resize bounds to guidelines
    snapResizeBounds: (elementId, newBounds, _originalBounds, handle) => {
      const state = get();
      const { guidelines } = state;
      const fullState = get() as unknown as { 
        elements: { id: string; type: string; data: unknown }[];
        viewport: { zoom: number; panX: number; panY: number };
      };

      if (!guidelines.enabled) {
        return { 
          snappedBounds: newBounds, 
          didSnap: false, 
          snapX: null, 
          snapY: null 
        };
      }

      const { elements, viewport } = fullState;
      if (!elements || !viewport) {
        return { 
          snappedBounds: newBounds, 
          didSnap: false, 
          snapX: null, 
          snapY: null 
        };
      }

      const snapThreshold = guidelines.snapThreshold / viewport.zoom;
      
      // Calculate element bounds map excluding current element
      const elementBoundsMap = calculateElementBoundsMap(elements, [elementId], viewport.zoom);
      
      const snappedBounds = { ...newBounds };
      let didSnap = false;
      let snapX: number | null = null;
      let snapY: number | null = null;
      
      // Collect snap targets from other elements and manual guides
      const horizontalTargets: number[] = [];
      const verticalTargets: number[] = [];
      
      // Add targets from other elements
      elementBoundsMap.forEach((boundsInfo, id) => {
        if (id === elementId) return;
        const b = boundsInfo.bounds;
        horizontalTargets.push(b.minX, b.maxX, (b.minX + b.maxX) / 2);
        verticalTargets.push(b.minY, b.maxY, (b.minY + b.maxY) / 2);
      });
      
      // Add targets from manual guides
      guidelines.manualGuides.forEach((guide: ManualGuide) => {
        if (!guide.locked) {
          if (guide.type === 'vertical') {
            horizontalTargets.push(guide.position);
          } else {
            verticalTargets.push(guide.position);
          }
        }
      });
      
      // Determine which edges to snap based on handle
      const handleLower = handle.toLowerCase();
      const snapLeft = handleLower.includes('l') || handleLower.includes('left');
      const snapRight = handleLower.includes('r') || handleLower.includes('right') || handleLower.includes('br') || handleLower.includes('tr');
      const snapTop = handleLower.includes('t') || handleLower.includes('top');
      const snapBottom = handleLower.includes('b') || handleLower.includes('bottom');
      
      // Check horizontal snapping (X axis)
      if (snapLeft) {
        for (const target of horizontalTargets) {
          const diff = target - newBounds.minX;
          if (Math.abs(diff) < snapThreshold) {
            snappedBounds.minX = target;
            snapX = target;
            didSnap = true;
            break;
          }
        }
      } else if (snapRight) {
        for (const target of horizontalTargets) {
          const diff = target - newBounds.maxX;
          if (Math.abs(diff) < snapThreshold) {
            snappedBounds.maxX = target;
            snapX = target;
            didSnap = true;
            break;
          }
        }
      }
      
      // Check vertical snapping (Y axis)
      if (snapTop) {
        for (const target of verticalTargets) {
          const diff = target - newBounds.minY;
          if (Math.abs(diff) < snapThreshold) {
            snappedBounds.minY = target;
            snapY = target;
            didSnap = true;
            break;
          }
        }
      } else if (snapBottom) {
        for (const target of verticalTargets) {
          const diff = target - newBounds.maxY;
          if (Math.abs(diff) < snapThreshold) {
            snappedBounds.maxY = target;
            snapY = target;
            didSnap = true;
            break;
          }
        }
      }
      
      // For corner handles, check center snapping too
      if (handleLower.includes('corner')) {
        const newCenterX = (snappedBounds.minX + snappedBounds.maxX) / 2;
        const newCenterY = (snappedBounds.minY + snappedBounds.maxY) / 2;
        const newWidth = snappedBounds.maxX - snappedBounds.minX;
        const newHeight = snappedBounds.maxY - snappedBounds.minY;
        
        // Check center X alignment
        for (const target of horizontalTargets) {
          const diff = target - newCenterX;
          if (Math.abs(diff) < snapThreshold && !snapX) {
            // Adjust both edges to maintain width while centering
            snappedBounds.minX = target - newWidth / 2;
            snappedBounds.maxX = target + newWidth / 2;
            snapX = target;
            didSnap = true;
            break;
          }
        }
        
        // Check center Y alignment
        for (const target of verticalTargets) {
          const diff = target - newCenterY;
          if (Math.abs(diff) < snapThreshold && !snapY) {
            // Adjust both edges to maintain height while centering
            snappedBounds.minY = target - newHeight / 2;
            snappedBounds.maxY = target + newHeight / 2;
            snapY = target;
            didSnap = true;
            break;
          }
        }
      }
      
      // Update guidelines state with snap info if we snapped
      if (didSnap) {
        const matches = state.findAlignmentGuidelines(elementId, snappedBounds);
        set(current => ({
          guidelines: {
            ...current.guidelines,
            currentMatches: matches,
          },
        }));
      }
      
      return { snappedBounds, didSnap, snapX, snapY };
    },

    // Ruler interaction
    startDraggingGuide: (type, position) => {
      set(current => ({
        guidelines: {
          ...current.guidelines,
          isDraggingGuide: true,
          draggingGuideType: type,
          draggingGuidePosition: position,
        },
      }));
    },

    updateDraggingGuide: (position) => {
      set(current => ({
        guidelines: {
          ...current.guidelines,
          draggingGuidePosition: position,
        },
      }));
    },

    finishDraggingGuide: () => {
      const state = get();
      const { guidelines } = state;
      
      if (guidelines.isDraggingGuide && guidelines.draggingGuideType && guidelines.draggingGuidePosition !== null) {
        state.addManualGuide(guidelines.draggingGuideType, guidelines.draggingGuidePosition);
      }
      
      set(current => ({
        guidelines: {
          ...current.guidelines,
          isDraggingGuide: false,
          draggingGuideType: null,
          draggingGuidePosition: null,
        },
      }));
    },

    cancelDraggingGuide: () => {
      set(current => ({
        guidelines: {
          ...current.guidelines,
          isDraggingGuide: false,
          draggingGuideType: null,
          draggingGuidePosition: null,
        },
      }));
    },

    // Clear all guidelines
    clearGuidelines: () => {
      set(current => ({
        guidelines: {
          ...current.guidelines,
          currentMatches: [],
          currentDistanceMatches: [],
          currentSizeMatches: [],
          currentAngleSnap: null,
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

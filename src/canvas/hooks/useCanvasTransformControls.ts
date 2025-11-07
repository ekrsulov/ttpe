import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { TransformController, type TransformState, type TransformFeedback } from '../interactions/TransformController';
import { measurePath, measureSubpathBounds } from '../../utils/geometry';
import { getGroupBounds } from '../geometry/CanvasGeometryService';
import { transformCommands } from '../../utils/sharedTransformUtils';
import type { Point, PathData, CanvasElement, GroupElement } from '../../types';

export const useCanvasTransformControls = () => {
  const [transformState, setTransformState] = useState<TransformState>({
    isTransforming: false,
    transformStart: null,
    transformElementId: null,
    transformHandler: null,
    originalBounds: null,
    transformedBounds: null,
    initialTransform: null,
    originalElementData: null
  });

  // Use ref to avoid recreating callbacks when transformState changes
  const transformStateRef = useRef(transformState);
  useEffect(() => {
    transformStateRef.current = transformState;
  }, [transformState]);

  const [feedback, setFeedback] = useState<TransformFeedback>({
    rotation: { degrees: 0, visible: false, isShiftPressed: false, isMultipleOf15: false },
    resize: { deltaX: 0, deltaY: 0, visible: false, isShiftPressed: false, isMultipleOf10: false },
    shape: { width: 0, height: 0, visible: false, isShiftPressed: false, isMultipleOf10: false },
    pointPosition: { x: 0, y: 0, visible: false }
  });

  const transformController = useMemo(() => new TransformController(), []);

  // Helper function to calculate transform origin based on handler and bounds
  const calculateTransformOrigin = useCallback((
    handler: string,
    bounds: { minX: number; minY: number; maxX: number; maxY: number }
  ): { originX: number; originY: number } => {
    let originX = bounds.minX;
    let originY = bounds.minY;

    // For corner handles, origin is the opposite corner
    if (handler === 'corner-tl') {
      originX = bounds.maxX;
      originY = bounds.maxY;
    } else if (handler === 'corner-tr') {
      originX = bounds.minX;
      originY = bounds.maxY;
    } else if (handler === 'corner-bl') {
      originX = bounds.maxX;
      originY = bounds.minY;
    } else if (handler === 'corner-br') {
      originX = bounds.minX;
      originY = bounds.minY;
    } else if (handler === 'midpoint-t') {
      originX = (bounds.minX + bounds.maxX) / 2;
      originY = bounds.maxY;
    } else if (handler === 'midpoint-b') {
      originX = (bounds.minX + bounds.maxX) / 2;
      originY = bounds.minY;
    } else if (handler === 'midpoint-l') {
      originX = bounds.maxX;
      originY = (bounds.minY + bounds.maxY) / 2;
    } else if (handler === 'midpoint-r') {
      originX = bounds.minX;
      originY = (bounds.minY + bounds.maxY) / 2;
    } else {
      // For rotation or other handlers, use center
      originX = (bounds.minX + bounds.maxX) / 2;
      originY = (bounds.minY + bounds.maxY) / 2;
    }

    return { originX, originY };
  }, []);

  const startTransformation = useCallback((elementId: string, handler: string, point: Point) => {
    const { elements, selectedIds, viewport } = useCanvasStore.getState();
    const elementMap = new Map(elements.map(el => [el.id, el]));

    // Handle different types of transformations
    
    // Case 1: Subpath transformation
    if (elementId.startsWith('subpath:')) {
      const parts = elementId.split(':');
      const realElementId = parts[1];
      const subpathIndex = parseInt(parts[2]);
      
      const element = elements.find(el => el.id === realElementId);
      if (!element) return;

      const subpathBounds = measureSubpathBounds(
        (element.data as PathData).subPaths[subpathIndex],
        (element.data as PathData).strokeWidth ?? 1,
        1 // zoom
      );
      
      if (subpathBounds) {
        const newState = transformController.initializeTransform(element, elementId, handler, point, subpathBounds);
        setTransformState((prev: TransformState) => ({ ...prev, ...newState }));
      }
      return;
    }

    // Case 2: Group transformation
    if (elementId.startsWith('group:')) {
      const realGroupId = elementId.substring(6); // Remove 'group:' prefix
      const element = elementMap.get(realGroupId);
      
      if (!element || element.type !== 'group') {
        return;
      }

      const bounds = getGroupBounds(element as GroupElement, elementMap, viewport);
      if (bounds) {
        // Create a pseudo-element for transformation tracking with a rectangular path based on bounds
        const rectPath: import('../../types').Command[] = [
          { type: 'M', position: { x: bounds.minX, y: bounds.minY } },
          { type: 'L', position: { x: bounds.maxX, y: bounds.minY } },
          { type: 'L', position: { x: bounds.maxX, y: bounds.maxY } },
          { type: 'L', position: { x: bounds.minX, y: bounds.maxY } },
          { type: 'Z' }
        ];

        const pseudoElement: CanvasElement = {
          id: elementId,
          type: 'path',
          data: { 
            subPaths: [rectPath], 
            strokeWidth: 0,
            strokeColor: '#000000',
            strokeOpacity: 1,
            fillColor: 'none',
            fillOpacity: 1,
            transform: {
              scaleX: 1,
              scaleY: 1,
              rotation: 0,
              translateX: 0,
              translateY: 0
            }
          } as PathData,
          zIndex: 0
        };
        
        // Store original state of all descendant elements
        const originalElementsData = new Map<string, CanvasElement>();
        const collectDescendants = (groupEl: GroupElement) => {
          const childIds = (groupEl.data as { childIds: string[] }).childIds;
          childIds.forEach((childId) => {
            const child = elementMap.get(childId);
            if (child) {
              originalElementsData.set(childId, JSON.parse(JSON.stringify(child)));
              if (child.type === 'group') {
                collectDescendants(child as GroupElement);
              }
            }
          });
        };
        collectDescendants(element as GroupElement);
        
        const newState = transformController.initializeTransform(pseudoElement, elementId, handler, point, bounds);
        setTransformState((prev: TransformState) => ({ 
          ...prev, 
          ...newState,
          originalElementsData
        }));
      }
      return;
    }

    // Case 3: Multi-selection bbox transformation
    if (elementId === 'selection-bbox') {
      // Store all selected element IDs in the transform state
      // We'll handle this specially during transformation
      // For now, calculate combined bounds
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      selectedIds.forEach((id) => {
        const element = elementMap.get(id);
        if (!element) return;

        let bounds = null;
        if (element.type === 'group') {
          bounds = getGroupBounds(element as GroupElement, elementMap, viewport);
        } else if (element.type === 'path') {
          const pathData = element.data as PathData;
          bounds = measurePath(pathData.subPaths, pathData.strokeWidth ?? 1, 1);
        }

        if (bounds && isFinite(bounds.minX)) {
          minX = Math.min(minX, bounds.minX);
          minY = Math.min(minY, bounds.minY);
          maxX = Math.max(maxX, bounds.maxX);
          maxY = Math.max(maxY, bounds.maxY);
        }
      });

      if (isFinite(minX)) {
        // Create a pseudo-element for transformation tracking with a rectangular path based on bounds
        const rectPath: import('../../types').Command[] = [
          { type: 'M', position: { x: minX, y: minY } },
          { type: 'L', position: { x: maxX, y: minY } },
          { type: 'L', position: { x: maxX, y: maxY } },
          { type: 'L', position: { x: minX, y: maxY } },
          { type: 'Z' }
        ];

        const pseudoElement: CanvasElement = {
          id: 'selection-bbox',
          type: 'path',
          data: { 
            subPaths: [rectPath], 
            strokeWidth: 0,
            strokeColor: '#000000',
            strokeOpacity: 1,
            fillColor: 'none',
            fillOpacity: 1,
            transform: {
              scaleX: 1,
              scaleY: 1,
              rotation: 0,
              translateX: 0,
              translateY: 0
            }
          } as PathData,
          zIndex: 0
        };

        // Store original state of all selected elements
        const originalElementsData = new Map<string, CanvasElement>();
        selectedIds.forEach((id) => {
          const element = elementMap.get(id);
          if (element) {
            // Deep clone the element to preserve original state
            originalElementsData.set(id, JSON.parse(JSON.stringify(element)));
          }
        });

        const newState = transformController.initializeTransform(
          pseudoElement, 
          elementId, 
          handler, 
          point, 
          { minX, minY, maxX, maxY }
        );
        setTransformState((prev: TransformState) => ({ 
          ...prev, 
          ...newState,
          originalElementsData 
        }));
      }
      return;
    }

    // Case 3: Single element (group or path)
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    let bounds;
    if (element.type === 'group') {
      bounds = getGroupBounds(element as GroupElement, elementMap, viewport);
    } else if (element.type === 'path') {
      bounds = measurePath((element.data as PathData).subPaths, (element.data as PathData).strokeWidth ?? 1, 1);
    }

    if (bounds) {
      const newState = transformController.initializeTransform(element, elementId, handler, point, bounds);
      setTransformState((prev: TransformState) => ({ ...prev, ...newState }));
    }
  }, [transformController]);

  // Helper function to scale group descendants
  const scaleGroupDescendants = useCallback((
    groupId: string,
    scaleX: number,
    scaleY: number,
    originX: number,
    originY: number,
    _rotation: number
  ) => {
    const { elements, updateElement } = useCanvasStore.getState();
    const elementMap = new Map(elements.map(el => [el.id, el]));
    const group = elementMap.get(groupId);

    if (!group || group.type !== 'group') return;

    // Get original elements data from transform state
    const originalElementsData = transformStateRef.current.originalElementsData;

    // Collect all descendant IDs
    const descendants = new Set<string>();
    const queue = [...(group.data as { childIds: string[] }).childIds];

    while (queue.length > 0) {
      const childId = queue.shift();
      if (!childId) continue;

      descendants.add(childId);
      const child = elementMap.get(childId);
      if (child && child.type === 'group') {
        queue.push(...(child.data as { childIds: string[] }).childIds);
      }
    }

    // Scale all descendants
    descendants.forEach((descendantId) => {
      const element = elementMap.get(descendantId);
      if (element && element.type === 'path') {
        // Use original path data if available, otherwise use current
        const originalElement = originalElementsData?.get(descendantId);
        const originalPathData = (originalElement?.data as PathData) || (element.data as PathData);
        
        // Apply both scale and rotation
        const transformedSubPaths = originalPathData.subPaths.map((subPath) =>
          transformCommands(subPath, {
            scaleX,
            scaleY,
            originX,
            originY,
            rotation: _rotation,
            rotationCenterX: originX,
            rotationCenterY: originY
          })
        );
        
        const transformedData: PathData = {
          ...originalPathData,
          subPaths: transformedSubPaths
        };
        
        updateElement(descendantId, { ...element, data: transformedData });
      }
    });
  }, []);

  const updateTransformation = useCallback((point: Point, isShiftPressed: boolean) => {
    const currentState = transformStateRef.current;
    if (!currentState.isTransforming || !currentState.transformElementId) {
      return;
    }

    const { elements, updateElement, selectedIds } = useCanvasStore.getState();

    // Handle multi-selection bbox transformation
    if (currentState.transformElementId === 'selection-bbox') {
      // Calculate transformation parameters
      const result = transformController.calculateTransformUpdate(point, currentState, elements, isShiftPressed);
      setFeedback(result.feedback);

      if (!result.updatedElement || !currentState.originalBounds) {
        return;
      }

      // Get transform from the result element's data
      const transformData = (result.updatedElement.data as PathData).transform;
      if (!transformData) {
        return;
      }

      const scaleX = transformData.scaleX;
      const scaleY = transformData.scaleY;
      const rotation = transformData.rotation;

      // Calculate the transform origin based on the handler being used
      const { originX, originY } = calculateTransformOrigin(
        currentState.transformHandler || '',
        currentState.originalBounds
      );

      // Apply transformation to all selected elements
      const elementMap = new Map(elements.map(el => [el.id, el]));

      selectedIds.forEach((id) => {
        const element = elementMap.get(id);
        if (!element) {
          return;
        }

        // Get the original element data from the stored state
        const originalElement = currentState.originalElementsData?.get(id);
        if (!originalElement) {
          return;
        }

        if (element.type === 'group') {
          // For groups, scale all descendants using their original state
          scaleGroupDescendants(id, scaleX, scaleY, originX, originY, rotation);
        } else if (element.type === 'path') {
          // Scale and rotate the path directly from its original state
          const originalPathData = originalElement.data as PathData;
          
          // Apply both scale and rotation
          const transformedSubPaths = originalPathData.subPaths.map((subPath) =>
            transformCommands(subPath, {
              scaleX,
              scaleY,
              originX,
              originY,
              rotation,
              rotationCenterX: originX,
              rotationCenterY: originY
            })
          );
          
          const transformedData: PathData = {
            ...originalPathData,
            subPaths: transformedSubPaths
          };
          
          updateElement(id, { ...element, data: transformedData });
        }
      });

      return;
    }

    // Handle group transformation
    if (currentState.transformElementId?.startsWith('group:')) {
      const realGroupId = currentState.transformElementId.substring(6);
      const element = elements.find(el => el.id === realGroupId);
      
      if (element && element.type === 'group') {
        const result = transformController.calculateTransformUpdate(point, currentState, elements, isShiftPressed);
        setFeedback(result.feedback);

        if (!result.updatedElement || !currentState.originalBounds) {
          return;
        }

        const transformData = (result.updatedElement.data as PathData).transform;
        if (!transformData) {
          return;
        }

        const scaleX = transformData.scaleX;
        const scaleY = transformData.scaleY;
        const rotation = transformData.rotation;

        // Calculate the transform origin based on the handler being used
        const { originX, originY } = calculateTransformOrigin(
          currentState.transformHandler || '',
          currentState.originalBounds
        );

        // Scale all descendants of the group using their original state
        scaleGroupDescendants(realGroupId, scaleX, scaleY, originX, originY, rotation);
        return;
      }
    }

    // Handle regular path transformation (existing behavior)
    const result = transformController.calculateTransformUpdate(point, currentState, elements, isShiftPressed);

    if (result.updatedElement) {
      updateElement(result.updatedElement.id, result.updatedElement);
    }

    setFeedback(result.feedback);
  }, [transformController, calculateTransformOrigin, scaleGroupDescendants]);

  const endTransformation = useCallback(() => {
    const resetState = transformController.resetTransform();
    setTransformState((prev: TransformState) => ({ ...prev, ...resetState }));

    // Reset feedback
    setFeedback({
      rotation: { degrees: 0, visible: false, isShiftPressed: false, isMultipleOf15: false },
      resize: { deltaX: 0, deltaY: 0, visible: false, isShiftPressed: false, isMultipleOf10: false },
      shape: { width: 0, height: 0, visible: false, isShiftPressed: false, isMultipleOf10: false },
      pointPosition: { x: 0, y: 0, visible: false }
    });
  }, [transformController]);

  // Add global pointerup listener to ensure transformation ends even if pointer is released outside handlers
  useEffect(() => {
    if (!transformState.isTransforming) return;

    const handleGlobalPointerUp = () => {
      endTransformation();
    };

    // Add listener to document to capture pointerup anywhere
    document.addEventListener('pointerup', handleGlobalPointerUp);
    
    return () => {
      document.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [transformState.isTransforming, endTransformation]);

  return {
    transformState,
    feedback,
    startTransformation,
    updateTransformation,
    endTransformation
  };
};
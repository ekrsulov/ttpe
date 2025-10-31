import type { Point, CurvePoint, CurveState, CurvePointType, CanvasElement } from '../../types';
import { parsePathD, extractSubpaths } from '../../utils/path';
import { logger } from '../../utils';
import { applyGridSnap } from '../../utils/gridSnapUtils';
import { getDefaultStrokeColorFromSettings } from '../../utils/defaultColors';

export interface CurvesCallbacks {
  addElement: (element: CanvasElement) => string;
  pushToHistory: () => void;
  onCurveFinished: (elementId: string) => void;
}

export class CurvesController {
  private callbacks: CurvesCallbacks;
  private state: CurveState;
  private listeners: (() => void)[] = [];
  private lastClickTime: number = 0;
  private lastClickPoint: Point | null = null;
  private doubleClickThreshold: number = 300; // ms
  private doubleClickDistance: number = 5; // pixels

  constructor(callbacks: CurvesCallbacks) {
    this.callbacks = callbacks;
    this.state = {
      mode: 'inactive',
      isActive: false,
      points: [],
      isClosingPath: false,
    };
  }

  getState(): CurveState {
    return {
      ...this.state,
      points: this.state.points.map(p => ({ ...p })),
    };
  }

  addListener(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        logger.error('Error in curves controller listener', error);
      }
    });
  }

  private distance(p1: Point, p2: Point): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }

  private snapToGrid(point: Point): Point {
    // Use shared grid snap utility - single source of truth
    return applyGridSnap(point);
  }

  private isDoubleClick(point: Point): boolean {
    const now = Date.now();
    const timeDiff = now - this.lastClickTime;
    const distance = this.lastClickPoint ? this.distance(point, this.lastClickPoint) : Infinity;

    this.lastClickTime = now;
    this.lastClickPoint = point;

    return timeDiff < this.doubleClickThreshold && distance < this.doubleClickDistance;
  }

  private isPointAt(point: Point, target: Point, threshold: number = 10): boolean {
    return this.distance(point, target) <= threshold;
  }

  private findPointAt(point: Point): CurvePoint | undefined {
    return this.state.points.find(p => this.isPointAt(point, p));
  }

  private findHandleAt(point: Point): { point: CurvePoint; type: 'handle_in' | 'handle_out' } | undefined {
    for (const p of this.state.points) {
      if (p.handleIn && this.isPointAt(point, p.handleIn, 8)) {
        return { point: p, type: 'handle_in' };
      }
      if (p.handleOut && this.isPointAt(point, p.handleOut, 8)) {
        return { point: p, type: 'handle_out' };
      }
    }
    return undefined;
  }

  activate() {
    this.state.isActive = true;
    this.state.mode = 'creating';
    this.notifyListeners();
  }

  deactivate() {
    // When deactivating, just clear without creating path
    // If the user wanted to finish, they should use finishPath() explicitly
    this.state.isActive = false;
    this.state.mode = 'inactive';
    this.state.points = [];
    this.state.selectedPointId = undefined;
    this.state.dragState = undefined;
    this.state.previewPoint = undefined;
    this.state.previewHandle = undefined;
    this.state.isClosingPath = false;
    this.notifyListeners();
  }

  cancel() {
    // Cancel without creating path - just clear everything
    this.state.points = [];
    this.state.selectedPointId = undefined;
    this.state.dragState = undefined;
    this.state.previewPoint = undefined;
    this.state.previewHandle = undefined;
    this.state.isClosingPath = false;
    this.state.mode = 'creating';
    this.notifyListeners();
  }

  handlePointerDown(point: Point, shiftPressed: boolean = false): boolean {
    if (!this.state.isActive) return false;

    const snappedPoint = this.snapToGrid(point);

    if (this.state.mode === 'creating') {
      return this.handleCreatingPointerDown(snappedPoint, shiftPressed);
    } else if (this.state.mode === 'editing') {
      return this.handleEditingPointerDown(snappedPoint);
    }

    return false;
  }

  handlePointerMove(point: Point): boolean {
    if (!this.state.isActive) return false;

    const snappedPoint = this.snapToGrid(point);

    if (this.state.mode === 'creating') {
      // Handle dragging during creation
      if (this.state.dragState) {
        if (this.state.dragState.dragType === 'adjust_curvature') {
          return this.handleAdjustingCurvature(snappedPoint);
        } else if (this.state.dragState.dragType === 'adjust_last_segment') {
          return this.handleAdjustingLastSegment(snappedPoint);
        } else if (this.state.dragState.dragType === 'adjust_closing_segment') {
          return this.handleAdjustingClosingSegment(snappedPoint);
        }
      } else {
        // Just preview
        this.state.previewPoint = snappedPoint;
      }
      this.notifyListeners();
      return true;
    }

    if (this.state.mode === 'dragging_point' && this.state.dragState) {
      return this.handleDraggingPoint(snappedPoint);
    }

    if (this.state.mode === 'dragging_handle' && this.state.dragState) {
      return this.handleDraggingHandle(snappedPoint);
    }

    return false;
  }

  handlePointerUp(): boolean {
    if (!this.state.isActive) return false;

    // If path is marked for closing, finish it
    if (this.state.isClosingPath) {
      this.finishPath();
      return true;
    }

    if (this.state.dragState) {
      // If we were dragging a point or handle (from shift+click), return to creating mode
      if (this.state.mode === 'dragging_point' || this.state.mode === 'dragging_handle') {
        this.state.mode = 'creating';
      }
      
      // Clear drag state when finishing any drag operation
      this.state.dragState = undefined;
      this.notifyListeners();
      return true;
    }

    return false;
  }

  private handleCreatingPointerDown(snappedPoint: Point, shiftPressed: boolean = false): boolean {
    // If Shift is pressed, check if clicking on an existing point or handle
    if (shiftPressed && this.state.points.length > 0) {
      const pointAt = this.findPointAt(snappedPoint);
      const handleAt = this.findHandleAt(snappedPoint);

      if (pointAt) {
        // Switch to editing mode and select the point
        this.state.points.forEach(p => p.selected = false);
        pointAt.selected = true;
        this.state.selectedPointId = pointAt.id;

        this.state.dragState = {
          pointId: pointAt.id,
          dragType: 'point',
          startPoint: { x: pointAt.x, y: pointAt.y },
          startHandleIn: pointAt.handleIn ? { ...pointAt.handleIn } : undefined,
          startHandleOut: pointAt.handleOut ? { ...pointAt.handleOut } : undefined,
        };

        this.state.mode = 'dragging_point';
        this.notifyListeners();
        return true;
      }

      if (handleAt) {
        // Switch to dragging handle mode
        this.state.dragState = {
          pointId: handleAt.point.id,
          dragType: handleAt.type,
          startPoint: { ...handleAt.point[handleAt.type === 'handle_in' ? 'handleIn' : 'handleOut']! },
        };

        this.state.mode = 'dragging_handle';
        this.notifyListeners();
        return true;
      }
    }

    // Check for double-click to finish path
    if (this.isDoubleClick(snappedPoint) && this.state.points.length >= 3) {
      this.finishPath();
      return true;
    }

    // Check if clicking on first point to adjust closing segment curvature
    const firstPoint = this.state.points[0];
    if (firstPoint && this.isPointAt(snappedPoint, firstPoint) && this.state.points.length > 2) {
      // Allow adjusting curvature of the closing segment
      this.state.dragState = {
        pointId: firstPoint.id,
        dragType: 'adjust_closing_segment',
        startPoint: snappedPoint,
      };
      this.state.isClosingPath = true; // Mark that we're preparing to close
      this.notifyListeners();
      return true;
    }

    // Check if clicking on the last point to adjust its curvature
    const lastPoint = this.state.points[this.state.points.length - 1];
    if (lastPoint && this.isPointAt(snappedPoint, lastPoint) && this.state.points.length > 1) {
      // Allow adjusting curvature of the last segment
      this.state.dragState = {
        pointId: lastPoint.id,
        dragType: 'adjust_last_segment',
        startPoint: snappedPoint,
      };
      this.notifyListeners();
      return true;
    }

    // Create new point
    const newPoint: CurvePoint = {
      id: `curve-point-${Date.now()}`,
      x: snappedPoint.x,
      y: snappedPoint.y,
      type: 'corner',
      selected: true,
    };

    // Deselect all other points
    this.state.points.forEach(p => p.selected = false);
    this.state.points.push(newPoint);
    this.state.selectedPointId = newPoint.id;

    // Set up dragging to adjust curvature of the previous segment
    if (this.state.points.length > 1) {
      this.state.dragState = {
        pointId: newPoint.id,
        dragType: 'adjust_curvature',
        startPoint: snappedPoint,
      };
    }

    this.notifyListeners();
    return true;
  }

  private handleEditingPointerDown(snappedPoint: Point): boolean {
    // Find point or handle at position
    const pointAt = this.findPointAt(snappedPoint);
    const handleAt = this.findHandleAt(snappedPoint);

    if (pointAt) {
      // Start dragging point
      this.state.points.forEach(p => p.selected = false);
      pointAt.selected = true;
      this.state.selectedPointId = pointAt.id;

      this.state.dragState = {
        pointId: pointAt.id,
        dragType: 'point',
        startPoint: { x: pointAt.x, y: pointAt.y },
        startHandleIn: pointAt.handleIn ? { ...pointAt.handleIn } : undefined,
        startHandleOut: pointAt.handleOut ? { ...pointAt.handleOut } : undefined,
      };

      this.state.mode = 'dragging_point';
      this.notifyListeners();
      return true;
    }

    if (handleAt) {
      // Start dragging handle
      this.state.dragState = {
        pointId: handleAt.point.id,
        dragType: handleAt.type,
        startPoint: { ...handleAt.point[handleAt.type === 'handle_in' ? 'handleIn' : 'handleOut']! },
      };

      this.state.mode = 'dragging_handle';
      this.notifyListeners();
      return true;
    }

    // Click on empty space - deselect all
    this.state.points.forEach(p => p.selected = false);
    this.state.selectedPointId = undefined;
    this.notifyListeners();
    return true;
  }

  private handleDraggingPoint(snappedPoint: Point): boolean {
    if (!this.state.dragState) return false;

    const { pointId, startPoint, startHandleIn, startHandleOut } = this.state.dragState;
    const targetPoint = this.state.points.find(p => p.id === pointId);

    if (!targetPoint) return false;

    targetPoint.x = snappedPoint.x;
    targetPoint.y = snappedPoint.y;

    // Move handles with the point
    if (startHandleIn) {
      targetPoint.handleIn = {
        x: startHandleIn.x + (snappedPoint.x - startPoint.x),
        y: startHandleIn.y + (snappedPoint.y - startPoint.y),
      };
    }
    if (startHandleOut) {
      targetPoint.handleOut = {
        x: startHandleOut.x + (snappedPoint.x - startPoint.x),
        y: startHandleOut.y + (snappedPoint.y - startPoint.y),
      };
    }

    this.notifyListeners();
    return true;
  }

  private handleDraggingHandle(snappedPoint: Point): boolean {
    if (!this.state.dragState) return false;

    const { pointId, dragType } = this.state.dragState;
    const targetPoint = this.state.points.find(p => p.id === pointId);

    if (!targetPoint) return false;

    const pointIndex = this.state.points.findIndex(p => p.id === pointId);

    if (dragType === 'handle_in') {
      targetPoint.handleIn = snappedPoint;

      // Create corresponding handle_out on previous point for smooth curves
      if (pointIndex > 0) {
        const prevPoint = this.state.points[pointIndex - 1];
        if (!prevPoint.handleOut) {
          // Create symmetric handle
          const dx = targetPoint.x - snappedPoint.x;
          const dy = targetPoint.y - snappedPoint.y;
          prevPoint.handleOut = {
            x: prevPoint.x + dx,
            y: prevPoint.y + dy,
          };
        }
      }
    } else if (dragType === 'handle_out') {
      targetPoint.handleOut = snappedPoint;

      // Create corresponding handle_in on next point for smooth curves
      if (pointIndex < this.state.points.length - 1) {
        const nextPoint = this.state.points[pointIndex + 1];
        if (!nextPoint.handleIn) {
          // Create symmetric handle
          const dx = targetPoint.x - snappedPoint.x;
          const dy = targetPoint.y - snappedPoint.y;
          nextPoint.handleIn = {
            x: nextPoint.x + dx,
            y: nextPoint.y + dy,
          };
        }
      }
    }

    this.notifyListeners();
    return true;
  }

  /**
   * Shared helper to adjust segment curvature based on mouse position.
   * Centralizes all curvature calculation and handle assignment logic.
   */
  private adjustSegmentCurvature(params: {
    anchorPoint: CurvePoint;
    movingPoint: Point;
    referencePoint: CurvePoint;
  }): void {
    const { anchorPoint, movingPoint, referencePoint } = params;

    // Calculate the direction from reference point to anchor point
    const segmentDx = anchorPoint.x - referencePoint.x;
    const segmentDy = anchorPoint.y - referencePoint.y;
    const segmentLength = Math.sqrt(segmentDx * segmentDx + segmentDy * segmentDy);

    if (segmentLength === 0) return;

    // Calculate the perpendicular direction for the curve
    const perpDx = -segmentDy / segmentLength;
    const perpDy = segmentDx / segmentLength;

    // Calculate how far the mouse is from the anchor point
    const mouseDx = movingPoint.x - anchorPoint.x;
    const mouseDy = movingPoint.y - anchorPoint.y;

    // Project mouse position onto the perpendicular line
    const projection = mouseDx * perpDx + mouseDy * perpDy;
    const curvatureStrength = Math.max(-segmentLength * 0.5, Math.min(segmentLength * 0.5, projection));

    // Create handles based on curvature
    if (Math.abs(curvatureStrength) > 5) {
      // Create handle on reference point (handle_out)
      referencePoint.handleOut = {
        x: referencePoint.x + segmentDx * 0.3 + perpDx * curvatureStrength * 0.5,
        y: referencePoint.y + segmentDy * 0.3 + perpDy * curvatureStrength * 0.5,
      };

      // Create handle on anchor point (handle_in)
      anchorPoint.handleIn = {
        x: anchorPoint.x - segmentDx * 0.3 + perpDx * curvatureStrength * 0.5,
        y: anchorPoint.y - segmentDy * 0.3 + perpDy * curvatureStrength * 0.5,
      };

      // Convert points to smooth type
      referencePoint.type = 'smooth';
      anchorPoint.type = 'smooth';
    } else {
      // Remove handles if curvature is too small
      referencePoint.handleOut = undefined;
      anchorPoint.handleIn = undefined;
      referencePoint.type = 'corner';
      anchorPoint.type = 'corner';
    }
  }

  private handleAdjustingCurvature(snappedPoint: Point): boolean {
    if (!this.state.dragState || this.state.dragState.dragType !== 'adjust_curvature') return false;

    const { pointId } = this.state.dragState;
    const currentPoint = this.state.points.find(p => p.id === pointId);

    if (!currentPoint) return false;

    const pointIndex = this.state.points.findIndex(p => p.id === pointId);
    if (pointIndex <= 0) return false;

    const prevPoint = this.state.points[pointIndex - 1];

    this.adjustSegmentCurvature({
      anchorPoint: currentPoint,
      movingPoint: snappedPoint,
      referencePoint: prevPoint,
    });

    this.notifyListeners();
    return true;
  }

  private handleAdjustingLastSegment(snappedPoint: Point): boolean {
    if (!this.state.dragState || this.state.dragState.dragType !== 'adjust_last_segment') return false;

    const { pointId } = this.state.dragState;
    const lastPoint = this.state.points.find(p => p.id === pointId);

    if (!lastPoint || this.state.points.length < 2) return false;

    const prevPoint = this.state.points[this.state.points.length - 2];

    this.adjustSegmentCurvature({
      anchorPoint: lastPoint,
      movingPoint: snappedPoint,
      referencePoint: prevPoint,
    });

    this.notifyListeners();
    return true;
  }

  private handleAdjustingClosingSegment(snappedPoint: Point): boolean {
    if (!this.state.dragState || this.state.dragState.dragType !== 'adjust_closing_segment') return false;

    if (this.state.points.length < 3) return false;

    const firstPoint = this.state.points[0];
    const lastPoint = this.state.points[this.state.points.length - 1];

    this.adjustSegmentCurvature({
      anchorPoint: firstPoint,
      movingPoint: snappedPoint,
      referencePoint: lastPoint,
    });

    this.notifyListeners();
    return true;
  }

  finishPath() {
    if (this.state.points.length === 0) return;

    // Convert curve points to SVG path
    const pathDataString = this.generatePathFromPoints();

    // Parse the path string into commands and subpaths
    const commands = parsePathD(pathDataString);
    const subPathsData = extractSubpaths(commands);
    const subPaths = subPathsData.map(sp => sp.commands);

    // Create canvas element with proper PathData structure
    const element: CanvasElement = {
      id: `curve-path-${Date.now()}`, // This will be overridden by addElement
      type: 'path' as const,
      data: {
        subPaths,
        strokeWidth: 2,
        strokeColor: getDefaultStrokeColorFromSettings(),
        strokeOpacity: 1,
        fillColor: 'none',
        fillOpacity: 0,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        fillRule: 'nonzero' as const,
        strokeDasharray: 'none',
      },
      zIndex: Date.now(), // This will be overridden by addElement
    };

    const elementId = this.callbacks.addElement(element);
    this.callbacks.pushToHistory();

    // Notify that curve is finished
    this.callbacks.onCurveFinished(elementId);

    // Reset state
    this.state.points = [];
    this.state.selectedPointId = undefined;
    this.state.dragState = undefined;
    this.state.previewPoint = undefined;
    this.state.previewHandle = undefined;
    this.state.isClosingPath = false;
    this.state.mode = 'creating';

    this.notifyListeners();
  }

  private generatePathFromPoints() {
    if (this.state.points.length === 0) return '';

    let path = `M ${this.state.points[0].x} ${this.state.points[0].y}`;

    for (let i = 1; i < this.state.points.length; i++) {
      const prevPoint = this.state.points[i - 1];
      const currentPoint = this.state.points[i];

      if (prevPoint.handleOut && currentPoint.handleIn) {
        // Cubic Bézier curve
        path += ` C ${prevPoint.handleOut.x} ${prevPoint.handleOut.y} ${currentPoint.handleIn.x} ${currentPoint.handleIn.y} ${currentPoint.x} ${currentPoint.y}`;
      } else {
        // Straight line
        path += ` L ${currentPoint.x} ${currentPoint.y}`;
      }
    }

    if (this.state.isClosingPath && this.state.points.length > 2) {
      const firstPoint = this.state.points[0];
      const lastPoint = this.state.points[this.state.points.length - 1];

      if (lastPoint.handleOut && firstPoint.handleIn) {
        path += ` C ${lastPoint.handleOut.x} ${lastPoint.handleOut.y} ${firstPoint.handleIn.x} ${firstPoint.handleIn.y} ${firstPoint.x} ${firstPoint.y}`;
      } else {
        path += ` L ${firstPoint.x} ${firstPoint.y}`;
      }
      
      // Add Z command to properly close the path
      path += ' Z';
    }

    return path;
  }

  deleteSelectedPoint() {
    if (!this.state.selectedPointId) return;

    const deletedIndex = this.state.points.findIndex(p => p.id === this.state.selectedPointId);
    if (deletedIndex === -1) return;

    // Filter out the deleted point
    this.state.points = this.state.points.filter(p => p.id !== this.state.selectedPointId);
    
    // Clean up orphaned handles
    if (deletedIndex === 0 && this.state.points.length > 0) {
      // If we deleted the first point, remove handleIn from the new first point
      // because it was connected to the deleted point
      const newFirstPoint = this.state.points[0];
      if (newFirstPoint.handleIn) {
        newFirstPoint.handleIn = undefined;
      }
    } else if (deletedIndex === this.state.points.length && this.state.points.length > 0) {
      // If we deleted the last point, remove handleOut from the new last point
      const newLastPoint = this.state.points[this.state.points.length - 1];
      if (newLastPoint.handleOut) {
        newLastPoint.handleOut = undefined;
      }
    } else if (deletedIndex > 0 && deletedIndex < this.state.points.length) {
      // If we deleted a middle point, we need to clean up handles on adjacent points
      const prevPoint = this.state.points[deletedIndex - 1];
      const nextPoint = this.state.points[deletedIndex];
      
      // Remove handleOut from previous point and handleIn from next point
      if (prevPoint.handleOut) {
        prevPoint.handleOut = undefined;
      }
      if (nextPoint && nextPoint.handleIn) {
        nextPoint.handleIn = undefined;
      }
    }

    this.state.selectedPointId = undefined;
    this.notifyListeners();
  }

  selectPoint(pointId: string | undefined) {
    this.state.selectedPointId = pointId;
    this.state.points.forEach(p => p.selected = (p.id === pointId));
    this.notifyListeners();
  }

  setPointType(pointId: string, type: CurvePointType) {
    const point = this.state.points.find(p => p.id === pointId);
    if (point) {
      point.type = type;
      this.notifyListeners();
    }
  }
}
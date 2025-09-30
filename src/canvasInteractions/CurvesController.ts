import type { Point, CurvePoint, CurveState, CurvePointType, CanvasElement } from '../types';
import { parsePathD, extractSubpaths } from '../utils/path';
import { logger } from '../utils';

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
    return { ...this.state };
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
    // For now, no snapping
    return point;
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
    this.finishPath();
    this.state.isActive = false;
    this.state.mode = 'inactive';
    this.state.points = [];
    this.state.selectedPointId = undefined;
    this.notifyListeners();
  }

  handlePointerDown(point: Point): boolean {
    if (!this.state.isActive) return false;

    const snappedPoint = this.snapToGrid(point);

    if (this.state.mode === 'creating') {
      return this.handleCreatingPointerDown(snappedPoint);
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
      // Clear drag state when finishing any drag operation
      this.state.dragState = undefined;
      this.notifyListeners();
      return true;
    }

    return false;
  }

  private handleCreatingPointerDown(snappedPoint: Point): boolean {
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

  private handleAdjustingCurvature(snappedPoint: Point): boolean {
    if (!this.state.dragState || this.state.dragState.dragType !== 'adjust_curvature') return false;

    const { pointId } = this.state.dragState;
    const currentPoint = this.state.points.find(p => p.id === pointId);

    if (!currentPoint) return false;

    const pointIndex = this.state.points.findIndex(p => p.id === pointId);
    if (pointIndex <= 0) return false;

    const prevPoint = this.state.points[pointIndex - 1];

    // Calculate the direction from previous point to current point
    const segmentDx = currentPoint.x - prevPoint.x;
    const segmentDy = currentPoint.y - prevPoint.y;
    const segmentLength = Math.sqrt(segmentDx * segmentDx + segmentDy * segmentDy);

    if (segmentLength === 0) return false;

    // Calculate the perpendicular direction for the curve
    const perpDx = -segmentDy / segmentLength;
    const perpDy = segmentDx / segmentLength;

    // Calculate how far the mouse is from the current point
    const mouseDx = snappedPoint.x - currentPoint.x;
    const mouseDy = snappedPoint.y - currentPoint.y;

    // Project mouse position onto the perpendicular line
    const projection = mouseDx * perpDx + mouseDy * perpDy;
    const curvatureStrength = Math.max(-segmentLength * 0.5, Math.min(segmentLength * 0.5, projection));

    // Create handles based on curvature
    if (Math.abs(curvatureStrength) > 5) {
      // Create handle on previous point (handle_out)
      prevPoint.handleOut = {
        x: prevPoint.x + segmentDx * 0.3 + perpDx * curvatureStrength * 0.5,
        y: prevPoint.y + segmentDy * 0.3 + perpDy * curvatureStrength * 0.5,
      };

      // Create handle on current point (handle_in)
      currentPoint.handleIn = {
        x: currentPoint.x - segmentDx * 0.3 + perpDx * curvatureStrength * 0.5,
        y: currentPoint.y - segmentDy * 0.3 + perpDy * curvatureStrength * 0.5,
      };

      // Convert points to smooth type
      prevPoint.type = 'smooth';
      currentPoint.type = 'smooth';
    } else {
      // Remove handles if curvature is too small
      prevPoint.handleOut = undefined;
      currentPoint.handleIn = undefined;
      prevPoint.type = 'corner';
      currentPoint.type = 'corner';
    }

    this.notifyListeners();
    return true;
  }

  private handleAdjustingLastSegment(snappedPoint: Point): boolean {
    if (!this.state.dragState || this.state.dragState.dragType !== 'adjust_last_segment') return false;

    const { pointId } = this.state.dragState;
    const lastPoint = this.state.points.find(p => p.id === pointId);

    if (!lastPoint || this.state.points.length < 2) return false;

    const prevPoint = this.state.points[this.state.points.length - 2];

    // Calculate the direction from previous point to last point
    const segmentDx = lastPoint.x - prevPoint.x;
    const segmentDy = lastPoint.y - prevPoint.y;
    const segmentLength = Math.sqrt(segmentDx * segmentDx + segmentDy * segmentDy);

    if (segmentLength === 0) return false;

    // Calculate the perpendicular direction for the curve
    const perpDx = -segmentDy / segmentLength;
    const perpDy = segmentDx / segmentLength;

    // Calculate how far the mouse is from the last point
    const mouseDx = snappedPoint.x - lastPoint.x;
    const mouseDy = snappedPoint.y - lastPoint.y;

    // Project mouse position onto the perpendicular line
    const projection = mouseDx * perpDx + mouseDy * perpDy;
    const curvatureStrength = Math.max(-segmentLength * 0.5, Math.min(segmentLength * 0.5, projection));

    // Create handles based on curvature
    if (Math.abs(curvatureStrength) > 5) {
      // Create handle on previous point (handle_out)
      prevPoint.handleOut = {
        x: prevPoint.x + segmentDx * 0.3 + perpDx * curvatureStrength * 0.5,
        y: prevPoint.y + segmentDy * 0.3 + perpDy * curvatureStrength * 0.5,
      };

      // Create handle on last point (handle_in)
      lastPoint.handleIn = {
        x: lastPoint.x - segmentDx * 0.3 + perpDx * curvatureStrength * 0.5,
        y: lastPoint.y - segmentDy * 0.3 + perpDy * curvatureStrength * 0.5,
      };

      // Convert points to smooth type
      prevPoint.type = 'smooth';
      lastPoint.type = 'smooth';
    } else {
      // Remove handles if curvature is too small
      prevPoint.handleOut = undefined;
      lastPoint.handleIn = undefined;
      prevPoint.type = 'corner';
      lastPoint.type = 'corner';
    }

    this.notifyListeners();
    return true;
  }

  private handleAdjustingClosingSegment(snappedPoint: Point): boolean {
    if (!this.state.dragState || this.state.dragState.dragType !== 'adjust_closing_segment') return false;

    if (this.state.points.length < 3) return false;

    const firstPoint = this.state.points[0];
    const lastPoint = this.state.points[this.state.points.length - 1];

    // Calculate the direction from last point to first point (closing segment)
    const segmentDx = firstPoint.x - lastPoint.x;
    const segmentDy = firstPoint.y - lastPoint.y;
    const segmentLength = Math.sqrt(segmentDx * segmentDx + segmentDy * segmentDy);

    if (segmentLength === 0) return false;

    // Calculate the perpendicular direction for the curve
    const perpDx = -segmentDy / segmentLength;
    const perpDy = segmentDx / segmentLength;

    // Calculate how far the mouse is from the first point
    const mouseDx = snappedPoint.x - firstPoint.x;
    const mouseDy = snappedPoint.y - firstPoint.y;

    // Project mouse position onto the perpendicular line
    const projection = mouseDx * perpDx + mouseDy * perpDy;
    const curvatureStrength = Math.max(-segmentLength * 0.5, Math.min(segmentLength * 0.5, projection));

    // Create handles based on curvature
    if (Math.abs(curvatureStrength) > 5) {
      // Create handle on last point (handle_out)
      lastPoint.handleOut = {
        x: lastPoint.x + segmentDx * 0.3 + perpDx * curvatureStrength * 0.5,
        y: lastPoint.y + segmentDy * 0.3 + perpDy * curvatureStrength * 0.5,
      };

      // Create handle on first point (handle_in)
      firstPoint.handleIn = {
        x: firstPoint.x - segmentDx * 0.3 + perpDx * curvatureStrength * 0.5,
        y: firstPoint.y - segmentDy * 0.3 + perpDy * curvatureStrength * 0.5,
      };

      // Convert points to smooth type
      lastPoint.type = 'smooth';
      firstPoint.type = 'smooth';
    } else {
      // Remove handles if curvature is too small
      lastPoint.handleOut = undefined;
      firstPoint.handleIn = undefined;
      lastPoint.type = 'corner';
      firstPoint.type = 'corner';
    }

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
        strokeColor: '#000000',
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
    }

    return path;
  }

  deleteSelectedPoint() {
    if (!this.state.selectedPointId) return;

    this.state.points = this.state.points.filter(p => p.id !== this.state.selectedPointId);
    this.state.selectedPointId = undefined;
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
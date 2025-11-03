import type { RefObject } from 'react';
import type { Point } from '../../types';
import type { PencilPluginSlice } from '../../plugins/pencil/slice';
import { createPathDataFromPoints, getPencilPathStyle, simplifyPathFromPoints, subPathsToPathString, type PathStyleLike } from '../../plugins/pencil/utils';
import { getDefaultStrokeColorFromSettings } from '../../utils/defaultColors';

type PencilSettings = PencilPluginSlice['pencil'];

type PointerEventType = 'pointermove' | 'pointerup';

export interface AttachPencilDrawingListenersOptions {
  activePlugin: string | null;
  pencil: PencilSettings;
  viewportZoom: number;
  scaleStrokeWithZoom: boolean;
  screenToCanvas: (x: number, y: number) => Point;
  emitPointerEvent: (type: PointerEventType, event: PointerEvent, point: Point) => void;
  startPath: (point: Point) => void;
  addPointToPath: (point: Point) => void;
  finalizePath: (points: Point[]) => void;
}

export class PencilDrawingService {
  private detachHandlers: (() => void) | null = null;

  constructor() {}

  attachPencilDrawingListeners(
    svgRef: RefObject<SVGSVGElement | null>,
    options: AttachPencilDrawingListenersOptions
  ): () => void {
    const svgElement = svgRef.current;

    // Always cleanup any existing listeners before re-attaching
    this.detachHandlers?.();

    if (!svgElement || options.activePlugin !== 'pencil') {
      this.detachHandlers = null;
      return () => {};
    }

    // Remove orphaned temporary paths before attaching listeners
    const orphanedTempPaths = svgElement.querySelectorAll('[data-temp-path="true"]');
    orphanedTempPaths.forEach((path) => path.remove());

    let isDrawing = false;
    let tempPath: SVGPathElement | null = null;
    let allPoints: Point[] = [];
    let currentStyle: PathStyleLike | null = null;

    const cleanupTempPath = () => {
      if (tempPath && tempPath.parentNode) {
        tempPath.parentNode.removeChild(tempPath);
      }
      tempPath = null;
    };

    const handlePointerDown = (event: PointerEvent) => {
      event.stopPropagation();
      const point = options.screenToCanvas(event.clientX, event.clientY);

      isDrawing = true;
      allPoints = [point];
      currentStyle = getPencilPathStyle(options.pencil);

      tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const { strokeWidth, strokeColor, strokeOpacity } = options.pencil;
      const defaultStrokeColor = getDefaultStrokeColorFromSettings();
      const effectiveStrokeColor = strokeColor === 'none' ? defaultStrokeColor : strokeColor;
      const strokeWidthForZoom = options.scaleStrokeWithZoom 
        ? strokeWidth 
        : strokeWidth / options.viewportZoom;

      tempPath.setAttribute('fill', 'none');
      tempPath.setAttribute('stroke', effectiveStrokeColor);
      tempPath.setAttribute('stroke-width', strokeWidthForZoom.toString());
      tempPath.setAttribute('stroke-opacity', strokeOpacity.toString());
      tempPath.setAttribute('stroke-linecap', 'round');
      tempPath.setAttribute('stroke-linejoin', 'round');
      tempPath.setAttribute('d', `M ${point.x} ${point.y}`);
      tempPath.setAttribute('data-temp-path', 'true');
      tempPath.style.pointerEvents = 'none';

      svgElement.appendChild(tempPath);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const point = options.screenToCanvas(event.clientX, event.clientY);
      options.emitPointerEvent('pointermove', event, point);

      if (!isDrawing || !tempPath) {
        return;
      }

      event.stopPropagation();
      allPoints.push(point);

      if (!currentStyle) {
        currentStyle = getPencilPathStyle(options.pencil);
      }

      const tolerance = options.pencil.simplificationTolerance ?? 0;
      const previewPathData = tolerance > 0
        ? simplifyPathFromPoints(allPoints, currentStyle, tolerance)
        : createPathDataFromPoints(allPoints, currentStyle);

      const pathD = subPathsToPathString(previewPathData.subPaths);
      tempPath.setAttribute('d', pathD);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const point = options.screenToCanvas(event.clientX, event.clientY);
      options.emitPointerEvent('pointerup', event, point);

      event.stopPropagation();
      if (!isDrawing) {
        return;
      }

      isDrawing = false;
      const pointsToAdd = [...allPoints];
      allPoints = [];
      currentStyle = null;

      cleanupTempPath();

      if (pointsToAdd.length > 0) {
        options.startPath(pointsToAdd[0]);
        for (let index = 1; index < pointsToAdd.length; index++) {
          options.addPointToPath(pointsToAdd[index]);
        }

        if ((options.pencil.simplificationTolerance ?? 0) > 0) {
          options.finalizePath(pointsToAdd);
        }
      }
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (!isDrawing) {
        return;
      }

      event.stopPropagation();
      isDrawing = false;
      allPoints = [];
      currentStyle = null;
      cleanupTempPath();
    };

    svgElement.addEventListener('pointerdown', handlePointerDown, { passive: false });
    svgElement.addEventListener('pointermove', handlePointerMove, { passive: false });
    svgElement.addEventListener('pointerup', handlePointerUp, { passive: false });
    svgElement.addEventListener('pointercancel', handlePointerCancel, { passive: false });

    this.detachHandlers = () => {
      svgElement.removeEventListener('pointerdown', handlePointerDown);
      svgElement.removeEventListener('pointermove', handlePointerMove);
      svgElement.removeEventListener('pointerup', handlePointerUp);
      svgElement.removeEventListener('pointercancel', handlePointerCancel);

      cleanupTempPath();

      const tempPaths = svgElement.querySelectorAll('[data-temp-path="true"]');
      tempPaths.forEach((path) => path.remove());
    };

    return this.detachHandlers;
  }
}

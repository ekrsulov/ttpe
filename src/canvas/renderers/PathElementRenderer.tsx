import { commandsToString } from '../../utils/path';
import type { PathElement } from '../../types';
import type {
  CanvasElementRenderer,
  CanvasRenderContext,
} from './CanvasRendererRegistry';

const getEffectiveStrokeColor = (path: PathElement['data']): string => {
  // Treat all paths uniformly - use transparent color if no stroke
  if (path.strokeColor === 'none') {
    return '#00000001';
  }

  return path.strokeColor;
};

const getEffectiveFillColor = (path: PathElement['data']): string => {
  if (path.fillColor === 'none') {
    return '#ffffff01';
  }

  return path.fillColor;
};

export const PathElementRenderer: CanvasElementRenderer<PathElement> = (
  element,
  context: CanvasRenderContext
) => {
  const { viewport, scaleStrokeWithZoom, eventHandlers, isElementSelected, isElementLocked, isPathInteractionDisabled, pathCursorMode } = context;
  const pathData = element.data;

  const effectiveStrokeColor = getEffectiveStrokeColor(pathData);
  const effectiveFillColor = getEffectiveFillColor(pathData);

  // Calculate stroke width based on scaleStrokeWithZoom setting
  const effectiveStrokeWidth = scaleStrokeWithZoom
    ? pathData.strokeWidth
    : pathData.strokeWidth / viewport.zoom;

  const pathD = commandsToString(pathData.subPaths.flat());
  const pointerDownHandler = eventHandlers.onPointerDown;
  const pointerUpHandler = eventHandlers.onPointerUp;
  const doubleClickHandler = eventHandlers.onDoubleClick;
  const isSelected = isElementSelected?.(element.id) ?? false;
  const isLocked = isElementLocked?.(element.id) ?? false;

  // Detect if this is a touch device
  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;

  return (
    <g key={element.id}>
      <path
        data-element-id={element.id}
        d={pathD}
        stroke={effectiveStrokeColor}
        strokeWidth={effectiveStrokeWidth}
        fill={effectiveFillColor}
        fillOpacity={pathData.fillOpacity}
        strokeOpacity={pathData.strokeOpacity}
        strokeLinecap={pathData.strokeLinecap || 'round'}
        strokeLinejoin={pathData.strokeLinejoin || 'round'}
        fillRule={pathData.fillRule || 'nonzero'}
        strokeDasharray={
          pathData.strokeDasharray && pathData.strokeDasharray !== 'none'
            ? pathData.strokeDasharray
            : undefined
        }
        // On touch devices: don't add individual touch handlers, use canvas-level delegation
        // On desktop: use pointer and mouse events
        {...(!isTouchDevice && pointerDownHandler && {
          onPointerDown: (event) => pointerDownHandler(element.id, event)
        })}
        {...(!isTouchDevice && pointerUpHandler && {
          onPointerUp: (event) => pointerUpHandler(element.id, event)
        })}
        {...(!isTouchDevice && doubleClickHandler && {
          onDoubleClick: (event) => doubleClickHandler(element.id, event)
        })}
        style={{
          cursor:
            pathCursorMode === 'select'
              ? isLocked
                ? 'default'
                : isSelected
                  ? 'move'
                  : 'pointer'
              : 'default',
          pointerEvents: isPathInteractionDisabled ? 'none' : 'auto',
        }}
      />
    </g>
  );
};

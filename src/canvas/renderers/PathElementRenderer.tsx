import React from 'react';
import { commandsToString } from '../../utils/path';
import type { PathElement } from '../../types';
import type {
  CanvasElementRenderer,
  CanvasRenderContext,
} from './CanvasRendererRegistry';
import { useDoubleTap } from '../../hooks/useDoubleTap';

const getEffectiveStrokeColor = (path: PathElement['data']): string => {
  if (path.strokeColor === 'none') {
    return path.isPencilPath ? '#000000' : '#00000001';
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
  const { viewport, activePlugin, eventHandlers, isElementSelected, isElementLocked, isTransforming, isSelecting, isCreatingShape } = context;
  const pathData = element.data;

  const effectiveStrokeColor = getEffectiveStrokeColor(pathData);
  const effectiveFillColor = getEffectiveFillColor(pathData);

  const pathD = commandsToString(pathData.subPaths.flat());
  const pointerDownHandler = eventHandlers.onPointerDown;
  const pointerUpHandler = eventHandlers.onPointerUp;
  const doubleClickHandler = eventHandlers.onDoubleClick;
  const touchEndHandler = eventHandlers.onTouchEnd;
  const isSelected = isElementSelected?.(element.id) ?? false;
  const isLocked = isElementLocked?.(element.id) ?? false;

  // Double-tap handler for this element
  const { handleTouchEnd: handleElementTouchEnd } = useDoubleTap({
    onDoubleTap: (event: React.TouchEvent) => {
      if (doubleClickHandler) {
        // Create a synthetic mouse event
        const syntheticEvent = {
          preventDefault: () => event.preventDefault(),
          stopPropagation: () => event.stopPropagation(),
          target: event.target,
          currentTarget: event.currentTarget,
          clientX: event.changedTouches[0]?.clientX || 0,
          clientY: event.changedTouches[0]?.clientY || 0,
          button: 0,
          type: 'dblclick',
        } as React.MouseEvent<Element>;
        
        doubleClickHandler(element.id, syntheticEvent);
      }
    },
  });

  return (
    <g key={element.id}>
      <path
        data-element-id={element.id}
        d={pathD}
        stroke={effectiveStrokeColor}
        strokeWidth={pathData.strokeWidth / viewport.zoom}
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
        onPointerDown={
          pointerDownHandler
            ? (event) => pointerDownHandler(element.id, event)
            : undefined
        }
        onPointerUp={
          pointerUpHandler ? (event) => pointerUpHandler(element.id, event) : undefined
        }
        onDoubleClick={
          doubleClickHandler
            ? (event) => doubleClickHandler(element.id, event)
            : undefined
        }
        onTouchEnd={
          touchEndHandler || handleElementTouchEnd
            ? (event) => {
                if (touchEndHandler) {
                  touchEndHandler(element.id, event);
                } else {
                  handleElementTouchEnd(event);
                }
              }
            : undefined
        }
        style={{
          cursor:
            activePlugin === 'select'
              ? isLocked
                ? 'default'
                : isSelected
                ? 'move'
                : 'pointer'
              : 'default',
          pointerEvents: (activePlugin === 'subpath' || activePlugin === 'shape' || activePlugin === 'pencil' || activePlugin === 'curves' || isTransforming || isSelecting || isCreatingShape) ? 'none' : 'auto',
        }}
      />
    </g>
  );
};

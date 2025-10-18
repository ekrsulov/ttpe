import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { Box, Text, useBreakpointValue } from '@chakra-ui/react';
import type { CanvasLayerContext } from '../../types/plugins';
import type { Bounds } from '../../utils/boundsUtils';
import type { PathElement } from '../../types';
import { commandsToString } from '../../utils/path';
import { useCanvasStore } from '../../store/canvasStore';

interface MinimapOverlayProps {
  context: CanvasLayerContext;
}

interface DragState {
  isActive: boolean;
  pointerId: number | null;
  offset: { x: number; y: number };
}

interface MinimapMetrics {
  bounds: Bounds;
  scale: number;
  offsetX: number;
  offsetY: number;
}

const MINIMAP_WIDTH = 220;
const MINIMAP_HEIGHT = 160;
const MINIMAP_MARGIN = 16;
const CONTENT_PADDING = 32;

const unionBounds = (source: Bounds | null, next: Bounds | null): Bounds | null => {
  if (!next) {
    return source;
  }

  if (!source) {
    return { ...next };
  }

  return {
    minX: Math.min(source.minX, next.minX),
    minY: Math.min(source.minY, next.minY),
    maxX: Math.max(source.maxX, next.maxX),
    maxY: Math.max(source.maxY, next.maxY),
  };
};

const expandBounds = (bounds: Bounds, padding: number): Bounds => ({
  minX: bounds.minX - padding,
  minY: bounds.minY - padding,
  maxX: bounds.maxX + padding,
  maxY: bounds.maxY + padding,
});

const getViewportBounds = (
  viewport: CanvasLayerContext['viewport'],
  canvasSize: CanvasLayerContext['canvasSize']
): Bounds => {
  const viewWidth = canvasSize.width / viewport.zoom;
  const viewHeight = canvasSize.height / viewport.zoom;
  const viewX = -viewport.panX / viewport.zoom;
  const viewY = -viewport.panY / viewport.zoom;

  return {
    minX: viewX,
    minY: viewY,
    maxX: viewX + viewWidth,
    maxY: viewY + viewHeight,
  };
};

const computeMinimapMetrics = (
  bounds: Bounds | null,
  width: number,
  height: number
): MinimapMetrics | null => {
  if (!bounds) {
    return null;
  }

  const boundsWidth = bounds.maxX - bounds.minX || 1;
  const boundsHeight = bounds.maxY - bounds.minY || 1;
  const padding = 2 * MINIMAP_MARGIN;
  const availableWidth = width - padding;
  const availableHeight = height - padding;
  const scale = Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight);
  const scaledWidth = boundsWidth * scale;
  const scaledHeight = boundsHeight * scale;
  const offsetX = (width - scaledWidth) / 2 - bounds.minX * scale;
  const offsetY = (height - scaledHeight) / 2 - bounds.minY * scale;

  return {
    bounds,
    scale,
    offsetX,
    offsetY,
  };
};

const worldToMinimap = (value: number, scale: number, offset: number): number => value * scale + offset;

const minimapToWorld = (value: number, scale: number, offset: number): number => (value - offset) / scale;

export const MinimapOverlay: React.FC<MinimapOverlayProps> = ({ context }) => {
  const {
    elements,
    isElementHidden,
    getElementBounds,
    viewport,
    canvasSize,
  } = context;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const clipPathId = useId();
  const [dragState, setDragState] = useState<DragState>({
    isActive: false,
    pointerId: null,
    offset: { x: 0, y: 0 },
  });

  const setViewport = useCanvasStore((state) => state.setViewport);

  const isDesktop = useBreakpointValue({ base: false, md: true }, { fallback: 'md' });

  const visiblePaths = useMemo(() => {
    return elements.filter((element): element is PathElement => {
      if (element.type !== 'path') {
        return false;
      }

      if (isElementHidden && isElementHidden(element.id)) {
        return false;
      }

      return true;
    });
  }, [elements, isElementHidden]);

  const contentBounds = useMemo(() => {
    let aggregate: Bounds | null = null;

    visiblePaths.forEach((element) => {
      const bounds = getElementBounds(element);
      aggregate = unionBounds(aggregate, bounds);
    });

    return aggregate ? expandBounds(aggregate, CONTENT_PADDING) : null;
  }, [getElementBounds, visiblePaths]);

  const viewportBounds = useMemo(() => getViewportBounds(viewport, canvasSize), [viewport, canvasSize]);

  const minimapMetrics = useMemo(() => {
    const combined = unionBounds(contentBounds, viewportBounds);
    return computeMinimapMetrics(combined, MINIMAP_WIDTH, MINIMAP_HEIGHT);
  }, [contentBounds, viewportBounds]);

  const handleViewportUpdate = useCallback(
    (centerX: number, centerY: number) => {
      const panX = canvasSize.width / 2 - centerX * viewport.zoom;
      const panY = canvasSize.height / 2 - centerY * viewport.zoom;

      setViewport({ panX, panY });
    },
    [canvasSize.height, canvasSize.width, setViewport, viewport.zoom]
  );

  const getWorldPoint = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!minimapMetrics || !svgRef.current) {
        return null;
      }

      const rect = svgRef.current.getBoundingClientRect();
      const localX = ((event.clientX - rect.left) / rect.width) * MINIMAP_WIDTH;
      const localY = ((event.clientY - rect.top) / rect.height) * MINIMAP_HEIGHT;

      return {
        x: minimapToWorld(localX, minimapMetrics.scale, minimapMetrics.offsetX),
        y: minimapToWorld(localY, minimapMetrics.scale, minimapMetrics.offsetY),
      };
    },
    [minimapMetrics]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!minimapMetrics) {
        return;
      }

      const worldPoint = getWorldPoint(event);
      if (!worldPoint) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const viewBounds = viewportBounds;
      const viewCenter = {
        x: viewBounds.minX + (viewBounds.maxX - viewBounds.minX) / 2,
        y: viewBounds.minY + (viewBounds.maxY - viewBounds.minY) / 2,
      };

      const isViewportHandle = (event.target as SVGElement).dataset.role === 'minimap-viewport';
      const offset = isViewportHandle
        ? {
            x: worldPoint.x - viewCenter.x,
            y: worldPoint.y - viewCenter.y,
          }
        : { x: 0, y: 0 };

      setDragState({
        isActive: true,
        pointerId: event.pointerId,
        offset,
      });

      svgRef.current?.setPointerCapture(event.pointerId);
      handleViewportUpdate(worldPoint.x - offset.x, worldPoint.y - offset.y);
    },
    [getWorldPoint, handleViewportUpdate, minimapMetrics, viewportBounds]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!dragState.isActive) {
        return;
      }

      const worldPoint = getWorldPoint(event);
      if (!worldPoint) {
        return;
      }

      handleViewportUpdate(worldPoint.x - dragState.offset.x, worldPoint.y - dragState.offset.y);
    },
    [dragState, getWorldPoint, handleViewportUpdate]
  );

  const resetDragState = useCallback(() => {
    setDragState({
      isActive: false,
      pointerId: null,
      offset: { x: 0, y: 0 },
    });
  }, []);

  const handlePointerEnd = useCallback(() => {
    if (dragState.pointerId !== null) {
      svgRef.current?.releasePointerCapture(dragState.pointerId);
    }
    if (dragState.isActive) {
      resetDragState();
    }
  }, [dragState, resetDragState]);

  if (!minimapMetrics || !isDesktop) {
    return null;
  }

  const viewBounds = viewportBounds;
  const viewportRect = {
    x: worldToMinimap(viewBounds.minX, minimapMetrics.scale, minimapMetrics.offsetX),
    y: worldToMinimap(viewBounds.minY, minimapMetrics.scale, minimapMetrics.offsetY),
    width: (viewBounds.maxX - viewBounds.minX) * minimapMetrics.scale,
    height: (viewBounds.maxY - viewBounds.minY) * minimapMetrics.scale,
  };

  const backgroundTransform = `translate(${-viewport.panX / viewport.zoom +
    canvasSize.width - MINIMAP_WIDTH - MINIMAP_MARGIN} ${
    -viewport.panY / viewport.zoom +
    canvasSize.height - MINIMAP_HEIGHT - MINIMAP_MARGIN
  }) scale(${1 / viewport.zoom})`;

  const contentTransform = `translate(${minimapMetrics.offsetX} ${minimapMetrics.offsetY}) scale(${minimapMetrics.scale}) translate(${-minimapMetrics.bounds.minX} ${-minimapMetrics.bounds.minY})`;

  return (
    <g transform={backgroundTransform} style={{ pointerEvents: 'none' }}>
      <foreignObject width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} style={{ pointerEvents: 'auto' }}>
        <Box
          width={MINIMAP_WIDTH}
          height={MINIMAP_HEIGHT}
          borderRadius="xl"
          boxShadow="0 12px 30px rgba(15, 23, 42, 0.28)"
          backdropFilter="blur(12px)"
          bg="rgba(15, 23, 42, 0.82)"
          border="1px solid rgba(148, 163, 184, 0.35)"
          overflow="hidden"
          display="flex"
          flexDirection="column"
        >
          <Box
            as="header"
            px={4}
            py={2}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            borderBottom="1px solid rgba(148, 163, 184, 0.25)"
          >
            <Text fontSize="xs" fontWeight="semibold" color="rgba(226, 232, 240, 0.85)">
              Minimap
            </Text>
            <Text fontSize="xs" color="rgba(148, 163, 184, 0.9)">
              {`${Math.round(viewport.zoom * 100)}%`}
            </Text>
          </Box>
          <Box flex="1" position="relative">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${MINIMAP_WIDTH} ${MINIMAP_HEIGHT}`}
              width="100%"
              height="100%"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onPointerLeave={handlePointerEnd}
            >
              <defs>
                <clipPath id={clipPathId}>
                  <rect x="0" y="0" width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} rx="14" ry="14" />
                </clipPath>
              </defs>
              <rect x="0" y="0" width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} fill="rgba(15, 23, 42, 0.88)" />
              <g transform={contentTransform} clipPath={`url(#${clipPathId})`}>
                {visiblePaths.map((element) => {
                  const pathData = element.data;
                  const pathString = commandsToString(pathData.subPaths.flat());
                  const hasFill = pathData.fillColor && pathData.fillColor !== 'none';

                  return (
                    <path
                      key={element.id}
                      d={pathString}
                      fill={hasFill ? pathData.fillColor : 'none'}
                      fillOpacity={hasFill ? Math.min(0.6, pathData.fillOpacity ?? 1) : 0}
                      stroke={pathData.strokeColor}
                      strokeOpacity={Math.min(0.9, pathData.strokeOpacity ?? 1)}
                      strokeWidth={1.25}
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })}
              </g>
              <rect
                x={viewportRect.x}
                y={viewportRect.y}
                width={Math.max(16, viewportRect.width)}
                height={Math.max(16, viewportRect.height)}
                fill="rgba(59, 130, 246, 0.15)"
                stroke="rgba(59, 130, 246, 0.9)"
                strokeWidth={1.5}
                rx={4}
                ry={4}
                data-role="minimap-viewport"
              />
            </svg>
          </Box>
        </Box>
      </foreignObject>
    </g>
  );
};

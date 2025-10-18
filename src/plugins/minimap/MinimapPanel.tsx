import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { Box } from '@chakra-ui/react';
import type { Bounds } from '../../utils/boundsUtils';
import { calculateBounds } from '../../utils/boundsUtils';
import type { PathElement } from '../../types';
import { useCanvasStore } from '../../store/canvasStore';

interface MinimapPanelProps {
  sidebarWidth?: number;
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
  viewport: { panX: number; panY: number; zoom: number },
  canvasSize: { width: number; height: number }
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

export const MinimapPanel: React.FC<MinimapPanelProps> = ({ sidebarWidth = 0 }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const clipPathId = useId();
  const [dragState, setDragState] = useState<DragState>({
    isActive: false,
    pointerId: null,
    offset: { x: 0, y: 0 },
  });

  // Get state from store
  const elements = useCanvasStore((state) => state.elements);
  const viewport = useCanvasStore((state) => state.viewport);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const isElementHidden = useCanvasStore((state) => state.isElementHidden);
  const showMinimap = useCanvasStore((state) => state.settings.showMinimap);

  // Helper to calculate bounds for a path element
  const getElementBounds = useCallback((element: PathElement): Bounds | null => {
    const pathData = element.data;
    if (!pathData?.subPaths || pathData.subPaths.length === 0) {
      return null;
    }
    
    const strokeWidth = pathData.strokeWidth || 0;
    return calculateBounds(pathData.subPaths, strokeWidth);
  }, []);

  // Get canvas size from viewport (we'll use a large default if not available)
  const canvasSize = useMemo(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }), []);

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

  if (!showMinimap || !minimapMetrics) {
    return null;
  }

  const viewBounds = viewportBounds;
  const viewportRect = {
    x: worldToMinimap(viewBounds.minX, minimapMetrics.scale, minimapMetrics.offsetX),
    y: worldToMinimap(viewBounds.minY, minimapMetrics.scale, minimapMetrics.offsetY),
    width: (viewBounds.maxX - viewBounds.minX) * minimapMetrics.scale,
    height: (viewBounds.maxY - viewBounds.minY) * minimapMetrics.scale,
  };

  return (
    <Box
      position="fixed"
      bottom={`${MINIMAP_MARGIN}px`}
      right={`${MINIMAP_MARGIN + sidebarWidth}px`}
      width={`${MINIMAP_WIDTH}px`}
      height={`${MINIMAP_HEIGHT}px`}
      borderRadius="xl"
      boxShadow="0 4px 20px rgba(0, 0, 0, 0.1)"
      backdropFilter="blur(12px)"
      bg="rgba(255, 255, 255, 0.95)"
      border="1px solid rgba(0, 0, 0, 0.1)"
      overflow="hidden"
      zIndex={100}
      transition="right 0.2s ease"
      display={{ base: 'none', md: 'block' }}
    >
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
        style={{ cursor: dragState.isActive ? 'grabbing' : 'grab' }}
      >
        <defs>
          <clipPath id={clipPathId}>
            <rect x="0" y="0" width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} rx="14" ry="14" />
          </clipPath>
        </defs>
        <rect x="0" y="0" width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} fill="rgba(248, 250, 252, 0.95)" />
        <g clipPath={`url(#${clipPathId})`}>
          {visiblePaths.map((element) => {
            const bounds = getElementBounds(element);
            if (!bounds) return null;

            const x = worldToMinimap(bounds.minX, minimapMetrics.scale, minimapMetrics.offsetX);
            const y = worldToMinimap(bounds.minY, minimapMetrics.scale, minimapMetrics.offsetY);
            const width = (bounds.maxX - bounds.minX) * minimapMetrics.scale;
            const height = (bounds.maxY - bounds.minY) * minimapMetrics.scale;

            return (
              <rect
                key={element.id}
                x={x}
                y={y}
                width={width}
                height={height}
                fill="rgba(59, 130, 246, 0.2)"
                stroke="rgba(59, 130, 246, 0.6)"
                strokeWidth={0.5}
                vectorEffect="non-scaling-stroke"
                rx={1}
                ry={1}
              />
            );
          })}
        </g>
        <rect
          x={viewportRect.x}
          y={viewportRect.y}
          width={Math.max(16, viewportRect.width)}
          height={Math.max(16, viewportRect.height)}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="rgba(59, 130, 246, 1)"
          strokeWidth={2}
          rx={4}
          ry={4}
          data-role="minimap-viewport"
        />
      </svg>
    </Box>
  );
};

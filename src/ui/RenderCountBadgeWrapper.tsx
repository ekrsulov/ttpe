import React from 'react';
import { RenderCountBadge } from './RenderCountBadge';
import { useRenderCount } from '../hooks/useRenderCount';
import { useCanvasStore } from '../store/canvasStore';

interface RenderCountBadgeWrapperProps {
  componentName: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  wrapperStyle?: React.CSSProperties;
}

/**
 * Development-only render count badge wrapper.
 * In production, this component renders nothing and adds no overhead.
 * In development, it tracks and displays render counts for debugging.
 */
export const RenderCountBadgeWrapper: React.FC<RenderCountBadgeWrapperProps> = ({
  componentName,
  position = 'top-left',
  wrapperStyle,
}) => {
  // Early return for production - no hooks called
  if (!import.meta.env.DEV) {
    return null;
  }

  // These hooks are only called in development
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { count: renderCount, rps: renderRps } = useRenderCount(componentName);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const showRenderCountBadges = useCanvasStore((state) => state.settings.showRenderCountBadges);

  if (!showRenderCountBadges) {
    return null;
  }

  // If wrapper style is provided (for fixed positioning), wrap in a div
  if (wrapperStyle) {
    return (
      <div style={wrapperStyle}>
        <RenderCountBadge count={renderCount} rps={renderRps} position={position} />
      </div>
    );
  }

  // Default: just render the badge
  return <RenderCountBadge count={renderCount} rps={renderRps} position={position} />;
};

import React from 'react';
import { RenderCountBadge } from './RenderCountBadge';
import { useRenderCount } from '../../hooks/useRenderCount';
import { useCanvasStore } from '../../store/canvasStore';

interface RenderCountBadgeWrapperProps {
  componentName: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  wrapperStyle?: React.CSSProperties;
}

/**
 * Shared wrapper component that handles the common pattern of:
 * - Checking NODE_ENV === 'development'
 * - Checking settings.showRenderCountBadges
 * - Using useRenderCount hook
 * - Rendering the RenderCountBadge
 * 
 * This consolidates the repeated pattern across multiple UI shells.
 */
export const RenderCountBadgeWrapper: React.FC<RenderCountBadgeWrapperProps> = ({
  componentName,
  position = 'top-left',
  wrapperStyle,
}) => {
  const { count: renderCount, rps: renderRps } = useRenderCount(componentName);
  const settings = useCanvasStore(state => state.settings);

  // Only render in development with the setting enabled
  const shouldShow = import.meta.env.DEV && settings.showRenderCountBadges;

  if (!shouldShow) {
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

import React, { useMemo } from 'react';
import { pluginManager } from '../utils/pluginManager';

interface IOSEdgeGuardProps {
  isIOS: boolean;
}

/**
 * Invisible overlay to prevent iOS back swipe from left edge.
 * Only renders on iOS devices.
 */
const IOSEdgeGuard: React.FC<IOSEdgeGuardProps> = ({ isIOS }) => {
  if (!isIOS) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '20px',
        height: '100%',
        zIndex: 9999,
        touchAction: 'none',
        backgroundColor: 'transparent',
      }}
    />
  );
};

interface GlobalOverlaysProps {
  /** Whether the device is iOS (for edge guard) */
  isIOS?: boolean;
}

/**
 * Renders global overlays from plugins and iOS edge guard.
 * Extracted from App.tsx to reduce complexity.
 */
export const GlobalOverlays: React.FC<GlobalOverlaysProps> = ({ isIOS = false }) => {
  // Get global overlays from plugins (includes MinimapPanel)
  const globalOverlays = useMemo(
    () => pluginManager.getGlobalOverlays() as React.ComponentType<Record<string, unknown>>[],
    []
  );

  return (
    <>
      {/* iOS back swipe prevention */}
      <IOSEdgeGuard isIOS={isIOS} />

      {/* Render global overlays from plugins */}
      {globalOverlays.map((OverlayComponent, index) => (
        <OverlayComponent key={`global-overlay-${index}`} />
      ))}
    </>
  );
};

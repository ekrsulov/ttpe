import { useMemo, useEffect } from 'react';

/**
 * Hook that detects iOS devices and provides iOS-specific functionality.
 * Handles prevention of back swipe gesture from left edge.
 */
export function useIOSSupport() {
  // Detect iOS devices
  const isIOS = useMemo(() => 
    /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), 
  []);

  // Prevent iOS back swipe from left edge
  useEffect(() => {
    if (!isIOS) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch && touch.clientX < 20) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isIOS]);

  return { isIOS };
}

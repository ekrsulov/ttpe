import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * Hook to detect mobile viewport.
 * Returns true if viewport width is below the mobile breakpoint.
 */
export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

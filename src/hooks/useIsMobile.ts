import { useResponsive } from './useResponsive';

/**
 * @deprecated Use useResponsive() hook instead for consistency with Chakra breakpoints.
 * This hook is kept for backwards compatibility.
 * 
 * Hook to detect mobile viewport.
 * Returns true if viewport width is below the mobile breakpoint (768px / md).
 */
export function useIsMobile(): boolean {
  const { isMobile } = useResponsive();
  return isMobile;
}

import { useBreakpointValue } from '@chakra-ui/react';

/**
 * Unified responsive hook for mobile/desktop detection.
 * Consolidates the repeated useBreakpointValue pattern across components.
 * 
 * @returns Object with isMobile and isDesktop boolean flags
 */
export function useResponsive() {
  const isMobile = useBreakpointValue({ base: true, md: false }, { fallback: 'md' }) ?? false;
  
  return {
    isMobile,
    isDesktop: !isMobile,
  };
}

import { useRef, useLayoutEffect, useState, useCallback } from 'react';

interface AnimatedBackgroundStyle {
  left: number;
  width: number;
  opacity: number;
}

/**
 * Hook that manages animated background position for toolbar buttons.
 * Handles measuring button positions and smooth transitions.
 */
export function useAnimatedBackground(activeId: string | null, dependencies: string[]) {
  const buttonRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [backgroundStyle, setBackgroundStyle] = useState<AnimatedBackgroundStyle>({ 
    left: 0, 
    width: 0, 
    opacity: 0 
  });

  // Create stable dependency string
  const depsString = dependencies.join(',');

  useLayoutEffect(() => {
    if (activeId && buttonRefs.current.has(activeId)) {
      const buttonElement = buttonRefs.current.get(activeId);
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        const parentRect = buttonElement.parentElement?.getBoundingClientRect();
        if (parentRect) {
          setBackgroundStyle({
            left: rect.left - parentRect.left,
            width: rect.width,
            opacity: 1,
          });
        }
      }
    } else {
      setBackgroundStyle(prev => ({ ...prev, opacity: 0 }));
    }
  }, [activeId, depsString]);

  const setButtonRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      buttonRefs.current.set(id, el);
    } else {
      buttonRefs.current.delete(id);
    }
  }, []);

  return {
    backgroundStyle,
    setButtonRef,
  };
}

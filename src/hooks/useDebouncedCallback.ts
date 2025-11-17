import { useRef, useEffect, useCallback } from 'react';

/**
 * useDebouncedCallback
 * Returns a stable debounced callback which delays invoking the given function
 * until `delay` milliseconds have passed without subsequent calls.
 */
// NOTE: Using `any` is acceptable here since we're intentionally creating a
// generic debounced callback that forwards arbitrary arguments.
/* eslint-disable @typescript-eslint/no-explicit-any */
export function useDebouncedCallback<T extends (...args: any[]) => void>(fn: T, delay: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const debounced = useCallback((...args: Parameters<T>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      fnRef.current(...args);
    }, delay);
  }, [delay]);

  return debounced;
}

export default useDebouncedCallback;

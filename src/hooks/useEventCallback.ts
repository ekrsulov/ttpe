import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * A hook that returns a memoized callback which always has access to the latest state/props
 * without changing its reference identity.
 * 
 * This is useful for event handlers that need to access fresh state but shouldn't cause
 * re-subscriptions or re-renders in child components.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEventCallback<T extends (...args: any[]) => any>(fn: T): T {
    const ref = useRef(fn);

    useLayoutEffect(() => {
        ref.current = fn;
    });

    return useCallback((...args: Parameters<T>) => {
        return ref.current(...args);
    }, []) as T;
}

import { createContext, useContext } from 'react';

/**
 * Helper to create a typed context with a custom hook that throws if used outside provider.
 * Reduces boilerplate when creating new contexts.
 * 
 * @example
 * const [MyContext, useMyContext] = createTypedContext<MyContextValue>('MyContext');
 */
export function createTypedContext<T>(
  displayName: string
): [React.Context<T | null>, () => T] {
  const Context = createContext<T | null>(null);
  Context.displayName = displayName;

  function useTypedContext(): T {
    const context = useContext(Context);
    if (!context) {
      throw new Error(`use${displayName} must be used within ${displayName}.Provider`);
    }
    return context;
  }

  return [Context, useTypedContext];
}

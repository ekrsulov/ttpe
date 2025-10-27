/**
 * Utility for safely handling optional function props
 * Eliminates the need for `?? (() => {})` patterns throughout components
 */

const noOp = () => {};

/**
 * Returns the provided function or a no-op if undefined.
 * Use this to ensure function props are always callable.
 * 
 * @param fn - Optional function
 * @returns The function or a no-op
 * 
 * @example
 * ```tsx
 * <Component onUpdate={safeFunction(updateState)} />
 * ```
 */
export function safeFunction<T extends (...args: never[]) => unknown>(
  fn: T | undefined
): T {
  return (fn ?? noOp) as T;
}

/**
 * Returns an object with all function properties safely wrapped.
 * Undefined functions are replaced with no-ops.
 * 
 * @param obj - Object with optional function properties
 * @returns Object with safe function properties
 * 
 * @example
 * ```tsx
 * const safeFns = safeFunctions({
 *   onUpdate: updateState,
 *   onDelete: deleteState,
 *   onReset: undefined
 * });
 * <Component {...safeFns} />
 * ```
 */
export function safeFunctions<T extends Record<string, ((...args: never[]) => unknown) | undefined>>(
  obj: T
): { [K in keyof T]: NonNullable<T[K]> } {
  const result = {} as { [K in keyof T]: NonNullable<T[K]> };
  
  for (const key in obj) {
    result[key] = safeFunction(obj[key]) as NonNullable<T[typeof key]>;
  }
  
  return result;
}

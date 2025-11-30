import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for syncing state with localStorage.
 * Handles JSON serialization/deserialization automatically.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Initialize state from localStorage or use initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Failed to load "${key}" from localStorage:`, error);
      return initialValue;
    }
  });

  // Update localStorage when value changes
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(`Failed to save "${key}" to localStorage:`, error);
    }
  }, [key, storedValue]);

  // Reset to initial value
  const reset = useCallback(() => {
    setStoredValue(initialValue);
  }, [initialValue]);

  return [storedValue, setStoredValue, reset];
}

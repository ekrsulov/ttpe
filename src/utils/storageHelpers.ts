/**
 * Helper to get a value from localStorage with JSON parsing and fallback.
 * Used for initializing Zustand state from persisted values.
 */
export function getStoredValue<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Helper to save a value to localStorage with JSON stringification.
 */
export function setStoredValue<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to save "${key}" to localStorage:`, error);
  }
}

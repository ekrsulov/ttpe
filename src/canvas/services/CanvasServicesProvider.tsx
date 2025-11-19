import { createContext, type ReactNode } from 'react';

// CanvasServicesProvider is kept for future service integration
// but plugin-specific services have been moved to their respective plugins

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CanvasServicesContextValue {
  // Reserved for future generic canvas services
}

const CanvasServicesContext = createContext<CanvasServicesContextValue | null>(null);

interface CanvasServicesProviderProps {
  value: CanvasServicesContextValue;
  children: ReactNode;
}

export const CanvasServicesProvider = ({ value, children }: CanvasServicesProviderProps) => (
  <CanvasServicesContext.Provider value={value}>{children}</CanvasServicesContext.Provider>
);

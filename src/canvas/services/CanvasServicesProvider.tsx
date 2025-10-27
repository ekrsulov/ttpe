import { createContext, type ReactNode } from 'react';
import { SmoothBrushNativeService } from './SmoothBrushNativeService';

export interface CanvasServicesContextValue {
  smoothBrushService: SmoothBrushNativeService;
  registerSmoothBrushService: (service: SmoothBrushNativeService) => void;
  resetSmoothBrushService: () => void;
}

const CanvasServicesContext = createContext<CanvasServicesContextValue | null>(null);

interface CanvasServicesProviderProps {
  value: CanvasServicesContextValue;
  children: ReactNode;
}

export const CanvasServicesProvider = ({ value, children }: CanvasServicesProviderProps) => (
  <CanvasServicesContext.Provider value={value}>{children}</CanvasServicesContext.Provider>
);

// Note: useCanvasServices and useSmoothBrushNativeService were removed as they were unused.
// Consumers should directly use the context via useContext if needed in the future.

import { createContext, useContext, type ReactNode } from 'react';
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

// eslint-disable-next-line react-refresh/only-export-components
export const useCanvasServices = (): CanvasServicesContextValue => {
  const context = useContext(CanvasServicesContext);
  if (!context) {
    throw new Error('CanvasServicesContext is not available.');
  }
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSmoothBrushNativeService = (): SmoothBrushNativeService => {
  return useCanvasServices().smoothBrushService;
};

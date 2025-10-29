import { createContext, type ReactNode } from 'react';
import { PencilDrawingService } from './PencilDrawingService';

export interface CanvasServicesContextValue {
  pencilDrawingService: PencilDrawingService;
  registerPencilDrawingService: (service: PencilDrawingService) => void;
  resetPencilDrawingService: () => void;
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

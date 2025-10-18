import type { PropsWithChildren } from 'react';
import { CanvasControllerContext, useCanvasControllerSource, type CanvasControllerValue } from './CanvasControllerContext';

export type CanvasControllerProviderProps = PropsWithChildren<{
  value?: CanvasControllerValue;
}>;

export const CanvasControllerProvider = ({ value, children }: CanvasControllerProviderProps) => {
  const defaultValue = useCanvasControllerSource();
  const contextValue = value ?? defaultValue;

  return (
    <CanvasControllerContext.Provider value={contextValue}>
      {children}
    </CanvasControllerContext.Provider>
  );
};

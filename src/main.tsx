import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import './index.css'
import App from './App.tsx'
import { theme } from './theme'
import { useCanvasStore } from './store/canvasStore'
import { measurePath } from './utils/measurementUtils'

// Extend window interface for testing
declare global {
  interface Window {
    useCanvasStore?: typeof useCanvasStore;
    measurePath?: typeof measurePath;
  }
}

// Expose store and utilities for testing
window.useCanvasStore = useCanvasStore;
window.measurePath = measurePath;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </StrictMode>,
)
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
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
    <App />
  </StrictMode>,
)
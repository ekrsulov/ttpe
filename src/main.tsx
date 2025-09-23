import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useCanvasStore } from './store/canvasStore'
import { measurePath } from './utils/measurementUtils'

// Expose store and utilities for testing
(window as any).useCanvasStore = useCanvasStore;
(window as any).measurePath = measurePath;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
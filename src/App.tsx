import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import './App.css';
import type { CSSProperties } from 'react';

function App() {
  return (
    <div 
      style={{ 
        position: 'relative', 
        width: '100vw', 
        height: '100vh', 
        overflow: 'hidden',
        // Prevent overscroll/bounce on mobile
        overscrollBehavior: 'none',
        WebkitOverflowScrolling: 'touch',
        // Prevent pull-to-refresh
        touchAction: 'none',
      } as CSSProperties}
    >
      <div 
        style={{ 
          width: '100%', 
          height: '100%',
          // Allow panning gestures on canvas only
          touchAction: 'pan-x pan-y',
        }}
      >
        <Canvas />
      </div>
      <Sidebar />
    </div>
  );
}

export default App;

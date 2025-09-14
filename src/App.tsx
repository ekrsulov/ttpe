import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import './App.css';

function App() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '100%' }}>
        <Canvas />
      </div>
      <Sidebar />
    </div>
  );
}

export default App;

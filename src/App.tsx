import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import './App.css';

function App() {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1, padding: '10px' }}>
        <Canvas width={800} height={600} />
      </div>
      <Sidebar />
    </div>
  );
}

export default App;

import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Pen, Route, Square, PenTool } from 'lucide-react';
import { IconButton } from '../ui/IconButton';

export const PencilPanel: React.FC = () => {
  const { pencil, updatePencilState, setMode, activePlugin } = useCanvasStore();

  const handleReusePathToggle = () => {
    updatePencilState({ reusePath: !pencil.reusePath });
  };

  const handleCurvesToggle = () => {
    if (activePlugin === 'curves') {
      setMode('pencil');
    } else {
      setMode('curves');
    }
  };

  return (
    <div style={{ backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Pen size={16} style={{ marginRight: '6px', color: '#666' }} />
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#333' }}>Pencil</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: '#666' }}>Path Mode:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <IconButton
            onPointerUp={handleReusePathToggle}
            active={!pencil.reusePath}
            activeBgColor="#007bff"
            activeColor="#fff"
            size="custom"
            customSize="24px"
            title="New Path"
          >
            <Square size={12} />
          </IconButton>
          <IconButton
            onPointerUp={handleReusePathToggle}
            active={pencil.reusePath}
            activeBgColor="#007bff"
            activeColor="#fff"
            size="custom"
            customSize="24px"
            title="Add Subpath"
          >
            <Route size={12} />
          </IconButton>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: '#666' }}>Curves:</span>
        <IconButton
          onPointerUp={handleCurvesToggle}
          active={activePlugin === 'curves'}
          activeBgColor="#007bff"
          activeColor="#fff"
          size="custom"
          customSize="24px"
          title="Draw Curves"
        >
          <PenTool size={12} />
        </IconButton>
      </div>
    </div>
  );
};
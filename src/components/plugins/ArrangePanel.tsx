import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';

export const ArrangePanel: React.FC = () => {
  const {
    plugins,
    alignLeft,
    alignCenter,
    alignRight,
    alignTop,
    alignMiddle,
    alignBottom,
    distributeHorizontally,
    distributeVertically
  } = useCanvasStore();

  const selectedCount = plugins.select.selectedIds.length;
  const canAlign = selectedCount >= 2;
  const canDistribute = selectedCount >= 3;

  const buttonStyle = (enabled: boolean, color: string = '#007bff') => ({
    padding: '6px',
    backgroundColor: enabled ? color : '#ccc',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontSize: '11px',
    opacity: enabled ? 1 : 0.6
  });

  return (
    <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
      <h4>Arrange</h4>
      <p>Selected: {selectedCount} element(s)</p>

      {/* Alignment Section */}
      <div style={{ marginBottom: '15px' }}>
        <h5 style={{ margin: '10px 0 5px 0', fontSize: '12px', color: '#666' }}>Align</h5>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
          <button
            onClick={alignLeft}
            disabled={!canAlign}
            style={buttonStyle(canAlign)}
            title="Align Left"
          >
            ⬅️ Left
          </button>
          <button
            onClick={alignCenter}
            disabled={!canAlign}
            style={buttonStyle(canAlign, '#28a745')}
            title="Align Center"
          >
            ⬌ Center
          </button>
          <button
            onClick={alignRight}
            disabled={!canAlign}
            style={buttonStyle(canAlign, '#dc3545')}
            title="Align Right"
          >
            ➡️ Right
          </button>
          <button
            onClick={alignTop}
            disabled={!canAlign}
            style={buttonStyle(canAlign, '#ffc107')}
            title="Align Top"
          >
            ⬆️ Top
          </button>
          <button
            onClick={alignMiddle}
            disabled={!canAlign}
            style={buttonStyle(canAlign, '#17a2b8')}
            title="Align Middle"
          >
            ⬍ Middle
          </button>
          <button
            onClick={alignBottom}
            disabled={!canAlign}
            style={buttonStyle(canAlign, '#6f42c1')}
            title="Align Bottom"
          >
            ⬇️ Bottom
          </button>
        </div>
      </div>

      {/* Distribution Section */}
      <div>
        <h5 style={{ margin: '10px 0 5px 0', fontSize: '12px', color: '#666' }}>Distribute</h5>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px' }}>
          <button
            onClick={distributeHorizontally}
            disabled={!canDistribute}
            style={buttonStyle(canDistribute, '#fd7e14')}
            title="Distribute Horizontally"
          >
            ↔️ Horizontal
          </button>
          <button
            onClick={distributeVertically}
            disabled={!canDistribute}
            style={buttonStyle(canDistribute, '#e83e8c')}
            title="Distribute Vertically"
          >
            ↕️ Vertical
          </button>
        </div>
        {!canDistribute && (
          <p style={{ fontSize: '11px', color: '#999', margin: '5px 0 0 0' }}>
            Select 3+ elements to enable distribution
          </p>
        )}
      </div>
    </div>
  );
};
import React from 'react';
import { PaintBucket } from 'lucide-react';

interface EditPanelProps {
  activePlugin: string | null;
  smoothBrush: {
    radius: number;
    strength: number;
    isActive: boolean;
    cursorX: number;
    cursorY: number;
    simplifyPoints: boolean;
    simplificationTolerance: number;
    minDistance: number;
    affectedPoints: Array<{
      commandIndex: number;
      pointIndex: number;
      x: number;
      y: number;
    }>;
  };
  selectedCommands: Array<{
    elementId: string;
    commandIndex: number;
    pointIndex: number;
  }>;
  updateSmoothBrush: (brush: Partial<EditPanelProps['smoothBrush']>) => void;
  applySmoothBrush: () => void;
  activateSmoothBrush: () => void;
  deactivateSmoothBrush: () => void;
}

export const EditPanel: React.FC<EditPanelProps> = ({
  activePlugin,
  smoothBrush,
  selectedCommands,
  updateSmoothBrush,
  applySmoothBrush,
  activateSmoothBrush,
  deactivateSmoothBrush,
}) => {
  if (activePlugin !== 'edit') return null;

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <PaintBucket size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Smooth Brush</span>
      </div>

      {/* Brush Mode Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '8px',
        gap: '8px'
      }}>
        <span style={{ fontSize: '11px', color: '#666' }}>Brush Mode:</span>
        <button
          onClick={() => {
            if (smoothBrush.isActive) {
              deactivateSmoothBrush();
            } else {
              activateSmoothBrush();
            }
          }}
          style={{
            padding: '4px 8px',
            backgroundColor: smoothBrush.isActive ? '#007bff' : '#f8f9fa',
            color: smoothBrush.isActive ? 'white' : '#333',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          {smoothBrush.isActive ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Radius Slider - only show when brush mode is active */}
      {smoothBrush.isActive && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '8px',
          gap: '8px'
        }}>
          <span style={{ fontSize: '11px', color: '#666', minWidth: '40px' }}>Radius:</span>
          <input
            type="range"
            min="6"
            max="60"
            step="1"
            value={smoothBrush.radius}
            onChange={(e) => updateSmoothBrush({ radius: parseInt(e.target.value) })}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: '#ddd',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <span style={{
            fontSize: '10px',
            color: '#666',
            width: '25px',
            textAlign: 'right'
          }}>
            {smoothBrush.radius}
          </span>
        </div>
      )}

      {/* Strength Slider */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '8px',
        gap: '8px'
      }}>
        <span style={{ fontSize: '11px', color: '#666', minWidth: '40px' }}>Strength:</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={smoothBrush.strength}
          onChange={(e) => updateSmoothBrush({ strength: parseFloat(e.target.value) })}
          style={{
            flex: 1,
            height: '4px',
            borderRadius: '2px',
            background: '#ddd',
            outline: 'none',
            cursor: 'pointer'
          }}
        />
        <span style={{
          fontSize: '10px',
          color: '#666',
          width: '35px',
          textAlign: 'right'
        }}>
          {(smoothBrush.strength * 100).toFixed(0)}%
        </span>
      </div>

      {/* Simplify Points Checkbox */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '8px',
        gap: '8px'
      }}>
        <input
          type="checkbox"
          id="simplifyPoints"
          checked={smoothBrush.simplifyPoints}
          onChange={(e) => updateSmoothBrush({ simplifyPoints: e.target.checked })}
          style={{
            width: '12px',
            height: '12px',
            cursor: 'pointer'
          }}
        />
        <label
          htmlFor="simplifyPoints"
          style={{
            fontSize: '11px',
            color: '#666',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          Simplify Points
        </label>
      </div>

      {/* Simplification Tolerance Slider - only show when simplify points is enabled */}
      {smoothBrush.simplifyPoints && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '8px',
          gap: '8px'
        }}>
          <span style={{ fontSize: '11px', color: '#666', minWidth: '40px' }}>Tolerance:</span>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={smoothBrush.simplificationTolerance}
            onChange={(e) => updateSmoothBrush({ simplificationTolerance: parseFloat(e.target.value) })}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: '#ddd',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <span style={{
            fontSize: '10px',
            color: '#666',
            width: '30px',
            textAlign: 'right'
          }}>
            {smoothBrush.simplificationTolerance.toFixed(1)}
          </span>
        </div>
      )}

      {/* Minimum Distance Slider - only show when simplify points is enabled */}
      {smoothBrush.simplifyPoints && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '8px',
          gap: '8px'
        }}>
          <span style={{ fontSize: '11px', color: '#666', minWidth: '40px' }}>Min Dist:</span>
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            value={smoothBrush.minDistance}
            onChange={(e) => updateSmoothBrush({ minDistance: parseFloat(e.target.value) })}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: '#ddd',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <span style={{
            fontSize: '10px',
            color: '#666',
            width: '30px',
            textAlign: 'right'
          }}>
            {smoothBrush.minDistance.toFixed(1)}
          </span>
        </div>
      )}

      {/* Apply Button - show when brush mode is OFF or when brush is ON but has selected points */}
      {(!smoothBrush.isActive || (smoothBrush.isActive && selectedCommands.length > 0)) && (
        <button
          onClick={() => {
            applySmoothBrush();
          }}
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          {smoothBrush.isActive && selectedCommands.length > 0
            ? `Apply Smooth to ${selectedCommands.length} Selected Point${selectedCommands.length === 1 ? '' : 's'}`
            : 'Apply Smooth Brush'
          }
        </button>
      )}

      {/* Instructions */}
      {smoothBrush.isActive && (
        <div style={{
          fontSize: '11px',
          color: '#666',
          marginTop: '8px',
          lineHeight: '1.4'
        }}>
          {selectedCommands.length > 0
            ? `Click "Apply Smooth" to smooth ${selectedCommands.length} selected point${selectedCommands.length === 1 ? '' : 's'}.`
            : 'Click and drag to apply smoothing. Points within the brush radius will be smoothed.'
          }
        </div>
      )}
    </div>
  );
};
import React from 'react';
import { PaintBucket, Zap, RotateCcw } from 'lucide-react';
import { SliderControl } from '../ui/SliderControl';

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
  pathSimplification: {
    tolerance: number;
  };
  pathRounding: {
    radius: number;
  };
  selectedCommands: Array<{
    elementId: string;
    commandIndex: number;
    pointIndex: number;
  }>;
  updateSmoothBrush: (brush: Partial<EditPanelProps['smoothBrush']>) => void;
  updatePathSimplification: (settings: Partial<EditPanelProps['pathSimplification']>) => void;
  updatePathRounding: (settings: Partial<EditPanelProps['pathRounding']>) => void;
  applySmoothBrush: () => void;
  applyPathSimplification: () => void;
  applyPathRounding: () => void;
  activateSmoothBrush: () => void;
  deactivateSmoothBrush: () => void;
  resetSmoothBrush: () => void;
}

export const EditPanel: React.FC<EditPanelProps> = ({
  activePlugin,
  smoothBrush,
  pathSimplification,
  pathRounding,
  selectedCommands,
  updateSmoothBrush,
  updatePathSimplification,
  updatePathRounding,
  applySmoothBrush,
  applyPathSimplification,
  applyPathRounding,
  activateSmoothBrush,
  deactivateSmoothBrush,
  resetSmoothBrush,
}) => {
  if (activePlugin !== 'edit') return null;

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '8px',
        backgroundColor: '#f5f5f5',
        padding: '4px 8px',
        borderRadius: '4px'
      }}>
        <PaintBucket size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '800', color: '#333' }}>Smooth Brush</span>
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
        
        <button
          onClick={resetSmoothBrush}
          style={{
            padding: '4px 8px',
            backgroundColor: '#f8f9fa',
            color: '#666',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer',
            marginLeft: '4px'
          }}
          title="Reset all smooth brush settings to defaults"
        >
          Reset
        </button>
      </div>

      {/* Radius Slider - only show when brush mode is active */}
      {smoothBrush.isActive && (
        <SliderControl
          label="Radius:"
          value={smoothBrush.radius}
          min={6}
          max={60}
          step={1}
          onChange={(value) => updateSmoothBrush({ radius: value })}
          labelWidth="40px"
          valueWidth="25px"
        />
      )}

      {/* Strength Slider */}
      <SliderControl
        label="Strength:"
        value={smoothBrush.strength}
        min={0}
        max={1}
        step={0.01}
        onChange={(value) => updateSmoothBrush({ strength: value })}
        formatter={(value) => `${(value * 100).toFixed(0)}%`}
        labelWidth="40px"
        valueWidth="35px"
      />

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
        <SliderControl
          label="Tolerance:"
          value={smoothBrush.simplificationTolerance}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(value) => updateSmoothBrush({ simplificationTolerance: value })}
          formatter={(value) => value.toFixed(1)}
          labelWidth="40px"
          valueWidth="30px"
        />
      )}

      {/* Minimum Distance Slider - only show when simplify points is enabled */}
      {smoothBrush.simplifyPoints && (
        <SliderControl
          label="Min Dist:"
          value={smoothBrush.minDistance}
          min={0.1}
          max={5.0}
          step={0.1}
          onChange={(value) => updateSmoothBrush({ minDistance: value })}
          formatter={(value) => value.toFixed(1)}
          labelWidth="40px"
          valueWidth="30px"
        />
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
            backgroundColor: '#f8f9fa',
            color: '#333',
            border: '1px solid #dee2e6',
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

      {/* Path Simplification Section */}
      <div style={{
        marginTop: '12px',
        paddingTop: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '8px',
          backgroundColor: '#f5f5f5',
          padding: '4px 8px',
          borderRadius: '4px'
        }}>
          <Zap size={16} style={{ marginRight: '6px', color: '#666' }} />
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#333' }}>Path Simplification</span>
        </div>

        <SliderControl
          label="Tolerance:"
          value={pathSimplification.tolerance}
          min={0.01}
          max={10}
          step={0.01}
          onChange={(value) => updatePathSimplification({ tolerance: value })}
          formatter={(value) => value.toFixed(2)}
          labelWidth="50px"
          valueWidth="35px"
        />

        {/* Apply Button */}
        <button
          onClick={() => applyPathSimplification()}
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: '#f8f9fa',
            color: '#333',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            marginTop: '8px'
          }}
        >
          Simplify Path
        </button>
      </div>

      {/* Round Path Section */}
      <div style={{
        marginTop: '12px',
        paddingTop: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '8px',
          backgroundColor: '#f5f5f5',
          padding: '4px 8px',
          borderRadius: '4px'
        }}>
          <RotateCcw size={16} style={{ marginRight: '6px', color: '#666' }} />
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#333' }}>Round Path</span>
        </div>

        <SliderControl
          label="Radius:"
          value={pathRounding.radius}
          min={0.1}
          max={50}
          step={0.1}
          onChange={(value) => updatePathRounding({ radius: value })}
          formatter={(value) => value.toFixed(1)}
          labelWidth="50px"
          valueWidth="35px"
        />

        {/* Apply Button */}
        <button
          onClick={() => applyPathRounding()}
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: '#f8f9fa',
            color: '#333',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            marginTop: '8px'
          }}
        >
          Round Path
        </button>
      </div>
    </div>
  );
};
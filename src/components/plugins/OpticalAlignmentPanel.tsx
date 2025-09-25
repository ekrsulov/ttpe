import React, { useEffect, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { IconButton } from '../ui/IconButton';
import {
  Target,
  Play,
  RotateCcw,
  Eye,
  Crosshair,
  BarChart3,
  Ruler
} from 'lucide-react';

export const OpticalAlignmentPanel: React.FC = () => {
  const {
    // Basic canvas state
    selectedIds,
    selectedSubpaths,
    activePlugin,
    // Optical alignment state
    currentAlignment,
    showMathematicalCenter,
    showOpticalCenter,
    showMetrics,
    showDistanceRules,
    // Optical alignment actions
    applyAlignment,
    previewAlignment,
    resetAlignment,
    toggleMathematicalCenter,
    toggleOpticalCenter,
    toggleMetrics,
    toggleDistanceRules,
    canPerformOpticalAlignment,
    getAlignmentValidationMessage
  } = useCanvasStore();

  // Local state only for UI
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // Use store state
  const hasAlignment = currentAlignment !== null;

  // Validate alignment conditions
  useEffect(() => {
    const message = getAlignmentValidationMessage();
    setValidationMessage(message);
  }, [activePlugin, selectedIds.length, selectedSubpaths.length, getAlignmentValidationMessage]);

  // Apply alignment
  const handleApplyAlignment = () => {
    if (!hasAlignment) return;
    applyAlignment();
  };

  // Reset alignment
  const handleResetAlignment = () => {
    resetAlignment();
  };

  // Preview alignment
  const handlePreviewAlignment = () => {
    if (!canPerformOpticalAlignment()) return;
    previewAlignment();
  };

  if (activePlugin !== 'select') return null;

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <Target size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Optical Alignment</span>
      </div>

      {/* Validation Message */}
      {validationMessage && (
        <div style={{
          padding: '6px 8px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '3px',
          marginBottom: '8px',
          fontSize: '11px',
          color: '#856404'
        }}>
          {validationMessage}
        </div>
      )}

      {/* Controls */}
      {canPerformOpticalAlignment() && (
        <>
          {/* Visualization Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '8px',
            gap: '8px'
          }}>
            <span style={{ fontSize: '11px', color: '#666' }}>Show:</span>
            
            <IconButton
              size="small"
              onClick={toggleMathematicalCenter}
              active={showMathematicalCenter}
              title="Mathematical Center"
            >
              <Crosshair size={16} />
            </IconButton>
            
            <IconButton
              size="small"
              onClick={toggleOpticalCenter}
              active={showOpticalCenter}
              title="Optical Center"
            >
              <Target size={16} />
            </IconButton>
            
            <IconButton
              size="small"
              onClick={toggleMetrics}
              active={showMetrics}
              title="Show Metrics"
            >
              <BarChart3 size={16} />
            </IconButton>
            
            <IconButton
              size="small"
              onClick={toggleDistanceRules}
              active={showDistanceRules}
              title="Show Distance Rules"
            >
              <Ruler size={16} />
            </IconButton>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '6px',
            marginBottom: '8px'
          }}>
            <button
              onClick={handlePreviewAlignment}
              disabled={!canPerformOpticalAlignment()}
              style={{
                flex: 1,
                padding: '6px 8px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                fontSize: '11px',
                cursor: canPerformOpticalAlignment() ? 'pointer' : 'not-allowed',
                opacity: canPerformOpticalAlignment() ? 1 : 0.6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <Eye size={12} />
              Preview
            </button>

            <button
              onClick={handleApplyAlignment}
              disabled={!hasAlignment}
              style={{
                flex: 1,
                padding: '6px 8px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                fontSize: '11px',
                cursor: hasAlignment ? 'pointer' : 'not-allowed',
                opacity: hasAlignment ? 1 : 0.6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <Play size={12} />
              Apply
            </button>

            <IconButton
              size="small"
              onClick={handleResetAlignment}
              disabled={!hasAlignment}
              title="Reset"
            >
              <RotateCcw size={16} />
            </IconButton>
          </div>

          {/* Metrics Display */}
          {showMetrics && currentAlignment && (
            <div style={{
              padding: '6px 8px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              fontSize: '10px'
            }}>
              <div style={{ 
                fontSize: '11px', 
                fontWeight: '500', 
                marginBottom: '4px',
                color: '#666'
              }}>
                Calculations:
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '4px' }}>
                <div>
                  <div style={{ color: '#6c757d' }}>Math Center:</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '9px' }}>
                    ({currentAlignment.metrics.mathematicalCenter.x.toFixed(1)}, {currentAlignment.metrics.mathematicalCenter.y.toFixed(1)})
                  </div>
                </div>
                <div>
                  <div style={{ color: '#ff6b35' }}>Optical Center:</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '9px' }}>
                    ({currentAlignment.metrics.opticalCenter.x.toFixed(1)}, {currentAlignment.metrics.opticalCenter.y.toFixed(1)})
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                <div>
                  <div style={{ color: '#666' }}>Visual Weight:</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '9px' }}>
                    {currentAlignment.metrics.totalVisualWeight.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#666' }}>Asymmetry:</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '9px' }}>
                    {currentAlignment.metrics.asymmetryIndex.toFixed(2)}
                  </div>
                </div>
              </div>

              {currentAlignment.content.length > 0 && (
                <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #e9ecef' }}>
                  <div style={{ color: '#666', marginBottom: '2px' }}>Content Items:</div>
                  {currentAlignment.content.map((item, index) => (
                    <div key={index} style={{ fontSize: '9px', fontFamily: 'monospace', marginBottom: '1px' }}>
                      #{index + 1}: Weight {item.visualWeight.toFixed(2)} → ({item.opticalCenter.x.toFixed(1)}, {item.opticalCenter.y.toFixed(1)})
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
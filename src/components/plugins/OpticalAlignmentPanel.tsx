import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { IconButton } from '../ui/IconButton';
import { PanelWithHeader } from '../ui/PanelComponents';
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

  // Use store state
  const hasAlignment = currentAlignment !== null;

  // Apply alignment
  const handleApplyAlignment = () => {
    if (!hasAlignment) return;
    applyAlignment();
    // After applying, show preview again to maintain visual feedback
    previewAlignment();
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

  if (getAlignmentValidationMessage() !== null) return null;

  return (
    <PanelWithHeader icon={<Target size={16} />} title="Optical Alignment">
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '4px' }}>
                <div>
                  <div style={{ color: '#6c757d' }}>Math Center:</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '9px' }}>
                    ({currentAlignment.metrics.mathematicalCenter.x.toFixed(1)}, {currentAlignment.metrics.mathematicalCenter.y.toFixed(1)})
                  </div>
                </div>
                <div>
                  <div style={{ color: '#6c757d' }}>Optical Center:</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '9px' }}>
                    ({currentAlignment.metrics.opticalCenter.x.toFixed(1)}, {currentAlignment.metrics.opticalCenter.y.toFixed(1)})
                  </div>
                </div>
              </div>

              {currentAlignment.content.length > 0 && (
                <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #e9ecef' }}>
                  {/* Container Information */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ color: '#666', marginBottom: '4px', fontWeight: 'bold' }}>Container - {currentAlignment.container.geometry.shapeClassification}:</div>
                    
                    {/* Basic Geometry */}
                    <div style={{ fontSize: '9px', marginBottom: '4px' }}>
                      <div style={{ fontFamily: 'monospace' }}>
                        Area: {currentAlignment.container.geometry.area.toFixed(1)}px², 
                        Perimeter: {currentAlignment.container.geometry.perimeter.toFixed(1)}px
                      </div>
                      <div style={{ fontFamily: 'monospace' }}>
                        Bounds: [{currentAlignment.container.geometry.bounds.minX.toFixed(1)}, {currentAlignment.container.geometry.bounds.minY.toFixed(1)}] → [{currentAlignment.container.geometry.bounds.maxX.toFixed(1)}, {currentAlignment.container.geometry.bounds.maxY.toFixed(1)}]
                      </div>
                      <div style={{ fontFamily: 'monospace' }}>
                        Centroid: ({currentAlignment.container.geometry.centroid.x.toFixed(1)}, {currentAlignment.container.geometry.centroid.y.toFixed(1)})
                      </div>
                    </div>

                    {/* Advanced Geometry */}
                    <div style={{ fontSize: '9px', marginBottom: '4px' }}>
                      <div style={{ fontFamily: 'monospace' }}>
                        Compactness: {currentAlignment.container.geometry.compactness.toFixed(3)}, 
                        Vertices: {currentAlignment.container.geometry.vertexCount}
                      </div>
                      <div style={{ fontFamily: 'monospace' }}>
                        Quadrant Weights: TL:{currentAlignment.container.geometry.quadrantWeights.topLeft.toFixed(2)} TR:{currentAlignment.container.geometry.quadrantWeights.topRight.toFixed(2)} BL:{currentAlignment.container.geometry.quadrantWeights.bottomLeft.toFixed(2)} BR:{currentAlignment.container.geometry.quadrantWeights.bottomRight.toFixed(2)}
                      </div>
                      <div style={{ fontFamily: 'monospace' }}>
                        Directional Bias: H:{currentAlignment.container.geometry.directionalBias.horizontal.toFixed(2)} V:{currentAlignment.container.geometry.directionalBias.vertical.toFixed(2)}
                      </div>
                    </div>

                    {/* Visual Properties */}
                    <div style={{ fontSize: '9px' }}>
                      <div style={{ fontFamily: 'monospace' }}>
                        Stroke: {currentAlignment.container.geometry.visualProperties.strokeWidth}px {currentAlignment.container.geometry.visualProperties.strokeColor} ({(currentAlignment.container.geometry.visualProperties.strokeOpacity * 100).toFixed(0)}%)
                      </div>
                      <div style={{ fontFamily: 'monospace' }}>
                        Fill: {currentAlignment.container.geometry.visualProperties.fillColor} ({(currentAlignment.container.geometry.visualProperties.fillOpacity * 100).toFixed(0)}%)
                      </div>
                      <div style={{ fontFamily: 'monospace' }}>
                        Visual: Intensity {currentAlignment.container.geometry.visualProperties.visualIntensity.toFixed(2)}, Contrast {currentAlignment.container.geometry.visualProperties.contrastWeight.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Content Information */}
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e9ecef' }}>
                    <div style={{ color: '#666', marginBottom: '4px', fontWeight: 'bold' }}>Content Item - {currentAlignment.content[0].geometry.shapeClassification}:</div>
                    
                    {(() => {
                      const item = currentAlignment.content[0];
                      return (
                        <div>
                          {/* Basic Geometry */}
                          <div style={{ fontSize: '9px', marginBottom: '4px' }}>
                            <div style={{ fontFamily: 'monospace' }}>
                              Area: {item.geometry.area.toFixed(1)}px², 
                              Perimeter: {item.geometry.perimeter.toFixed(1)}px
                            </div>
                            <div style={{ fontFamily: 'monospace' }}>
                              Bounds: [{item.geometry.bounds.minX.toFixed(1)}, {item.geometry.bounds.minY.toFixed(1)}] → [{item.geometry.bounds.maxX.toFixed(1)}, {item.geometry.bounds.maxY.toFixed(1)}]
                            </div>
                            <div style={{ fontFamily: 'monospace' }}>
                              Centroid: ({item.geometry.centroid.x.toFixed(1)}, {item.geometry.centroid.y.toFixed(1)})
                            </div>
                            <div style={{ fontFamily: 'monospace' }}>
                              Optical Center: ({item.opticalCenter.x.toFixed(1)}, {item.opticalCenter.y.toFixed(1)})
                            </div>
                          </div>

                          {/* Advanced Geometry */}
                          <div style={{ fontSize: '9px', marginBottom: '4px' }}>
                            <div style={{ fontFamily: 'monospace' }}>
                              Compactness: {item.geometry.compactness.toFixed(3)}, 
                              Vertices: {item.geometry.vertexCount}
                            </div>
                            <div style={{ fontFamily: 'monospace' }}>
                              Quadrant Weights: TL:{item.geometry.quadrantWeights.topLeft.toFixed(2)} TR:{item.geometry.quadrantWeights.topRight.toFixed(2)} BL:{item.geometry.quadrantWeights.bottomLeft.toFixed(2)} BR:{item.geometry.quadrantWeights.bottomRight.toFixed(2)}
                            </div>
                            <div style={{ fontFamily: 'monospace' }}>
                              Directional Bias: H:{item.geometry.directionalBias.horizontal.toFixed(2)} V:{item.geometry.directionalBias.vertical.toFixed(2)}
                            </div>
                          </div>

                          {/* Visual Properties */}
                          <div style={{ fontSize: '9px', marginBottom: '4px' }}>
                            <div style={{ fontFamily: 'monospace' }}>
                              Stroke: {item.geometry.visualProperties.strokeWidth}px {item.geometry.visualProperties.strokeColor} ({(item.geometry.visualProperties.strokeOpacity * 100).toFixed(0)}%)
                            </div>
                            <div style={{ fontFamily: 'monospace' }}>
                              Fill: {item.geometry.visualProperties.fillColor} ({(item.geometry.visualProperties.fillOpacity * 100).toFixed(0)}%)
                            </div>
                            <div style={{ fontFamily: 'monospace' }}>
                              Visual: Intensity {item.geometry.visualProperties.visualIntensity.toFixed(2)}, Contrast {item.geometry.visualProperties.contrastWeight.toFixed(2)}
                            </div>
                          </div>

                          {/* Weight Information */}
                          <div style={{ fontSize: '9px' }}>
                            <div style={{ fontFamily: 'monospace' }}>
                              Visual Weight: {item.visualWeight.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </PanelWithHeader>
  );
};
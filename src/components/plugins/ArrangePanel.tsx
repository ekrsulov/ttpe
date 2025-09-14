import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  MoveHorizontal,
  MoveVertical
} from 'lucide-react';

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

  return (
    <div style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <AlignCenter size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Arrange</span>
        {selectedCount > 0 && (
          <span style={{ fontSize: '10px', color: '#007bff', marginLeft: '6px' }}>
            ({selectedCount})
          </span>
        )}
      </div>

      {/* Alignment Section */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px', fontWeight: '500' }}>Align</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
          <button
            onClick={alignLeft}
            disabled={!canAlign}
            style={{
              padding: '6px',
              backgroundColor: canAlign ? '#007bff' : '#f8f9fa',
              color: canAlign ? '#fff' : '#6c757d',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: canAlign ? 'pointer' : 'not-allowed',
              fontSize: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px'
            }}
            title="Align Left"
          >
            <AlignLeft size={12} />
            <span>Left</span>
          </button>

          <button
            onClick={alignCenter}
            disabled={!canAlign}
            style={{
              padding: '6px',
              backgroundColor: canAlign ? '#28a745' : '#f8f9fa',
              color: canAlign ? '#fff' : '#6c757d',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: canAlign ? 'pointer' : 'not-allowed',
              fontSize: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px'
            }}
            title="Align Center"
          >
            <AlignHorizontalJustifyCenter size={12} />
            <span>Center</span>
          </button>

          <button
            onClick={alignRight}
            disabled={!canAlign}
            style={{
              padding: '6px',
              backgroundColor: canAlign ? '#dc3545' : '#f8f9fa',
              color: canAlign ? '#fff' : '#6c757d',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: canAlign ? 'pointer' : 'not-allowed',
              fontSize: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px'
            }}
            title="Align Right"
          >
            <AlignRight size={12} />
            <span>Right</span>
          </button>

          <button
            onClick={alignTop}
            disabled={!canAlign}
            style={{
              padding: '6px',
              backgroundColor: canAlign ? '#ffc107' : '#f8f9fa',
              color: canAlign ? '#000' : '#6c757d',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: canAlign ? 'pointer' : 'not-allowed',
              fontSize: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px'
            }}
            title="Align Top"
          >
            <AlignVerticalJustifyStart size={12} />
            <span>Top</span>
          </button>

          <button
            onClick={alignMiddle}
            disabled={!canAlign}
            style={{
              padding: '6px',
              backgroundColor: canAlign ? '#17a2b8' : '#f8f9fa',
              color: canAlign ? '#fff' : '#6c757d',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: canAlign ? 'pointer' : 'not-allowed',
              fontSize: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px'
            }}
            title="Align Middle"
          >
            <AlignVerticalJustifyCenter size={12} />
            <span>Middle</span>
          </button>

          <button
            onClick={alignBottom}
            disabled={!canAlign}
            style={{
              padding: '6px',
              backgroundColor: canAlign ? '#6f42c1' : '#f8f9fa',
              color: canAlign ? '#fff' : '#6c757d',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: canAlign ? 'pointer' : 'not-allowed',
              fontSize: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px'
            }}
            title="Align Bottom"
          >
            <AlignVerticalJustifyEnd size={12} />
            <span>Bottom</span>
          </button>
        </div>
      </div>

      {/* Distribution Section */}
      <div>
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px', fontWeight: '500' }}>Distribute</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px' }}>
          <button
            onClick={distributeHorizontally}
            disabled={!canDistribute}
            style={{
              padding: '6px',
              backgroundColor: canDistribute ? '#fd7e14' : '#f8f9fa',
              color: canDistribute ? '#fff' : '#6c757d',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: canDistribute ? 'pointer' : 'not-allowed',
              fontSize: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px'
            }}
            title="Distribute Horizontally"
          >
            <MoveHorizontal size={12} />
            <span>Horizontal</span>
          </button>

          <button
            onClick={distributeVertically}
            disabled={!canDistribute}
            style={{
              padding: '6px',
              backgroundColor: canDistribute ? '#e83e8c' : '#f8f9fa',
              color: canDistribute ? '#fff' : '#6c757d',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: canDistribute ? 'pointer' : 'not-allowed',
              fontSize: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px'
            }}
            title="Distribute Vertically"
          >
            <MoveVertical size={12} />
            <span>Vertical</span>
          </button>
        </div>

        {!canDistribute && (
          <div style={{ fontSize: '10px', color: '#999', marginTop: '4px', textAlign: 'center' }}>
            Select 3+ elements
          </div>
        )}
      </div>
    </div>
  );
};
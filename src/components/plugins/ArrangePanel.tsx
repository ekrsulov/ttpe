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
    selectedIds,
    alignLeft,
    alignCenter,
    alignRight,
    alignTop,
    alignMiddle,
    alignBottom,
    distributeHorizontally,
    distributeVertically
  } = useCanvasStore();

  const selectedCount = selectedIds.length;
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

      {/* Alignment and Distribution controls */}
      <div style={{ display: 'flex', gap: '2px' }}>
        {/* Align Left */}
        <button
          onClick={alignLeft}
          disabled={!canAlign}
          style={{
            padding: '6px',
            backgroundColor: canAlign ? '#f8f9fa' : '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: canAlign ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Align Left"
        >
          <AlignLeft size={12} />
        </button>

        {/* Align Center */}
        <button
          onClick={alignCenter}
          disabled={!canAlign}
          style={{
            padding: '6px',
            backgroundColor: canAlign ? '#f8f9fa' : '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: canAlign ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Align Center"
        >
          <AlignHorizontalJustifyCenter size={12} />
        </button>

        {/* Align Right */}
        <button
          onClick={alignRight}
          disabled={!canAlign}
          style={{
            padding: '6px',
            backgroundColor: canAlign ? '#f8f9fa' : '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: canAlign ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Align Right"
        >
          <AlignRight size={12} />
        </button>

        {/* Align Top */}
        <button
          onClick={alignTop}
          disabled={!canAlign}
          style={{
            padding: '6px',
            backgroundColor: canAlign ? '#f8f9fa' : '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: canAlign ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Align Top"
        >
          <AlignVerticalJustifyStart size={12} />
        </button>

        {/* Align Middle */}
        <button
          onClick={alignMiddle}
          disabled={!canAlign}
          style={{
            padding: '6px',
            backgroundColor: canAlign ? '#f8f9fa' : '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: canAlign ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Align Middle"
        >
          <AlignVerticalJustifyCenter size={12} />
        </button>

        {/* Align Bottom */}
        <button
          onClick={alignBottom}
          disabled={!canAlign}
          style={{
            padding: '6px',
            backgroundColor: canAlign ? '#f8f9fa' : '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: canAlign ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Align Bottom"
        >
          <AlignVerticalJustifyEnd size={12} />
        </button>

        {/* Distribute Horizontally */}
        <button
          onClick={distributeHorizontally}
          disabled={!canDistribute}
          style={{
            padding: '6px',
            backgroundColor: canDistribute ? '#f8f9fa' : '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: canDistribute ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Distribute Horizontally"
        >
          <MoveHorizontal size={12} />
        </button>

        {/* Distribute Vertically */}
        <button
          onClick={distributeVertically}
          disabled={!canDistribute}
          style={{
            padding: '6px',
            backgroundColor: canDistribute ? '#f8f9fa' : '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: canDistribute ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Distribute Vertically"
        >
          <MoveVertical size={12} />
        </button>
      </div>

      {!canDistribute && (
        <div style={{ fontSize: '10px', color: '#999', marginTop: '4px', textAlign: 'center' }}>
          Select 3+ elements
        </div>
      )}
    </div>
  );
};
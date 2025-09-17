import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import {
  Triangle,
  ChevronUp,
  ChevronDown,
  AlignLeft,
  AlignRight,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  MoveHorizontal,
  MoveVertical
} from 'lucide-react';

export const ArrangePanel: React.FC = () => {
  const {
    selectedIds,
    bringToFront,
    sendForward,
    sendBackward,
    sendToBack,
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
    <div style={{ backgroundColor: '#fff', padding: '0 8px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Primera línea: Order buttons */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <button
            onPointerUp={bringToFront}
            disabled={selectedCount === 0}
            style={{
              padding: '4px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: selectedCount > 0 ? 1 : 0.5,
              flex: 1
            }}
            title="Bring to Front"
          >
            <Triangle size={10} />
          </button>
          <button
            onPointerUp={sendForward}
            disabled={selectedCount === 0}
            style={{
              padding: '4px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: selectedCount > 0 ? 1 : 0.5,
              flex: 1
            }}
            title="Send Forward"
          >
            <ChevronUp size={10} />
          </button>
          <button
            onPointerUp={sendBackward}
            disabled={selectedCount === 0}
            style={{
              padding: '4px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: selectedCount > 0 ? 1 : 0.5,
              flex: 1
            }}
            title="Send Backward"
          >
            <ChevronDown size={10} />
          </button>
          <button
            onPointerUp={sendToBack}
            disabled={selectedCount === 0}
            style={{
              padding: '4px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: selectedCount > 0 ? 1 : 0.5,
              flex: 1
            }}
            title="Send to Back"
          >
            <Triangle size={10} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>

        {/* Segunda línea: Align & Distribute buttons */}
        <div style={{ display: 'flex', gap: '2px' }}>
          {/* Horizontal alignment */}
          <button
            onClick={alignLeft}
            disabled={!canAlign}
            style={{
              padding: '4px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: canAlign ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: canAlign ? 1 : 0.5,
              flex: 1
            }}
            title="Align Left"
          >
            <AlignLeft size={10} />
          </button>
          <button
            onClick={alignCenter}
            disabled={!canAlign}
            style={{
              padding: '4px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: canAlign ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: canAlign ? 1 : 0.5,
              flex: 1
            }}
            title="Align Center"
          >
            <AlignHorizontalJustifyCenter size={10} />
          </button>
          <button
            onClick={alignRight}
            disabled={!canAlign}
            style={{
              padding: '4px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: canAlign ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: canAlign ? 1 : 0.5,
              flex: 1
            }}
            title="Align Right"
          >
            <AlignRight size={10} />
          </button>

          {/* Vertical alignment */}
          <button
            onClick={alignTop}
            disabled={!canAlign}
            style={{
              padding: '4px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: canAlign ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: canAlign ? 1 : 0.5,
              flex: 1
            }}
            title="Align Top"
          >
            <AlignVerticalJustifyStart size={10} />
          </button>
          <button
            onClick={alignMiddle}
            disabled={!canAlign}
            style={{
              padding: '4px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: canAlign ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: canAlign ? 1 : 0.5,
              flex: 1
            }}
            title="Align Middle"
          >
            <AlignVerticalJustifyCenter size={10} />
          </button>
          <button
            onClick={alignBottom}
            disabled={!canAlign}
            style={{
              padding: '4px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: canAlign ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: canAlign ? 1 : 0.5,
              flex: 1
            }}
            title="Align Bottom"
          >
            <AlignVerticalJustifyEnd size={10} />
          </button>

          {/* Distribution */}
          <button
            onClick={distributeHorizontally}
            disabled={!canDistribute}
            style={{
              padding: '4px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: canDistribute ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: canDistribute ? 1 : 0.5,
              flex: 1
            }}
            title="Distribute Horizontally"
          >
            <MoveHorizontal size={10} />
          </button>
          <button
            onClick={distributeVertically}
            disabled={!canDistribute}
            style={{
              padding: '4px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              cursor: canDistribute ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: canDistribute ? 1 : 0.5,
              flex: 1
            }}
            title="Distribute Vertically"
          >
            <MoveVertical size={10} />
          </button>
        </div>
      </div>
    </div>
  );
};
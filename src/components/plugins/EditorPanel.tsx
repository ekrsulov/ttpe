import React, { useState, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import {
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  ChevronUp,
  ChevronDown,
  Triangle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  MoveHorizontal,
  MoveVertical,
  Settings
} from 'lucide-react';

// Custom hook to subscribe to temporal state changes
const useTemporalState = () => {
  const [temporalState, setTemporalState] = useState(() => useCanvasStore.temporal.getState());

  useEffect(() => {
    const unsubscribe = useCanvasStore.temporal.subscribe(setTemporalState);
    return unsubscribe;
  }, []);

  return temporalState;
};

export const EditorPanel: React.FC = () => {
  const {
    selectedIds,
    deleteSelectedElements,
    zoom,
    resetZoom,
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

  const { undo, redo, pastStates, futureStates } = useTemporalState();
  
  // Computed values
  const selectedCount = selectedIds.length;
  const canAlign = selectedCount >= 2;
  const canDistribute = selectedCount >= 3;
  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;
  const zoomFactor = 1.2;

  return (
    <div style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Settings size={16} style={{ marginRight: '6px', color: '#666' }} />
          <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Editor</span>
          <div style={{
            fontSize: '9px',
            color: '#666',
            marginLeft: '8px',
            padding: '1px 4px',
            border: '1px solid #ccc',
            borderRadius: '8px'
          }}>
            {pastStates.length}/{futureStates.length}
          </div>
        </div>
        {selectedCount > 0 && (
          <span style={{
            fontSize: '10px',
            color: '#666',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '12px',
            padding: '2px 6px',
            fontWeight: '500'
          }}>
            Selected: {selectedCount}
          </span>
        )}
      </div>

      {/* Main toolbar with essential buttons */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '12px', justifyContent: 'center' }}>
        <button
          onClick={() => undo()}
          disabled={!canUndo}
          style={{
            padding: '6px',
            backgroundColor: canUndo ? '#007bff' : '#f8f9fa',
            color: canUndo ? '#fff' : '#6c757d',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: canUndo ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            minWidth: '32px',
            minHeight: '32px'
          }}
          title="Undo"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={() => redo()}
          disabled={!canRedo}
          style={{
            padding: '6px',
            backgroundColor: canRedo ? '#007bff' : '#f8f9fa',
            color: canRedo ? '#fff' : '#6c757d',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: canRedo ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            minWidth: '32px',
            minHeight: '32px'
          }}
          title="Redo"
        >
          <Redo2 size={14} />
        </button>
        <button
          onClick={() => zoom(1 / zoomFactor, window.innerWidth / 2, window.innerHeight / 2)}
          style={{
            padding: '6px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            minWidth: '32px',
            minHeight: '32px'
          }}
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={resetZoom}
          style={{
            padding: '6px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            minWidth: '32px',
            minHeight: '32px'
          }}
          title="Reset Zoom"
        >
          <RotateCcw size={14} />
        </button>
        <button
          onClick={() => zoom(zoomFactor, window.innerWidth / 2, window.innerHeight / 2)}
          style={{
            padding: '6px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            minWidth: '32px',
            minHeight: '32px'
          }}
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onPointerUp={deleteSelectedElements}
          disabled={selectedIds.length === 0}
          style={{
            padding: '6px',
            backgroundColor: selectedIds.length > 0 ? '#dc3545' : '#f8f9fa',
            color: selectedIds.length > 0 ? '#fff' : '#6c757d',
            border: '1px solid #dee2e6',
            borderRadius: '3px',
            cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            minWidth: '32px',
            minHeight: '32px'
          }}
          title="Delete Selected"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Always visible Order and Arrange sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Order Section - Always visible */}
        <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', padding: '8px', backgroundColor: '#f8f9fa' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
            <Layers size={14} style={{ marginRight: '4px' }} />
            <span style={{ fontSize: '11px', fontWeight: '500' }}>Order</span>
          </div>
          <div style={{ display: 'flex', gap: '2px' }}>
            <button
              onPointerUp={bringToFront}
              disabled={selectedCount === 0}
              style={{
                padding: '5px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '3px',
                cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: selectedCount > 0 ? 1 : 0.5
              }}
              title="Bring to Front"
            >
              <Triangle size={10} />
            </button>
            <button
              onPointerUp={sendForward}
              disabled={selectedCount === 0}
              style={{
                padding: '5px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '3px',
                cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: selectedCount > 0 ? 1 : 0.5
              }}
              title="Send Forward"
            >
              <ChevronUp size={10} />
            </button>
            <button
              onPointerUp={sendBackward}
              disabled={selectedCount === 0}
              style={{
                padding: '5px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '3px',
                cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: selectedCount > 0 ? 1 : 0.5
              }}
              title="Send Backward"
            >
              <ChevronDown size={10} />
            </button>
            <button
              onPointerUp={sendToBack}
              disabled={selectedCount === 0}
              style={{
                padding: '5px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '3px',
                cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: selectedCount > 0 ? 1 : 0.5
              }}
              title="Send to Back"
            >
              <Triangle size={10} style={{ transform: 'rotate(180deg)' }} />
            </button>
          </div>
        </div>

        {/* Arrange Section - Always visible */}
        <div style={{ border: '1px solid #dee2e6', borderRadius: '4px', padding: '8px', backgroundColor: '#f8f9fa' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
            <AlignCenter size={14} style={{ marginRight: '4px' }} />
            <span style={{ fontSize: '11px', fontWeight: '500' }}>Arrange</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Horizontal alignment */}
            <div style={{ display: 'flex', gap: '2px' }}>
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
            </div>
            {/* Vertical alignment */}
            <div style={{ display: 'flex', gap: '2px' }}>
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
            </div>
            {/* Distribution */}
            <div style={{ display: 'flex', gap: '2px' }}>
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
      </div>
    </div>
  );
};

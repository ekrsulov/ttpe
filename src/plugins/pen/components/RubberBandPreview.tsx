import React from 'react';
import type { CanvasLayerContext } from '../../../types/plugins';
import { useCanvasStore } from '../../../store/canvasStore';

/**
 * Helper component to render a handle length label
 */
const HandleLengthLabel: React.FC<{
    x: number;
    y: number;
    length: number;
    zoom: number;
    opacity?: number;
}> = ({ x, y, length, zoom, opacity = 1 }) => {
    const fontSize = 9 / zoom;
    const labelPadding = 3 / zoom;
    const labelWidth = 32 / zoom;
    const labelHeight = fontSize + labelPadding * 2;
    
    return (
        <g transform={`translate(${x}, ${y})`} opacity={opacity}>
            <rect
                x={-labelWidth / 2}
                y={-labelHeight / 2}
                width={labelWidth}
                height={labelHeight}
                fill="rgba(59, 130, 246, 0.9)"
                rx={2 / zoom}
            />
            <text
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSize}
                fill="#ffffff"
                fontFamily="system-ui, sans-serif"
                fontWeight="500"
            >
                {Math.round(length)}
            </text>
        </g>
    );
};

/**
 * Render a preview of the next segment while drawing (Rubber Band)
 */
export const RubberBandPreview: React.FC<{ context: CanvasLayerContext }> = ({ context }) => {
    const { viewport } = context;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const penState = useCanvasStore((state) => (state as any).pen);


    if (!penState) {
        return null;
    }

    // Only render during drawing mode
    if (penState.mode !== 'drawing') {
        return null;
    }

    if (!penState.rubberBandEnabled || !penState.currentPath || !penState.currentPath.anchors || penState.currentPath.anchors.length === 0) {
        return null;
    }

    const { currentPath, previewAnchor, dragState } = penState;
    const isFirstPoint = currentPath.anchors.length === 1;
    const lastAnchor = currentPath.anchors[currentPath.anchors.length - 1];

    // Check if we're in a drag gesture with handles
    const isDraggingNewAnchor = dragState && dragState.type === 'new-anchor';
    
    // Check if the drag is happening at the first anchor position (defining first point handles)
    // This is true when dragging and the drag start point matches the first anchor
    const isDefiningFirstPointHandles = isDraggingNewAnchor && isFirstPoint && 
        dragState.startPoint &&
        Math.abs(dragState.startPoint.x - lastAnchor.position.x) < 1 &&
        Math.abs(dragState.startPoint.y - lastAnchor.position.y) < 1;
    
    // Determine preview endpoint and handle vector
    let previewEnd = previewAnchor?.position;
    let handleVector = { x: 0, y: 0 };

    if (isDraggingNewAnchor) {
        previewEnd = dragState.startPoint;

        if (dragState.outHandle) {
            handleVector = dragState.outHandle;
        } else {
            handleVector = {
                x: dragState.currentPoint.x - dragState.startPoint.x,
                y: dragState.currentPoint.y - dragState.startPoint.y,
            };
        }
    }

    // If defining first point handles, show only handles (no rubber band yet)
    // If NOT defining first point handles but also no preview position, show nothing
    if (!previewEnd && !isDefiningFirstPointHandles) {
        return null;
    }

    const strokeWidth = 1 / viewport.zoom;
    const handleStrokeWidth = 1 / viewport.zoom;

    // Determine handles to render
    const outHandle = handleVector;
    const inHandle = dragState?.inHandle || { x: -handleVector.x, y: -handleVector.y };
    const handleMagnitude = Math.sqrt(handleVector.x ** 2 + handleVector.y ** 2);

    // For first point handles only (when defining handles at first anchor)
    if (isDefiningFirstPointHandles) {
        if (handleMagnitude <= 2) {
            return null;
        }

        // Show only handles for the first point (no segment preview)
        // Use dragState.startPoint which is the anchor position during drag
        const anchorPos = dragState.startPoint;
        const inHandleMagnitude = Math.sqrt(inHandle.x ** 2 + inHandle.y ** 2);
        
        // Calculate label positions (midpoint of handle line)
        const outLabelPos = {
            x: anchorPos.x + outHandle.x / 2,
            y: anchorPos.y + outHandle.y / 2,
        };
        const inLabelPos = {
            x: anchorPos.x + inHandle.x / 2,
            y: anchorPos.y + inHandle.y / 2,
        };
        
        return (
            <g opacity={0.5}>
                {/* Handle line being dragged (outHandle) */}
                <line
                    x1={anchorPos.x}
                    y1={anchorPos.y}
                    x2={anchorPos.x + outHandle.x}
                    y2={anchorPos.y + outHandle.y}
                    stroke="#3b82f6"
                    strokeWidth={handleStrokeWidth}
                    fill="none"
                />

                {/* Handle endpoint (outHandle) */}
                <circle
                    cx={anchorPos.x + outHandle.x}
                    cy={anchorPos.y + outHandle.y}
                    r={3 / viewport.zoom}
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth={handleStrokeWidth}
                />
                
                {/* OutHandle length label */}
                {penState.showHandleDistance && (
                    <HandleLengthLabel
                        x={outLabelPos.x}
                        y={outLabelPos.y}
                        length={handleMagnitude}
                        zoom={viewport.zoom}
                    />
                )}

                {/* Reflexive Handle line (inHandle) */}
                <line
                    x1={anchorPos.x}
                    y1={anchorPos.y}
                    x2={anchorPos.x + inHandle.x}
                    y2={anchorPos.y + inHandle.y}
                    stroke="#3b82f6"
                    strokeWidth={handleStrokeWidth}
                    fill="none"
                    opacity={0.7}
                />

                {/* Reflexive Handle endpoint (inHandle) */}
                <circle
                    cx={anchorPos.x + inHandle.x}
                    cy={anchorPos.y + inHandle.y}
                    r={3 / viewport.zoom}
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth={handleStrokeWidth}
                    opacity={0.7}
                />
                
                {/* InHandle length label */}
                {penState.showHandleDistance && (
                    <HandleLengthLabel
                        x={inLabelPos.x}
                        y={inLabelPos.y}
                        length={inHandleMagnitude}
                        zoom={viewport.zoom}
                        opacity={0.7}
                    />
                )}

                {/* Anchor point */}
                <circle
                    cx={anchorPos.x}
                    cy={anchorPos.y}
                    r={4 / viewport.zoom}
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth={strokeWidth}
                />
            </g>
        );
    }

    // For subsequent points: show rubber band + handles
    if (!previewEnd) {
        return null;
    }

    return (
        <g opacity={0.5}>
            {/* Preview segment line */}
            {isDraggingNewAnchor && handleMagnitude > 2 ? (
                // Curved segment preview
                <>
                    {/* Render the actual Bézier curve preview */}
                    {(() => {
                        const p0 = lastAnchor.position;
                        const p3 = previewEnd;
                        
                        // Control point 1: last anchor's outHandle
                        const cp1 = lastAnchor.outHandle
                            ? { x: p0.x + lastAnchor.outHandle.x, y: p0.y + lastAnchor.outHandle.y }
                            : p0;
                        
                        // Control point 2: preview anchor's inHandle
                        const cp2 = { x: p3.x + inHandle.x, y: p3.y + inHandle.y };
                        
                        const pathData = `M ${p0.x} ${p0.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p3.x} ${p3.y}`;
                        
                        return (
                            <path
                                d={pathData}
                                stroke="#3b82f6"
                                strokeWidth={strokeWidth * 2}
                                strokeDasharray={`${4 / viewport.zoom} ${4 / viewport.zoom}`}
                                fill="none"
                            />
                        );
                    })()}

                    {/* Handle line being dragged (outHandle) */}
                    <line
                        x1={previewEnd.x}
                        y1={previewEnd.y}
                        x2={previewEnd.x + outHandle.x}
                        y2={previewEnd.y + outHandle.y}
                        stroke="#3b82f6"
                        strokeWidth={handleStrokeWidth}
                        fill="none"
                    />

                    {/* Handle endpoint (outHandle) */}
                    <circle
                        cx={previewEnd.x + outHandle.x}
                        cy={previewEnd.y + outHandle.y}
                        r={3 / viewport.zoom}
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth={handleStrokeWidth}
                    />
                    
                    {/* OutHandle length label */}
                    {penState.showHandleDistance && (
                        <HandleLengthLabel
                            x={previewEnd.x + outHandle.x / 2}
                            y={previewEnd.y + outHandle.y / 2}
                            length={handleMagnitude}
                            zoom={viewport.zoom}
                        />
                    )}

                    {/* Reflexive Handle line (inHandle) */}
                    <line
                        x1={previewEnd.x}
                        y1={previewEnd.y}
                        x2={previewEnd.x + inHandle.x}
                        y2={previewEnd.y + inHandle.y}
                        stroke="#3b82f6"
                        strokeWidth={handleStrokeWidth}
                        fill="none"
                        opacity={0.7}
                    />

                    {/* Reflexive Handle endpoint (inHandle) */}
                    <circle
                        cx={previewEnd.x + inHandle.x}
                        cy={previewEnd.y + inHandle.y}
                        r={3 / viewport.zoom}
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth={handleStrokeWidth}
                        opacity={0.7}
                    />
                    
                    {/* InHandle length label */}
                    {penState.showHandleDistance && (() => {
                        const inHandleMag = Math.sqrt(inHandle.x ** 2 + inHandle.y ** 2);
                        return (
                            <HandleLengthLabel
                                x={previewEnd.x + inHandle.x / 2}
                                y={previewEnd.y + inHandle.y / 2}
                                length={inHandleMag}
                                zoom={viewport.zoom}
                                opacity={0.7}
                            />
                        );
                    })()}
                </>
            ) : (
                // Straight segment preview
                <line
                    x1={lastAnchor.position.x}
                    y1={lastAnchor.position.y}
                    x2={previewEnd.x}
                    y2={previewEnd.y}
                    stroke="#3b82f6"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${4 / viewport.zoom} ${4 / viewport.zoom}`}
                    fill="none"
                />
            )}

            {/* Preview anchor point */}
            <circle
                cx={previewEnd.x}
                cy={previewEnd.y}
                r={4 / viewport.zoom}
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth={strokeWidth}
            />
        </g>
    );
};

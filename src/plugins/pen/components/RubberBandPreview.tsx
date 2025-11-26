import React from 'react';
import type { CanvasLayerContext } from '../../../types/plugins';
import { useCanvasStore } from '../../../store/canvasStore';

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

    const lastAnchor = currentPath.anchors[currentPath.anchors.length - 1];

    // Determine preview endpoint
    let previewEnd = previewAnchor?.position;
    let showHandlePreview = false;
    let handleVector = { x: 0, y: 0 };

    if (dragState && dragState.type === 'new-anchor') {
        previewEnd = dragState.startPoint;
        showHandlePreview = true;

        if (dragState.outHandle) {
            handleVector = dragState.outHandle;
        } else {
            handleVector = {
                x: dragState.currentPoint.x - dragState.startPoint.x,
                y: dragState.currentPoint.y - dragState.startPoint.y,
            };
        }
    }

    if (!previewEnd) {
        return null;
    }

    const strokeWidth = 1 / viewport.zoom;
    const handleStrokeWidth = 1 / viewport.zoom;

    // Determine handles to render
    const outHandle = handleVector;
    const inHandle = dragState?.inHandle || { x: -handleVector.x, y: -handleVector.y };

    return (
        <g opacity={0.5}>
            {/* Preview segment line */}
            {showHandlePreview && Math.sqrt(handleVector.x ** 2 + handleVector.y ** 2) > 2 ? (
                // Curved segment preview
                <>
                    {/* Render the actual Bézier curve preview */}
                    {(() => {
                        const p0 = lastAnchor.position;
                        const p3 = previewEnd;

                        // Check if start and end are effectively the same point (creating first anchor handles)
                        const dist = Math.sqrt((p3.x - p0.x) ** 2 + (p3.y - p0.y) ** 2);
                        if (dist < 0.1) return null;

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

import React from 'react';

interface FeedbackOverlayProps {
  viewport: {
    panX: number;
    panY: number;
    zoom: number;
  };
  canvasSize: {
    width: number;
    height: number;
  };
  rotationFeedback: {
    degrees: number;
    visible: boolean;
    isShiftPressed: boolean;
    isMultipleOf15: boolean;
  };
  resizeFeedback: {
    deltaX: number;
    deltaY: number;
    visible: boolean;
    isShiftPressed: boolean;
    isMultipleOf10: boolean;
  };
  shapeFeedback: {
    width: number;
    height: number;
    visible: boolean;
    isShiftPressed: boolean;
    isMultipleOf10: boolean;
  };
  pointPositionFeedback: {
    x: number;
    y: number;
    visible: boolean;
  };
}

export const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({
  viewport,
  canvasSize,
  rotationFeedback,
  resizeFeedback,
  shapeFeedback,
  pointPositionFeedback
}) => {
  return (
    <>
      {/* Rotation Feedback */}
      {rotationFeedback.visible && (
        <g transform={`translate(${-viewport.panX / viewport.zoom + 20 / viewport.zoom} ${-viewport.panY / viewport.zoom + canvasSize.height / viewport.zoom - 40 / viewport.zoom}) scale(${1 / viewport.zoom})`}>
          <rect
            x="0"
            y="0"
            width={rotationFeedback.isShiftPressed ? "75" : "55"}
            height="24"
            fill={rotationFeedback.isMultipleOf15 ? "#059669" : "#1f2937"}
            fillOpacity="0.9"
            rx="4"
            ry="4"
            stroke={rotationFeedback.isMultipleOf15 ? "#10b981" : "#374151"}
            strokeWidth="1"
          />
          <text
            x={rotationFeedback.isShiftPressed ? "37.5" : "27.5"}
            y="16"
            textAnchor="middle"
            fontSize="12"
            fontFamily="system-ui, -apple-system, sans-serif"
            fill="#ffffff"
            fontWeight="500"
          >
            {rotationFeedback.degrees}°{rotationFeedback.isShiftPressed ? " ⇧" : ""}
          </text>
        </g>
      )}

      {/* Resize Feedback */}
      {resizeFeedback.visible && (
        <g transform={`translate(${-viewport.panX / viewport.zoom + 20 / viewport.zoom} ${-viewport.panY / viewport.zoom + canvasSize.height / viewport.zoom - 40 / viewport.zoom}) scale(${1 / viewport.zoom})`}>
          <rect
            x="0"
            y="0"
            width={resizeFeedback.isShiftPressed ? "95" : "85"}
            height="24"
            fill={resizeFeedback.isMultipleOf10 ? "#059669" : "#1f2937"}
            fillOpacity="0.9"
            rx="4"
            ry="4"
            stroke={resizeFeedback.isMultipleOf10 ? "#10b981" : "#374151"}
            strokeWidth="1"
          />
          <text
            x={resizeFeedback.isShiftPressed ? "47.5" : "42.5"}
            y="16"
            textAnchor="middle"
            fontSize="12"
            fontFamily="system-ui, -apple-system, sans-serif"
            fill="#ffffff"
            fontWeight="500"
          >
            x{resizeFeedback.deltaX >= 0 ? '+' : ''}{resizeFeedback.deltaX}, y{resizeFeedback.deltaY >= 0 ? '+' : ''}{resizeFeedback.deltaY}{resizeFeedback.isShiftPressed ? " ⇧" : ""}
          </text>
        </g>
      )}

      {/* Shape Creation Feedback */}
      {shapeFeedback.visible && (
        <g transform={`translate(${-viewport.panX / viewport.zoom + 20 / viewport.zoom} ${-viewport.panY / viewport.zoom + canvasSize.height / viewport.zoom - 40 / viewport.zoom}) scale(${1 / viewport.zoom})`}>
          <rect
            x="0"
            y="0"
            width={shapeFeedback.isShiftPressed ? "85" : "75"}
            height="24"
            fill={shapeFeedback.isMultipleOf10 ? "#059669" : "#1f2937"}
            fillOpacity="0.9"
            rx="4"
            ry="4"
            stroke={shapeFeedback.isMultipleOf10 ? "#10b981" : "#374151"}
            strokeWidth="1"
          />
          <text
            x={shapeFeedback.isShiftPressed ? "42.5" : "37.5"}
            y="16"
            textAnchor="middle"
            fontSize="12"
            fontFamily="system-ui, -apple-system, sans-serif"
            fill="#ffffff"
            fontWeight="500"
          >
            {shapeFeedback.width} × {shapeFeedback.height}{shapeFeedback.isShiftPressed ? " ⇧" : ""}
          </text>
        </g>
      )}

      {/* Point Position Feedback */}
      {pointPositionFeedback.visible && (
        <g transform={`translate(${-viewport.panX / viewport.zoom + 20 / viewport.zoom} ${-viewport.panY / viewport.zoom + canvasSize.height / viewport.zoom - 40 / viewport.zoom}) scale(${1 / viewport.zoom})`}>
          <rect
            x="0"
            y="0"
            width="75"
            height="24"
            fill="#1f2937"
            fillOpacity="0.9"
            rx="4"
            ry="4"
            stroke="#374151"
            strokeWidth="1"
          />
          <text
            x="37.5"
            y="16"
            textAnchor="middle"
            fontSize="12"
            fontFamily="system-ui, -apple-system, sans-serif"
            fill="#ffffff"
            fontWeight="500"
          >
            {pointPositionFeedback.x}, {pointPositionFeedback.y}
          </text>
        </g>
      )}
    </>
  );
};
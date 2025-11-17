import React from 'react';
import { useColorModeValue } from '@chakra-ui/react';

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
  rotationFeedback?: {
    degrees: number;
    visible: boolean;
    isShiftPressed: boolean;
    isMultipleOf15: boolean;
  };
  resizeFeedback?: {
    deltaX: number;
    deltaY: number;
    visible: boolean;
    isShiftPressed: boolean;
    isMultipleOf10: boolean;
  };
  shapeFeedback?: {
    width: number;
    height: number;
    visible: boolean;
    isShiftPressed: boolean;
    isMultipleOf10: boolean;
  };
  pointPositionFeedback?: {
    x: number;
    y: number;
    visible: boolean;
  };
  customFeedback?: {
    message: string;
    visible: boolean;
  };
}

interface FeedbackBlockProps {
  viewport: {
    panX: number;
    panY: number;
    zoom: number;
  };
  canvasSize: {
    width: number;
    height: number;
  };
  width: number;
  isHighlighted?: boolean;
  content: string;
}

const FeedbackBlock: React.FC<FeedbackBlockProps> = ({
  viewport,
  canvasSize,
  width,
  isHighlighted = false,
  content,
}) => {
  const transform = `translate(${-viewport.panX / viewport.zoom + 5 / viewport.zoom} ${-viewport.panY / viewport.zoom + canvasSize.height / viewport.zoom - 33 / viewport.zoom}) scale(${1 / viewport.zoom})`;
  const baseFill = useColorModeValue('#1f2937', '#f1f5f9');
  const baseStroke = useColorModeValue('#374151', '#94a3b8');
  const highlightFill = useColorModeValue('#6b7280', '#4b5563');
  const highlightStroke = useColorModeValue('#9ca3af', '#6b7280');
  const textColor = useColorModeValue('#ffffff', isHighlighted ? '#ffffff' : '#0f172a');

  return (
    <g transform={transform}>
      <rect
        x="0"
        y="0"
        width={width}
        height="24"
        fill={isHighlighted ? highlightFill : baseFill}
        fillOpacity="0.9"
        rx="4"
        ry="4"
        stroke={isHighlighted ? highlightStroke : baseStroke}
        strokeWidth="1"
      />
      <text
        x={width / 2}
        y="16"
        textAnchor="middle"
        fontSize="12"
        fontFamily="system-ui, -apple-system, sans-serif"
        fill={textColor}
        fontWeight="500"
      >
        {content}
      </text>
    </g>
  );
};

export const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({
  viewport,
  canvasSize,
  rotationFeedback,
  resizeFeedback,
  shapeFeedback,
  pointPositionFeedback,
  customFeedback
}) => {
  return (
    <>
      {/* Rotation Feedback */}
      {rotationFeedback?.visible && (
        <FeedbackBlock
          viewport={viewport}
          canvasSize={canvasSize}
          width={rotationFeedback.isShiftPressed ? 75 : 55}
          isHighlighted={rotationFeedback.isMultipleOf15}
          content={`${rotationFeedback.degrees}°${rotationFeedback.isShiftPressed ? " ⇧" : ""}`}
        />
      )}

      {/* Resize Feedback */}
      {resizeFeedback?.visible && (
        <FeedbackBlock
          viewport={viewport}
          canvasSize={canvasSize}
          width={resizeFeedback.isShiftPressed ? 95 : 85}
          isHighlighted={resizeFeedback.isMultipleOf10}
          content={`x${resizeFeedback.deltaX >= 0 ? '+' : ''}${resizeFeedback.deltaX}, y${resizeFeedback.deltaY >= 0 ? '+' : ''}${resizeFeedback.deltaY}${resizeFeedback.isShiftPressed ? " ⇧" : ""}`}
        />
      )}

      {/* Shape Creation Feedback */}
      {shapeFeedback?.visible && (
        <FeedbackBlock
          viewport={viewport}
          canvasSize={canvasSize}
          width={shapeFeedback.isShiftPressed ? 85 : 75}
          isHighlighted={shapeFeedback.isMultipleOf10}
          content={`${shapeFeedback.width} × ${shapeFeedback.height}${shapeFeedback.isShiftPressed ? " ⇧" : ""}`}
        />
      )}

      {/* Point Position Feedback */}
      {pointPositionFeedback?.visible && (
        <FeedbackBlock
          viewport={viewport}
          canvasSize={canvasSize}
          width={75}
          content={`${pointPositionFeedback?.x}, ${pointPositionFeedback?.y}`}
        />
      )}

      {/* Custom Feedback */}
      {customFeedback?.visible && (
        <FeedbackBlock
          viewport={viewport}
          canvasSize={canvasSize}
          width={Math.max(60, customFeedback.message.length * 8)}
          content={customFeedback.message}
        />
      )}
    </>
  );
};
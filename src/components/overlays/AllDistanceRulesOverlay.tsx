import React, { useState, useEffect } from 'react';
import type { CanvasElement } from '../../types';
import { detectContainer, prepareContentInfo } from '../../utils/opticalAlignmentUtils';
import type { LayersModel } from '@tensorflow/tfjs';
import type { PathData } from '../../types';

interface AllDistanceRulesOverlayProps {
  elements: CanvasElement[];
  showAllDistanceRules: boolean;
  viewport: {
    zoom: number;
  };
  mlModel: LayersModel | null;
  dxFilter: number;
  dyFilter: number;
}

interface DistanceRule {
  containerId: string;
  contentId: string;
  containerBounds: { minX: number; minY: number; maxX: number; maxY: number };
  contentBounds: { minX: number; minY: number; maxX: number; maxY: number };
  containerCenter: { x: number; y: number };
  contentMathematicalCenter: { x: number; y: number };
  opticalAdjustment: { x: number; y: number };
  currentOffset: { x: number; y: number };
  mlPredictionText: string;
  distances: {
    top: { value: number; x1: number; y1: number; x2: number; y2: number; labelX: number; labelY: number };
    right: { value: number; x1: number; y1: number; x2: number; y2: number; labelX: number; labelY: number };
    bottom: { value: number; x1: number; y1: number; x2: number; y2: number; labelX: number; labelY: number };
    left: { value: number; x1: number; y1: number; x2: number; y2: number; labelX: number; labelY: number };
  };
}

export const AllDistanceRulesOverlay: React.FC<AllDistanceRulesOverlayProps> = ({
  elements,
  showAllDistanceRules,
  viewport,
  mlModel,
  dxFilter,
  dyFilter
}) => {
  const [distanceRules, setDistanceRules] = useState<DistanceRule[]>([]);

  useEffect(() => {
    if (!showAllDistanceRules) {
      setDistanceRules([]);
      return;
    }

    const calculateRules = async () => {
      // Find all valid container-content pairs
      const rules: DistanceRule[] = [];

      for (let i = 0; i < elements.length; i++) {
        for (let j = 0; j < elements.length; j++) {
          if (i === j) continue;

          const containerEl = elements[i];
          const contentEl = elements[j];

          if (containerEl.type !== 'path' || contentEl.type !== 'path') continue;

          // Try this pair
          const selectedIds = [containerEl.id, contentEl.id];
          const containerInfo = detectContainer(elements, selectedIds);

          if (!containerInfo || containerInfo.elementId !== containerEl.id) continue;

          const contentInfo = prepareContentInfo(elements, selectedIds, containerInfo);

          if (contentInfo.length === 0) continue;

          // Check if content is contained
          const containerBounds = containerInfo.bounds;
          const contentBounds = contentInfo[0].geometry.bounds;
          const isContained =
            contentBounds.minX >= containerBounds.minX &&
            contentBounds.minY >= containerBounds.minY &&
            contentBounds.maxX <= containerBounds.maxX &&
            contentBounds.maxY <= containerBounds.maxY;

          if (!isContained) continue;

          // Calculate distances for each edge
          const distances = {
            top: {
              value: Math.abs(contentBounds.minY - containerBounds.minY),
              x1: (contentBounds.minX + contentBounds.maxX) / 2,
              y1: containerBounds.minY,
              x2: (contentBounds.minX + contentBounds.maxX) / 2,
              y2: contentBounds.minY,
              labelX: (contentBounds.minX + contentBounds.maxX) / 2,
              labelY: (containerBounds.minY + contentBounds.minY) / 2,
            },
            right: {
              value: Math.abs(containerBounds.maxX - contentBounds.maxX),
              x1: contentBounds.maxX,
              y1: (contentBounds.minY + contentBounds.maxY) / 2,
              x2: containerBounds.maxX,
              y2: (contentBounds.minY + contentBounds.maxY) / 2,
              labelX: (contentBounds.maxX + containerBounds.maxX) / 2,
              labelY: (contentBounds.minY + contentBounds.maxY) / 2,
            },
            bottom: {
              value: Math.abs(containerBounds.maxY - contentBounds.maxY),
              x1: (contentBounds.minX + contentBounds.maxX) / 2,
              y1: contentBounds.maxY,
              x2: (contentBounds.minX + contentBounds.maxX) / 2,
              y2: containerBounds.maxY,
              labelX: (contentBounds.minX + contentBounds.maxX) / 2,
              labelY: (contentBounds.maxY + containerBounds.maxY) / 2,
            },
            left: {
              value: Math.abs(contentBounds.minX - containerBounds.minX),
              x1: containerBounds.minX,
              y1: (contentBounds.minY + contentBounds.maxY) / 2,
              x2: contentBounds.minX,
              y2: (contentBounds.minY + contentBounds.maxY) / 2,
              labelX: (contentBounds.minX + containerBounds.minX) / 2,
              labelY: (contentBounds.minY + contentBounds.maxY) / 2,
            },
          };

          // Calculate optical adjustment
          const contentInfoForAdjustment = prepareContentInfo(elements, selectedIds, containerInfo);
          let opticalAdjustment = { x: 0, y: 0 };
          
          if (contentInfoForAdjustment.length > 0) {
            const contentItem = contentInfoForAdjustment[0];
            // Calculate mathematical center as the center of the bounding box (same as in training)
            const mathematicalCenterX = (contentBounds.minX + contentBounds.maxX) / 2;
            const mathematicalCenterY = (contentBounds.minY + contentBounds.maxY) / 2;
            
            // Optical center comes from the analysis
            const opticalCenter = contentItem.opticalCenter;
            
            // Adjustment is optical center relative to mathematical center (same as training)
            opticalAdjustment = {
              x: opticalCenter.x - mathematicalCenterX,
              y: opticalCenter.y - mathematicalCenterY
            };
          }

          // Calculate container center
          const containerCenter = {
            x: (containerBounds.minX + containerBounds.maxX) / 2,
            y: (containerBounds.minY + containerBounds.maxY) / 2
          };

          // Calculate content mathematical center
          const contentMathematicalCenter = {
            x: (contentBounds.minX + contentBounds.maxX) / 2,
            y: (contentBounds.minY + contentBounds.maxY) / 2
          };

          // Calculate current offset (content center relative to container center)
          const currentOffset = {
            x: contentMathematicalCenter.x - containerCenter.x,
            y: contentMathematicalCenter.y - containerCenter.y
          };

          // Calculate ML prediction text
          let mlPredictionText = 'No model';
          if (mlModel) {
            try {
              const containerPathData = containerEl.data as PathData;
              const contentPathData = contentEl.data as PathData;
              
              const { predictAlignment, denormalizeAdjustment, getContainerSize } = await import('../../utils/mlAlignmentUtils');
              const prediction = await predictAlignment(
                mlModel,
                containerPathData.subPaths,
                contentPathData.subPaths,
                containerPathData.fillColor,
                containerPathData.strokeWidth,
                contentPathData.fillColor,
                contentPathData.strokeWidth
              );
              
              // Denormalize the prediction to get intrinsic optical adjustment in pixels
              const containerCommands = containerPathData.subPaths.flat();
              const containerSize = getContainerSize(containerCommands);
              const intrinsicOffsetX = denormalizeAdjustment(prediction.adjustmentX, containerSize.width);
              const intrinsicOffsetY = denormalizeAdjustment(prediction.adjustmentY, containerSize.height);
              
              // Calculate the final position after ML alignment
              // finalX = -intrinsicOffsetX, finalY = -intrinsicOffsetY
              const finalPositionX = -intrinsicOffsetX;
              const finalPositionY = -intrinsicOffsetY;
              
              mlPredictionText = `ml prediction: dx ${finalPositionX.toFixed(1)}, dy ${finalPositionY.toFixed(1)}`;
            } catch (error) {
              console.error('ML prediction error:', error);
              mlPredictionText = 'Error';
            }
          }

          rules.push({
            containerId: containerEl.id,
            contentId: contentEl.id,
            containerBounds,
            contentBounds,
            containerCenter,
            contentMathematicalCenter,
            opticalAdjustment,
            currentOffset,
            mlPredictionText,
            distances,
          });
        }
      }

      setDistanceRules(rules);
    };

    calculateRules();
  }, [elements, showAllDistanceRules, mlModel]);

  if (!showAllDistanceRules || distanceRules.length === 0) return null;

  const zoom = viewport.zoom;
  const strokeWidth = 1.5 / zoom;
  const labelFontSize = Math.max(8, Math.min(16, 12 / zoom));

  // Helper function to render text with white background
  const renderTextWithBackground = (x: number, y: number, text: string, color: string, fontSize: number) => {
    const padding = 2 / zoom;
    const textWidth = text.length * fontSize * 0.6; // Approximate text width
    const textHeight = fontSize * 1.2;
    
    return (
      <g>
        <rect
          x={x - textWidth / 2 - padding}
          y={y - textHeight / 2 - padding}
          width={textWidth + padding * 2}
          height={textHeight + padding * 2}
          fill="white"
          fillOpacity={0.9}
          rx={2 / zoom}
        />
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={fontSize}
          fill={color}
          fontWeight="normal"
          opacity={0.9}
        >
          {text}
        </text>
      </g>
    );
  };

  return (
    <g className="all-distance-rules-overlay">
      {distanceRules
        .filter((rule) => Math.abs(rule.currentOffset.x) >= dxFilter && Math.abs(rule.currentOffset.y) >= dyFilter)
        .map((rule) => (
        <g key={`${rule.containerId}-${rule.contentId}`} className="distance-rule-group">
          {/* Top distance */}
          {rule.distances.top.value > 0 && (
            <g className="distance-rule-top">
              <line
                x1={rule.distances.top.x1}
                y1={rule.distances.top.y1}
                x2={rule.distances.top.x2}
                y2={rule.distances.top.y2}
                stroke="#007bff"
                strokeWidth={strokeWidth}
                opacity={0.7}
              />
              {renderTextWithBackground(
                rule.distances.top.labelX,
                rule.distances.top.labelY,
                rule.distances.top.value.toFixed(1),
                "#007bff",
                labelFontSize
              )}
            </g>
          )}

          {/* Right distance */}
          {rule.distances.right.value > 0 && (
            <g className="distance-rule-right">
              <line
                x1={rule.distances.right.x1}
                y1={rule.distances.right.y1}
                x2={rule.distances.right.x2}
                y2={rule.distances.right.y2}
                stroke="#007bff"
                strokeWidth={strokeWidth}
                opacity={0.7}
              />
              {renderTextWithBackground(
                rule.distances.right.labelX,
                rule.distances.right.labelY,
                rule.distances.right.value.toFixed(1),
                "#007bff",
                labelFontSize
              )}
            </g>
          )}

          {/* Bottom distance */}
          {rule.distances.bottom.value > 0 && (
            <g className="distance-rule-bottom">
              <line
                x1={rule.distances.bottom.x1}
                y1={rule.distances.bottom.y1}
                x2={rule.distances.bottom.x2}
                y2={rule.distances.bottom.y2}
                stroke="#007bff"
                strokeWidth={strokeWidth}
                opacity={0.7}
              />
              {renderTextWithBackground(
                rule.distances.bottom.labelX,
                rule.distances.bottom.labelY,
                rule.distances.bottom.value.toFixed(1),
                "#007bff",
                labelFontSize
              )}
            </g>
          )}

          {/* Left distance */}
          {rule.distances.left.value > 0 && (
            <g className="distance-rule-left">
              <line
                x1={rule.distances.left.x1}
                y1={rule.distances.left.y1}
                x2={rule.distances.left.x2}
                y2={rule.distances.left.y2}
                stroke="#007bff"
                strokeWidth={strokeWidth}
                opacity={0.7}
              />
              {renderTextWithBackground(
                rule.distances.left.labelX,
                rule.distances.left.labelY,
                rule.distances.left.value.toFixed(1),
                "#007bff",
                labelFontSize
              )}
            </g>
          )}

          {/* Current offset label below container */}
          <g className="current-offset-label">
            {renderTextWithBackground(
              (rule.containerBounds.minX + rule.containerBounds.maxX) / 2,
              rule.containerBounds.maxY + Math.max(12, 6 * zoom),
              `current: dx ${rule.currentOffset.x.toFixed(1)}, dy ${rule.currentOffset.y.toFixed(1)}`,
              "black",
              labelFontSize
            )}
          </g>

          {/* Optical adjustment label below container */}
          <g className="optical-adjustment-label">
            {renderTextWithBackground(
              (rule.containerBounds.minX + rule.containerBounds.maxX) / 2,
              rule.containerBounds.maxY + Math.max(32, 12 * zoom),
              `algorithm: dx ${rule.opticalAdjustment.x.toFixed(1)}, dy ${rule.opticalAdjustment.y.toFixed(1)}`,
              "black",
              labelFontSize
            )}
          </g>

          {/* ML prediction label below container */}
          <g className="ml-prediction-label">
            {renderTextWithBackground(
              (rule.containerBounds.minX + rule.containerBounds.maxX) / 2,
              rule.containerBounds.maxY + Math.max(52, 18 * zoom),
              rule.mlPredictionText,
              "black",
              labelFontSize
            )}
          </g>
        </g>
      ))}
    </g>
  );
};
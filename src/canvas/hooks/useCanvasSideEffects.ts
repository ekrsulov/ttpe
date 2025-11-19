import { useEffect, type RefObject } from 'react';
import { extractEditablePoints } from '../../utils/pathParserUtils';
import { logger } from '../../utils';
import type { CanvasElement, PathData } from '../../types';

export interface SelectedCommand {
  elementId: string;
  commandIndex: number;
  pointIndex: number;
}

export interface EditingPoint {
  elementId: string;
  commandIndex: number;
  pointIndex: number;
  isDragging: boolean;
  offsetX: number;
  offsetY: number;
}

export interface DraggingSelection {
  isDragging: boolean;
  draggedPoint: { elementId: string; commandIndex: number; pointIndex: number } | null;
  initialPositions: Array<{
    elementId: string;
    commandIndex: number;
    pointIndex: number;
    x: number;
    y: number;
  }>;
}

export interface UseCanvasSideEffectsParams {
  currentMode: string | null;
  selectedCommands: SelectedCommand[];
  elements: CanvasElement[];
  updatePointPositionFeedback?: (x: number, y: number, visible: boolean) => void;
  editingPoint: EditingPoint | null;
  draggingSelection: DraggingSelection | null;
  emergencyCleanupDrag: () => void;
  saveAsPng: (selectedOnly: boolean) => void;
  svgRef: RefObject<SVGSVGElement | null>;
}

/**
 * Hook that centralizes canvas side effects:
 * - Point position feedback updates
 * - Emergency cleanup for drag states
 * - Save as PNG listener
 */
export function useCanvasSideEffects(params: UseCanvasSideEffectsParams): void {
  const {
    currentMode,
    selectedCommands,
    elements,
    updatePointPositionFeedback,
    editingPoint,
    draggingSelection,
    emergencyCleanupDrag,
    saveAsPng,
    svgRef,
  } = params;

  // Update point position feedback when selection changes
  useEffect(() => {
    if (!updatePointPositionFeedback) return;

    if (currentMode === 'edit' && selectedCommands.length === 1) {
      const selectedCommand = selectedCommands[0];
      const element = elements.find(el => el.id === selectedCommand.elementId);

      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const commands = pathData.subPaths.flat();
        const points = extractEditablePoints(commands);
        
        // Find the specific point
        const point = points.find(p => 
          p.commandIndex === selectedCommand.commandIndex && 
          p.pointIndex === selectedCommand.pointIndex
        );
        
        if (point) {
          updatePointPositionFeedback(point.x, point.y, true);
          return;
        }
      }
    }
    
    // Hide feedback if conditions not met
    updatePointPositionFeedback(0, 0, false);
  }, [currentMode, selectedCommands, elements, updatePointPositionFeedback]);

  // Emergency cleanup listeners for drag states
  useEffect(() => {
    const handleEmergencyCleanup = () => {
      if (editingPoint?.isDragging || draggingSelection?.isDragging) {
        logger.debug('Emergency cleanup triggered - force stopping drag');
        emergencyCleanupDrag();
      }
    };

    // Multiple emergency cleanup triggers
    window.addEventListener('beforeunload', handleEmergencyCleanup);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        handleEmergencyCleanup();
      }
    });

    // Cleanup on component unmount
    return () => {
      handleEmergencyCleanup();
      window.removeEventListener('beforeunload', handleEmergencyCleanup);
    };
  }, [editingPoint?.isDragging, draggingSelection?.isDragging, emergencyCleanupDrag]);

  // Listen for saveAsPng events from FilePanel
  useEffect(() => {
    const handleSaveAsPng = (event: CustomEvent) => {
      const { selectedOnly } = event.detail;
      if (svgRef.current) {
        saveAsPng(selectedOnly);
      }
    };

    window.addEventListener('saveAsPng', handleSaveAsPng as EventListener);

    return () => {
      window.removeEventListener('saveAsPng', handleSaveAsPng as EventListener);
    };
  }, [saveAsPng, svgRef]);
}

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { parsePathD, extractEditablePoints, type ControlPoint, type PathCommand } from '../../utils/pathParserUtils';
import { RotateCcw } from 'lucide-react';

export const ControlPointAlignmentPanel: React.FC = () => {
  const {
    selectedCommands,
    activePlugin,
    getControlPointInfo,
    setControlPointAlignmentType,
    elements
  } = useCanvasStore();

  // Track if we already auto-calculated alignment for current selection
  const hasAutoCalculatedRef = useRef<string | null>(null);

  const isPathClosed = (commands: PathCommand[]): boolean => {
    if (commands.length < 2) return false;
    
    // Check for explicit Z command
    if (commands[commands.length - 1].type === 'Z') return true;
    
    // Check if last point is close to first point (implicitly closed)
    const firstPoint = commands[0].points.length > 0 ? commands[0].points[0] : null;
    const lastCommand = commands[commands.length - 1];
    const lastPoint = lastCommand.points.length > 0 ? lastCommand.points[lastCommand.points.length - 1] : null;
    
    if (!firstPoint || !lastPoint) return false;
    
    const distance = Math.sqrt(
      Math.pow(lastPoint.x - firstPoint.x, 2) + 
      Math.pow(lastPoint.y - firstPoint.y, 2)
    );
    
    const threshold = 0.1; // Small threshold for considering points as the same
    return distance < threshold;
  };

  const getCommandEndPoint = (command: PathCommand): import('../../types').Point | null => {
    if (command.points.length > 0) {
      return command.points[command.points.length - 1];
    }
    return null;
  };

  // Get info for a single selected control point
  const getSinglePointInfo = useCallback(() => {
    if (activePlugin !== 'edit' || selectedCommands.length !== 1) {
      return null;
    }

    const cmd = selectedCommands[0];
    const element = elements.find(el => el.id === cmd.elementId);
    if (!element || element.type !== 'path') {
      return null;
    }

    const pathData = element.data as import('../../types').PathData;
    const commands = parsePathD(pathData.d);
    const points = extractEditablePoints(commands);
    const point = points.find((p: ControlPoint) => p.commandIndex === cmd.commandIndex && p.pointIndex === cmd.pointIndex);

    if (!point || !point.isControl) {
      return null;
    }

    const info = getControlPointInfo(cmd.elementId, cmd.commandIndex, cmd.pointIndex);
    
    // Determine if path is closed
    const isClosed = isPathClosed(commands);
    
    // Find paired control point using HandleManager logic
    let pairedCommandIndex = -1;
    let pairedPointIndex = -1;
    const handleType = cmd.pointIndex === 0 ? 'outgoing' : 'incoming';
    
    if (handleType === 'incoming') {
      // For incoming handle, find the next command's outgoing handle
      if (cmd.commandIndex < commands.length - 1) {
        const nextCommand = commands[cmd.commandIndex + 1];
        if (nextCommand.type === 'C') {
          pairedCommandIndex = cmd.commandIndex + 1;
          pairedPointIndex = 0; // outgoing
        }
      } else if (isClosed) {
        // If this is the last command in a closed path, pair with first curve command's outgoing
        // But only if this command is actually a curve command
        if (commands[cmd.commandIndex].type === 'C') {
          // Find the first C command after M
          for (let i = 1; i < commands.length; i++) {
            if (commands[i].type === 'C') {
              pairedCommandIndex = i;
              pairedPointIndex = 0; // outgoing
              break;
            }
          }
        }
      }
    } else {
      // For outgoing handle, find the previous command's incoming handle
      if (cmd.commandIndex > 0) {
        const prevCommand = commands[cmd.commandIndex - 1];
        if (prevCommand.type === 'C') {
          pairedCommandIndex = cmd.commandIndex - 1;
          pairedPointIndex = 1; // incoming
        }
      } else if (isClosed) {
        // If this is the first command in a closed path, pair with last curve command's incoming
        // But only if this command is actually a curve command
        if (commands[cmd.commandIndex].type === 'C') {
          // Find the last C command before Z or end
          for (let i = commands.length - 1; i >= 1; i--) {
            if (commands[i].type === 'C') {
              pairedCommandIndex = i;
              pairedPointIndex = 1; // incoming
              break;
            }
          }
        }
      }
    }
    
    const paired = pairedCommandIndex !== -1 ? { commandIndex: pairedCommandIndex, pointIndex: pairedPointIndex } : null;
    const pairedPoint = paired ? points.find((p: ControlPoint) => p.commandIndex === paired.commandIndex && p.pointIndex === paired.pointIndex) : null;
    const pairedInfo = paired ? getControlPointInfo(cmd.elementId, paired.commandIndex, paired.pointIndex) : null;
    
    // Calculate alignment type based on positions
    let calculatedType: 'independent' | 'aligned' | 'mirrored' = 'independent';
    let mag1 = 0;
    let angle1 = 0;
    let mag2: number | undefined;
    let angle2: number | undefined;
    let anchor2: {x: number, y: number} | undefined;
    
    const command = commands[cmd.commandIndex];
    let anchor1;
    if (cmd.pointIndex === 0) {
      // outgoing, anchor is start of segment
      if (cmd.commandIndex > 0) {
        const prevCommand = commands[cmd.commandIndex - 1];
        const endPoint = getCommandEndPoint(prevCommand);
        anchor1 = endPoint || { x: 0, y: 0 };
      } else {
        const endPoint = getCommandEndPoint(commands[0]);
        anchor1 = endPoint || { x: 0, y: 0 };
      }
    } else {
      // incoming, anchor is end of segment
      const endPoint = getCommandEndPoint(command);
      anchor1 = endPoint || { x: 0, y: 0 };
    }
    const vector1 = { x: point.x - anchor1.x, y: point.y - anchor1.y };
    mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    angle1 = Math.atan2(vector1.y, vector1.x) * 180 / Math.PI;
    
    if (paired && pairedPoint) {
      const pairedCommand = commands[paired.commandIndex];
      if (paired.pointIndex === 0) {
        // outgoing, anchor is start of segment
        if (paired.commandIndex > 0) {
          const prevPairedCommand = commands[paired.commandIndex - 1];
          const endPoint = getCommandEndPoint(prevPairedCommand);
          anchor2 = endPoint || { x: 0, y: 0 };
        } else {
          const endPoint = getCommandEndPoint(commands[0]);
          anchor2 = endPoint || { x: 0, y: 0 };
        }
      } else {
        // incoming, anchor is end of segment
        const endPoint = getCommandEndPoint(pairedCommand);
        anchor2 = endPoint || { x: 0, y: 0 };
      }
      const vector2 = { x: pairedPoint.x - anchor2.x, y: pairedPoint.y - anchor2.y };
      mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
      angle2 = Math.atan2(vector2.y, vector2.x) * 180 / Math.PI;
      
      if (mag1 > 0 && mag2 > 0) {
        const unit1 = { x: vector1.x / mag1, y: vector1.y / mag1 };
        const unit2 = { x: vector2.x / mag2, y: vector2.y / mag2 };
        const dot = unit1.x * (-unit2.x) + unit1.y * (-unit2.y);
        if (dot > 0.985) {
          const ratio = Math.min(mag1, mag2) / Math.max(mag1, mag2);
          calculatedType = ratio > 0.9 ? 'mirrored' : 'aligned';
        }
      }
    }

    return {
      point,
      command: commands[cmd.commandIndex],
      info,
      pairedPoint,
      pairedInfo,
      calculatedType,
      mag1,
      angle1,
      mag2,
      angle2,
      anchor1,
      anchor2
    };
  }, [activePlugin, selectedCommands, elements, getControlPointInfo]);

  // Reset auto-calculation flag when selection changes
  useEffect(() => {
    if (selectedCommands.length === 1) {
      const currentSelectionKey = `${selectedCommands[0].elementId}-${selectedCommands[0].commandIndex}-${selectedCommands[0].pointIndex}`;
      if (hasAutoCalculatedRef.current !== currentSelectionKey) {
        hasAutoCalculatedRef.current = null; // Reset to allow auto-calculation for new selection
      }
    }
  }, [selectedCommands]);

  const singlePointInfo = useMemo(() => getSinglePointInfo(), [getSinglePointInfo]);

  // Automatically save the calculated alignment type only once per selection
  useEffect(() => {
    if (singlePointInfo && singlePointInfo.pairedPoint && singlePointInfo.pairedInfo && singlePointInfo.info) {
      const currentSelectionKey = `${selectedCommands[0].elementId}-${selectedCommands[0].commandIndex}-${selectedCommands[0].pointIndex}`;
      
      // Only auto-calculate if we haven't done it for this selection yet
      if (hasAutoCalculatedRef.current !== currentSelectionKey) {
        hasAutoCalculatedRef.current = currentSelectionKey;
        
        // Only update if the calculated type is different from current
        if (singlePointInfo.calculatedType !== singlePointInfo.info.type) {
          setControlPointAlignmentType(
            selectedCommands[0].elementId,
            selectedCommands[0].commandIndex,
            selectedCommands[0].pointIndex,
            singlePointInfo.pairedInfo.commandIndex,
            singlePointInfo.pairedInfo.pointIndex,
            singlePointInfo.calculatedType
          );
        }
      }
    }
  }, [singlePointInfo, selectedCommands, setControlPointAlignmentType]);

  if (!singlePointInfo) {
    return null;
  }

  const handleAlignmentChange = (type: 'independent' | 'aligned' | 'mirrored') => {
    if (singlePointInfo && singlePointInfo.pairedPoint && singlePointInfo.pairedInfo) {
      setControlPointAlignmentType(
        selectedCommands[0].elementId,
        selectedCommands[0].commandIndex,
        selectedCommands[0].pointIndex,
        singlePointInfo.pairedInfo.commandIndex,
        singlePointInfo.pairedInfo.pointIndex,
        type
      );
    }
  };

  return (
    <div style={{ backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <RotateCcw size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Control Point Alignment</span>
      </div>

      {singlePointInfo.pairedPoint ? (
        <>
          <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.4' }}>
            <div><strong style={{ color: '#333' }}>Position:</strong> ({singlePointInfo.point.x.toFixed(2)}, {singlePointInfo.point.y.toFixed(2)})</div>
            <div><strong style={{ color: '#333' }}>Command:</strong> {singlePointInfo.command.type} at index {singlePointInfo.point.commandIndex}</div>
            <div><strong style={{ color: '#333' }}>Point Index:</strong> {singlePointInfo.point.pointIndex}</div>
            <div><strong style={{ color: '#333' }}>Anchor:</strong> ({singlePointInfo.anchor1.x.toFixed(2)}, {singlePointInfo.anchor1.y.toFixed(2)})</div>
            <div><strong style={{ color: '#333' }}>Direction:</strong> {singlePointInfo.angle1.toFixed(1)}°</div>
            <div><strong style={{ color: '#333' }}>Size:</strong> {singlePointInfo.mag1.toFixed(2)}</div>
            <div><strong style={{ color: '#333' }}>Alignment:</strong> {singlePointInfo.calculatedType}</div>
            {singlePointInfo.pairedPoint && (
              <>
                <div><strong style={{ color: '#333' }}>Paired Point:</strong> ({singlePointInfo.pairedPoint.x.toFixed(2)}, {singlePointInfo.pairedPoint.y.toFixed(2)}) at command {singlePointInfo.pairedInfo?.commandIndex}, point {singlePointInfo.pairedInfo?.pointIndex}</div>
                <div><strong style={{ color: '#333' }}>Paired Anchor:</strong> ({singlePointInfo.anchor2?.x.toFixed(2)}, {singlePointInfo.anchor2?.y.toFixed(2)})</div>
                <table style={{ fontSize: '11px', borderCollapse: 'collapse', marginTop: '8px', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #ddd', padding: '4px', backgroundColor: '#f8f9fa' }}>Property</th>
                      <th style={{ border: '1px solid #ddd', padding: '4px', backgroundColor: '#f8f9fa' }}>Current</th>
                      <th style={{ border: '1px solid #ddd', padding: '4px', backgroundColor: '#f8f9fa' }}>Paired</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>Direction</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{singlePointInfo.angle1.toFixed(1)}°</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{singlePointInfo.angle2?.toFixed(1)}°</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>Size</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{singlePointInfo.mag1.toFixed(2)}</td>
                      <td style={{ border: '1px solid #ddd', padding: '4px' }}>{singlePointInfo.mag2?.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => handleAlignmentChange('independent')}
              style={{
                padding: '6px 8px',
                backgroundColor: singlePointInfo.calculatedType === 'independent' ? '#007bff' : '#f8f9fa',
                color: singlePointInfo.calculatedType === 'independent' ? '#fff' : '#333',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'center'
              }}
              title="Independent - Control points move freely"
            >
              Independent
            </button>

            <button
              onClick={() => handleAlignmentChange('aligned')}
              style={{
                padding: '6px 8px',
                backgroundColor: singlePointInfo.calculatedType === 'aligned' ? '#007bff' : '#f8f9fa',
                color: singlePointInfo.calculatedType === 'aligned' ? '#fff' : '#333',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'center'
              }}
              title="Aligned - Control points maintain opposite directions"
            >
              Aligned
            </button>

            <button
              onClick={() => handleAlignmentChange('mirrored')}
              style={{
                padding: '6px 8px',
                backgroundColor: singlePointInfo.calculatedType === 'mirrored' ? '#007bff' : '#f8f9fa',
                color: singlePointInfo.calculatedType === 'mirrored' ? '#fff' : '#333',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'center'
              }}
              title="Mirrored - Control points are perfectly mirrored"
            >
              Mirrored
            </button>
          </div>

          <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
            {singlePointInfo.calculatedType === 'independent' && 'Points move independently'}
            {singlePointInfo.calculatedType === 'aligned' && 'Points maintain opposite directions'}
            {singlePointInfo.calculatedType === 'mirrored' && 'Points are mirrored across anchor'}
          </div>
        </>
      ) : (
        <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.4' }}>
          <div><strong style={{ color: '#333' }}>Position:</strong> ({singlePointInfo.point.x.toFixed(2)}, {singlePointInfo.point.y.toFixed(2)})</div>
          <div><strong style={{ color: '#333' }}>Command:</strong> {singlePointInfo.command.type} at index {singlePointInfo.point.commandIndex}</div>
          <div><strong style={{ color: '#333' }}>Point Index:</strong> {singlePointInfo.point.pointIndex}</div>
          <div><strong style={{ color: '#333' }}>Alignment:</strong> {singlePointInfo.info?.type || 'independent'}</div>
        </div>
      )}
    </div>
  );
};
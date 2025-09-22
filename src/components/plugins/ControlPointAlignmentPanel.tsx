import React, { useMemo, useCallback } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { extractEditablePoints, type ControlPoint } from '../../utils/pathParserUtils';
import type { Command, Point } from '../../types';
import { RotateCcw } from 'lucide-react';

export const ControlPointAlignmentPanel: React.FC = () => {
  const {
    selectedCommands,
    activePlugin,
    elements,
    deleteZCommandForMPoint,
    moveToM,
    convertCommandType,
    setControlPointAlignmentType
  } = useCanvasStore();

  const isPathClosed = (commands: Command[]): boolean => {
    if (commands.length < 2) return false;
    
    // Check for explicit Z command
    if (commands[commands.length - 1].type === 'Z') return true;
    
    // Check if last point is close to first point (implicitly closed)
    const firstPoint = commands[0].type === 'Z' ? null : commands[0].position;
    const lastCommand = commands[commands.length - 1];
    const lastPoint = lastCommand.type === 'Z' ? null : lastCommand.position;
    
    if (!firstPoint || !lastPoint) return false;
    
    const distance = Math.sqrt(
      Math.pow(lastPoint.x - firstPoint.x, 2) + 
      Math.pow(lastPoint.y - firstPoint.y, 2)
    );
    
    const threshold = 0.1; // Small threshold for considering points as the same
    return distance < threshold;
  };

  // Check if selected M point has a closing Z command
  const hasClosingZCommand = useCallback((elementId: string, commandIndex: number): boolean => {
    const element = elements.find(el => el.id === elementId);
    if (!element || element.type !== 'path') return false;
    
    const pathData = element.data as import('../../types').PathData;
    const commands = pathData.subPaths.flat();
    
    // Check if the command at commandIndex is an M command
    if (commands[commandIndex]?.type !== 'M') return false;
    
    // Look for Z commands after this M command
    for (let i = commandIndex + 1; i < commands.length; i++) {
      if (commands[i].type === 'Z') {
        // Check if this Z closes to our M point
        // A Z closes to the last M before it
        let lastMIndex = -1;
        for (let j = i - 1; j >= 0; j--) {
          if (commands[j].type === 'M') {
            lastMIndex = j;
            break;
          }
        }
        
        if (lastMIndex === commandIndex) {
          return true;
        }
      } else if (commands[i].type === 'M') {
        // If we hit another M, stop looking
        break;
      }
    }
    
    return false;
  }, [elements]);

  // Check if selected point is the last point of its subpath
  const isLastPointOfSubpath = useCallback((elementId: string, commandIndex: number, pointIndex: number): boolean => {
    const element = elements.find(el => el.id === elementId);
    if (!element || element.type !== 'path') return false;
    
    const pathData = element.data as import('../../types').PathData;
    const commands = pathData.subPaths.flat();
    
    const command = commands[commandIndex];
    if (!command) return false;
    
    // Check if this is the last point of the command
    const pointsLength = command.type === 'M' || command.type === 'L' ? 1 : command.type === 'C' ? 3 : 0;
    const isLastPoint = pointIndex === pointsLength - 1;
    if (!isLastPoint) return false;
    
    // Check if this is the last command in the path or before a Z/M
    const isLastCommandInSubpath = commandIndex === commands.length - 1 || 
                                   commands[commandIndex + 1].type === 'M' || 
                                   commands[commandIndex + 1].type === 'Z';
    
    return isLastCommandInSubpath;
  }, [elements]);

  // Check if selected point is already at the same position as the M of its subpath
  const isAtMPosition = useCallback((elementId: string, commandIndex: number, pointIndex: number): boolean => {
    const element = elements.find(el => el.id === elementId);
    if (!element || element.type !== 'path') return false;
    
    const pathData = element.data as import('../../types').PathData;
    const commands = pathData.subPaths.flat();
    
    const command = commands[commandIndex];
    if (!command) return false;
    
    // Find the M command for this subpath (the last M before this command)
    let subpathMIndex = -1;
    for (let i = commandIndex - 1; i >= 0; i--) {
      if (commands[i].type === 'M') {
        subpathMIndex = i;
        break;
      }
    }
    
    if (subpathMIndex === -1) return false;
    
    // Get the point to check
    let pointToCheck: Point | null = null;
    if (command.type === 'M' || command.type === 'L') {
      if (pointIndex === 0) pointToCheck = command.position;
    } else if (command.type === 'C') {
      if (pointIndex === 0) pointToCheck = command.controlPoint1;
      else if (pointIndex === 1) pointToCheck = command.controlPoint2;
      else if (pointIndex === 2) pointToCheck = command.position;
    }
    const mPosition = (commands[subpathMIndex] as Command & { type: 'M' }).position;
    
    if (!pointToCheck || !mPosition) return false;
    
    // Check if they are at the same position (with small tolerance for floating point)
    const tolerance = 0.1;
    return Math.abs(pointToCheck.x - mPosition.x) < tolerance && 
           Math.abs(pointToCheck.y - mPosition.y) < tolerance;
  }, [elements]);

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
    const commands = pathData.subPaths.flat();
    const points = extractEditablePoints(commands);
    const point = points.find((p: ControlPoint) => p.commandIndex === cmd.commandIndex && p.pointIndex === cmd.pointIndex);

    if (!point) {
      return null;
    }

    if (!point.isControl) {
      // It's an anchor point - show only basic information
      const command = commands[cmd.commandIndex];
      
      return {
        point,
        command,
        isAnchor: true,
        anchorType: 'basic',
        location: `${command.type} Command ${cmd.commandIndex}, Point ${cmd.pointIndex}`
      };
    } else {
      // Control point logic - use the information directly from the point
      
      // Determine if path is closed
      const isClosed = isPathClosed(commands);
      
      // Find paired control point using the stored pairing information
      let pairedPoint: ControlPoint | null = null;
      
      if (point.pairedCommandIndex !== undefined && point.pairedPointIndex !== undefined) {
        pairedPoint = points.find((p: ControlPoint) => 
          p.commandIndex === point.pairedCommandIndex && p.pointIndex === point.pairedPointIndex
        ) || null;
      }
      
      // If no direct pairing found, try to find paired control point using proper logic
      if (!pairedPoint) {
        // For a control point to have a pair, they must share the same anchor point
        // This happens when:
        // 1. Incoming control point (index 1) of command N pairs with outgoing control point (index 0) of command N+1
        // 2. In closed paths, the last command's incoming pairs with first command's outgoing
        
        let candidatePairedPoint: ControlPoint | null = null;
        
        if (cmd.pointIndex === 1) {
          // This is an incoming control point - look for the next command's outgoing control point
          const nextCommandIndex = cmd.commandIndex + 1;
          
          // Skip Z commands when looking for the next command
          let targetCommandIndex = nextCommandIndex;
          while (targetCommandIndex < commands.length && commands[targetCommandIndex].type === 'Z') {
            targetCommandIndex++;
          }
          
          if (targetCommandIndex < commands.length && commands[targetCommandIndex].type === 'C') {
            candidatePairedPoint = points.find((p: ControlPoint) => 
              p.commandIndex === targetCommandIndex && p.pointIndex === 0
            ) || null;
          } else if (isClosed) {
            // For closed paths, if we're at the last curve command, pair with the first curve's outgoing
            // Find the first C command after M
            for (let i = 1; i < commands.length; i++) {
              if (commands[i].type === 'C') {
                candidatePairedPoint = points.find((p: ControlPoint) => 
                  p.commandIndex === i && p.pointIndex === 0
                ) || null;
                break;
              }
            }
          }
        } else if (cmd.pointIndex === 0) {
          // This is an outgoing control point - look for the previous command's incoming control point
          const prevCommandIndex = cmd.commandIndex - 1;
          
          // Skip Z commands when looking for the previous command
          let targetCommandIndex = prevCommandIndex;
          while (targetCommandIndex >= 0 && commands[targetCommandIndex].type === 'Z') {
            targetCommandIndex--;
          }
          
          if (targetCommandIndex >= 0 && commands[targetCommandIndex].type === 'C') {
            candidatePairedPoint = points.find((p: ControlPoint) => 
              p.commandIndex === targetCommandIndex && p.pointIndex === 1
            ) || null;
          } else if (isClosed) {
            // For closed paths, if we're at the first curve command, pair with the last curve's incoming
            // Find the last C command before any Z
            for (let i = commands.length - 1; i >= 1; i--) {
              if (commands[i].type === 'C') {
                candidatePairedPoint = points.find((p: ControlPoint) => 
                  p.commandIndex === i && p.pointIndex === 1
                ) || null;
                break;
              }
            }
          }
        }
        
        // For paired control points, verify they have the exact same anchor
        if (candidatePairedPoint) {
          const tolerance = 0.1;
          const anchorDistance = Math.sqrt(
            Math.pow(point.anchor.x - candidatePairedPoint.anchor.x, 2) + 
            Math.pow(point.anchor.y - candidatePairedPoint.anchor.y, 2)
          );
          
          if (anchorDistance < tolerance) {
            pairedPoint = candidatePairedPoint;
          }
        }
      }
      
      // Special case: if no paired point found and path is closed, look for control points that share coordinates with the M point
      if (!pairedPoint && isClosed && commands[cmd.commandIndex].type === 'C') {
        // Find the M point for this subpath
        let mCommandIndex = -1;
        for (let i = cmd.commandIndex; i >= 0; i--) {
          if (commands[i].type === 'M') {
            mCommandIndex = i;
            break;
          }
        }
        
        if (mCommandIndex !== -1) {
          const mPoint = (commands[mCommandIndex] as Command & { type: 'M' }).position;
          const currentPoint = point;
          
          // Check if current point shares x or y coordinate with M point
          const sharesX = Math.abs(currentPoint.x - mPoint.x) < 0.1;
          const sharesY = Math.abs(currentPoint.y - mPoint.y) < 0.1;
          
          if (sharesX || sharesY) {
            // Find other control points in the same subpath that share the same coordinate
            for (const otherPoint of points) {
              if (otherPoint.commandIndex !== cmd.commandIndex || otherPoint.pointIndex !== cmd.pointIndex) {
                // Check if it's in the same subpath (between M and Z)
                let inSameSubpath = false;
                if (otherPoint.commandIndex > mCommandIndex) {
                  inSameSubpath = true;
                  // Check if there's an M between them (new subpath)
                  for (let i = mCommandIndex + 1; i < otherPoint.commandIndex; i++) {
                    if (commands[i].type === 'M') {
                      inSameSubpath = false;
                      break;
                    }
                  }
                }
                
                if (inSameSubpath && otherPoint.isControl) {
                  const sharesCoord = (sharesX && Math.abs(otherPoint.x - mPoint.x) < 0.1) || 
                                     (sharesY && Math.abs(otherPoint.y - mPoint.y) < 0.1);
                  
                  if (sharesCoord) {
                    // Found a matching point
                    pairedPoint = otherPoint;
                    break;
                  }
                }
              }
            }
          }
        }
      }
      
      // Calculate alignment type based on positions (this will be the current type from the data)
      let calculatedType: 'independent' | 'aligned' | 'mirrored' = point.type || 'independent';
      let mag1 = 0;
      let angle1 = 0;
      let mag2: number | undefined;
      let angle2: number | undefined;
      let anchor2: {x: number, y: number} | undefined;
      
      let anchor1 = point.anchor;
      const vector1 = { x: point.x - anchor1.x, y: point.y - anchor1.y };
      mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
      angle1 = Math.atan2(vector1.y, vector1.x) * 180 / Math.PI;
      
      if (pairedPoint) {
        anchor2 = pairedPoint.anchor;
        const vector2 = { x: pairedPoint.x - anchor2.x, y: pairedPoint.y - anchor2.y };
        mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
        angle2 = Math.atan2(vector2.y, vector2.x) * 180 / Math.PI;
      }

      return {
        point,
        command: commands[cmd.commandIndex],
        info: {
          commandIndex: point.commandIndex,
          pointIndex: point.pointIndex,
          type: point.type,
          pairedCommandIndex: point.pairedCommandIndex,
          pairedPointIndex: point.pairedPointIndex,
          anchor: point.anchor
        },
        pairedPoint,
        pairedInfo: pairedPoint ? {
          commandIndex: pairedPoint.commandIndex,
          pointIndex: pairedPoint.pointIndex,
          type: pairedPoint.type,
          pairedCommandIndex: pairedPoint.pairedCommandIndex,
          pairedPointIndex: pairedPoint.pairedPointIndex,
          anchor: pairedPoint.anchor
        } : null,
        calculatedType,
        mag1,
        angle1,
        mag2,
        angle2,
        anchor1,
        anchor2,
        isAnchor: false
      };
    }
  }, [activePlugin, selectedCommands, elements]);

  const singlePointInfo = useMemo(() => getSinglePointInfo(), [getSinglePointInfo]);

  if (!singlePointInfo) {
    return null;
  }

  const handleAlignmentChange = (type: 'independent' | 'aligned' | 'mirrored') => {
    if (singlePointInfo && singlePointInfo.pairedPoint) {
      setControlPointAlignmentType(
        selectedCommands[0].elementId,
        selectedCommands[0].commandIndex,
        selectedCommands[0].pointIndex,
        singlePointInfo.pairedPoint.commandIndex,
        singlePointInfo.pairedPoint.pointIndex,
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

      {singlePointInfo.isAnchor ? (
        <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.4' }}>
          <div><strong style={{ color: '#333' }}>Position:</strong> ({singlePointInfo.point.x.toFixed(2)}, {singlePointInfo.point.y.toFixed(2)})</div>
          <div><strong style={{ color: '#333' }}>Location:</strong> {singlePointInfo.location}</div>
          {hasClosingZCommand(selectedCommands[0].elementId, selectedCommands[0].commandIndex) && (
            <div style={{ marginTop: '8px' }}>
              <button
                onClick={() => deleteZCommandForMPoint(selectedCommands[0].elementId, selectedCommands[0].commandIndex)}
                style={{
                  padding: '6px 8px',
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  border: '1px solid #dc3545',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'center'
                }}
                title="Delete the Z command that closes this path"
              >
                Delete Z Command
              </button>
            </div>
          )}
          {(singlePointInfo.command.type === 'L' || singlePointInfo.command.type === 'C') && 
           isLastPointOfSubpath(selectedCommands[0].elementId, selectedCommands[0].commandIndex, selectedCommands[0].pointIndex) && 
           !isAtMPosition(selectedCommands[0].elementId, selectedCommands[0].commandIndex, selectedCommands[0].pointIndex) && (
            <div style={{ marginTop: '8px' }}>
              <button
                onClick={() => moveToM(selectedCommands[0].elementId, selectedCommands[0].commandIndex, selectedCommands[0].pointIndex)}
                style={{
                  padding: '6px 8px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  border: '1px solid #28a745',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'center'
                }}
                title="Move this point to start a new subpath"
              >
                Move to M
              </button>
            </div>
          )}
          {(singlePointInfo.command.type === 'L' || singlePointInfo.command.type === 'C') && (
            <div style={{ marginTop: '8px' }}>
              <button
                onClick={() => convertCommandType(selectedCommands[0].elementId, selectedCommands[0].commandIndex)}
                style={{
                  padding: '6px 8px',
                  backgroundColor: '#17a2b8',
                  color: '#fff',
                  border: '1px solid #17a2b8',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'center'
                }}
                title={`Convert to ${singlePointInfo.command.type === 'L' ? 'C' : 'L'} command`}
              >
                To {singlePointInfo.command.type === 'L' ? 'C' : 'L'}
              </button>
            </div>
          )}
        </div>
      ) : singlePointInfo.pairedPoint ? (
        <>
          <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.4' }}>
            <div><strong style={{ color: '#333' }}>Position:</strong> ({singlePointInfo.point.x.toFixed(2)}, {singlePointInfo.point.y.toFixed(2)})</div>
            <div><strong style={{ color: '#333' }}>Command:</strong> {singlePointInfo.command.type} at index {singlePointInfo.point.commandIndex}</div>
            <div><strong style={{ color: '#333' }}>Point Index:</strong> {singlePointInfo.point.pointIndex}</div>
            <div><strong style={{ color: '#333' }}>Anchor:</strong> ({singlePointInfo.anchor1.x.toFixed(2)}, {singlePointInfo.anchor1.y.toFixed(2)})</div>
            <div><strong style={{ color: '#333' }}>Direction:</strong> {singlePointInfo.angle1.toFixed(1)}°</div>
            <div><strong style={{ color: '#333' }}>Size:</strong> {singlePointInfo.mag1.toFixed(2)}</div>
            <div><strong style={{ color: '#333' }}>Alignment:</strong> {singlePointInfo.info?.type || 'independent'}</div>
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
                backgroundColor: (singlePointInfo.info?.type || 'independent') === 'independent' ? '#007bff' : '#f8f9fa',
                color: (singlePointInfo.info?.type || 'independent') === 'independent' ? '#fff' : '#333',
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
                backgroundColor: (singlePointInfo.info?.type || 'independent') === 'aligned' ? '#007bff' : '#f8f9fa',
                color: (singlePointInfo.info?.type || 'independent') === 'aligned' ? '#fff' : '#333',
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
                backgroundColor: (singlePointInfo.info?.type || 'independent') === 'mirrored' ? '#007bff' : '#f8f9fa',
                color: (singlePointInfo.info?.type || 'independent') === 'mirrored' ? '#fff' : '#333',
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
            {(singlePointInfo.info?.type || 'independent') === 'independent' && 'Points move independently'}
            {(singlePointInfo.info?.type || 'independent') === 'aligned' && 'Points maintain opposite directions'}
            {(singlePointInfo.info?.type || 'independent') === 'mirrored' && 'Points are mirrored across anchor'}
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
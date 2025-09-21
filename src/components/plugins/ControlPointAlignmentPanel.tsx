import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { parsePathD, findPairedControlPoint, extractEditablePoints, type ControlPoint } from '../../utils/pathParserUtils';
import { RotateCcw } from 'lucide-react';

export const ControlPointAlignmentPanel: React.FC = () => {
  const {
    selectedCommands,
    activePlugin,
    getControlPointInfo,
    setControlPointAlignmentType,
    elements
  } = useCanvasStore();

  // Get info for a single selected control point
  const getSinglePointInfo = () => {
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
    const pairedInfo = (info && info.pairedCommandIndex !== undefined && info.pairedPointIndex !== undefined) ? getControlPointInfo(cmd.elementId, info.pairedCommandIndex, info.pairedPointIndex) : null;
    const pairedPoint = pairedInfo ? points.find((p: ControlPoint) => p.commandIndex === pairedInfo.commandIndex && p.pointIndex === pairedInfo.pointIndex) : null;

    return {
      point,
      command: commands[cmd.commandIndex],
      info,
      pairedPoint,
      pairedInfo
    };
  };

  // Find alignable control point pairs from selected commands
  const getAlignablePairs = () => {
    if (activePlugin !== 'edit' || selectedCommands.length !== 2) {
      return [];
    }

    const pairs = [];
    const [cmd1, cmd2] = selectedCommands;

    // Check if both are control points
    const element = elements.find(el => el.id === cmd1.elementId);
    if (!element || element.type !== 'path' || element.id !== cmd2.elementId) {
      return [];
    }

    const pathData = element.data as import('../../types').PathData;
    const commands = parsePathD(pathData.d);

    let isPairable = false;

    if (cmd1.commandIndex === cmd2.commandIndex) {
      const command = commands[cmd1.commandIndex];
      if (command.type === 'C' && ((cmd1.pointIndex === 0 && cmd2.pointIndex === 1) || (cmd1.pointIndex === 1 && cmd2.pointIndex === 0))) {
        isPairable = true;
      }
    } else {
      const paired = findPairedControlPoint(commands, cmd1.commandIndex, cmd1.pointIndex);
      if (paired && paired.commandIndex === cmd2.commandIndex && paired.pointIndex === cmd2.pointIndex) {
        isPairable = true;
      } else if (cmd1.commandIndex + 1 === cmd2.commandIndex && cmd1.pointIndex === 1 && cmd2.pointIndex === 0) {
        isPairable = true;
      }
    }

    if (isPairable) {
      const info1 = getControlPointInfo(cmd1.elementId, cmd1.commandIndex, cmd1.pointIndex);
      const currentType = info1?.type || 'independent';
      pairs.push({
        point1: cmd1,
        point2: cmd2,
        currentType
      });
    }

    return pairs;
  };

  const alignablePairs = getAlignablePairs();
  const singlePointInfo = getSinglePointInfo();

  if (alignablePairs.length === 0 && !singlePointInfo) {
    return null;
  }

  const handleAlignmentChange = (type: 'independent' | 'aligned' | 'mirrored') => {
    const pair = alignablePairs[0];
    setControlPointAlignmentType(
      pair.point1.elementId,
      pair.point1.commandIndex,
      pair.point1.pointIndex,
      pair.point2.commandIndex,
      pair.point2.pointIndex,
      type
    );
  };

  return (
    <div style={{ backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <RotateCcw size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Control Point Alignment</span>
      </div>

      {singlePointInfo ? (
        <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.4' }}>
          <div><strong style={{ color: '#333' }}>Position:</strong> ({singlePointInfo.point.x.toFixed(2)}, {singlePointInfo.point.y.toFixed(2)})</div>
          <div><strong style={{ color: '#333' }}>Command:</strong> {singlePointInfo.command.type} at index {singlePointInfo.point.commandIndex}</div>
          <div><strong style={{ color: '#333' }}>Point Index:</strong> {singlePointInfo.point.pointIndex}</div>
          <div><strong style={{ color: '#333' }}>Alignment:</strong> {singlePointInfo.info?.type || 'independent'}</div>
          {singlePointInfo.pairedPoint && (
            <div><strong style={{ color: '#333' }}>Paired Point:</strong> ({singlePointInfo.pairedPoint.x.toFixed(2)}, {singlePointInfo.pairedPoint.y.toFixed(2)}) at command {singlePointInfo.pairedInfo?.commandIndex}, point {singlePointInfo.pairedInfo?.pointIndex}</div>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => handleAlignmentChange('independent')}
              style={{
                padding: '6px 8px',
                backgroundColor: alignablePairs[0].currentType === 'independent' ? '#007bff' : '#f8f9fa',
                color: alignablePairs[0].currentType === 'independent' ? '#fff' : '#333',
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
                backgroundColor: alignablePairs[0].currentType === 'aligned' ? '#007bff' : '#f8f9fa',
                color: alignablePairs[0].currentType === 'aligned' ? '#fff' : '#333',
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
                backgroundColor: alignablePairs[0].currentType === 'mirrored' ? '#007bff' : '#f8f9fa',
                color: alignablePairs[0].currentType === 'mirrored' ? '#fff' : '#333',
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
            {alignablePairs[0].currentType === 'independent' && 'Points move independently'}
            {alignablePairs[0].currentType === 'aligned' && 'Points maintain opposite directions'}
            {alignablePairs[0].currentType === 'mirrored' && 'Points are mirrored across anchor'}
          </div>
        </>
      )}
    </div>
  );
};
import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Pen, RotateCcw, Minus, Copy, Clipboard } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { extractEditablePoints, extractSubpaths, commandsToString } from '../../utils/pathParserUtils';
import type { CanvasElement, PathData } from '../../types';

export const SelectPanel: React.FC = () => {
  const { elements, selectedIds, selectedSubpaths, addElement } = useCanvasStore();

  const selectedElements = elements.filter(el => selectedIds.includes(el.id));

  // Build list of items to display
  const items: Array<{
    type: 'element' | 'subpath';
    element: CanvasElement;
    subpathIndex?: number;
    pointCount: number;
  }> = [];

  selectedElements.forEach(el => {
    if (el.type === 'path') {
      const commands = (el.data as PathData).subPaths.flat();
      const pointCount = extractEditablePoints(commands).length;
      items.push({ type: 'element', element: el, pointCount });

      // Add selected subpaths for this element
      const elementSubpaths = selectedSubpaths.filter(sp => sp.elementId === el.id);
      const subpaths = extractSubpaths(commands);
      elementSubpaths.forEach(sp => {
        const subpathData = subpaths[sp.subpathIndex];
        if (subpathData) {
          const subPointCount = extractEditablePoints(subpathData.commands).length;
          items.push({ type: 'subpath', element: el, subpathIndex: sp.subpathIndex, pointCount: subPointCount });
        }
      });
    } else {
      // For non-path elements, just add them
      items.push({ type: 'element', element: el, pointCount: 0 });
    }
  });

  const duplicateItem = (item: typeof items[0]) => {
    if (item.type === 'element') {
      // Duplicate the entire element
      const { id: _id, zIndex: _zIndex, ...elementData } = item.element;
      addElement(elementData);
    } else if (item.type === 'subpath' && item.subpathIndex !== undefined) {
      // Duplicate the subpath as a new element
      const commands = (item.element.data as PathData).subPaths.flat();
      const subpaths = extractSubpaths(commands);
      const subpathData = subpaths[item.subpathIndex];
      if (subpathData) {
        // Create new path element from subpath
        addElement({
          type: 'path',
          data: {
            ...item.element.data,
            subPaths: [subpathData.commands],
          },
        });
      }
    }
  };

  const copyPathToClipboard = async (item: typeof items[0]) => {
    let pathData = '';

    if (item.type === 'element') {
      // Copy the entire element's path
      if (item.element.type === 'path') {
        pathData = commandsToString((item.element.data as PathData).subPaths.flat());
      }
    } else if (item.type === 'subpath' && item.subpathIndex !== undefined) {
      // Copy the subpath's path
      const commands = (item.element.data as PathData).subPaths.flat();
      const subpaths = extractSubpaths(commands);
      const subpathData = subpaths[item.subpathIndex];
      if (subpathData) {
        pathData = commandsToString(subpathData.commands);
      }
    }

    if (pathData) {
      try {
        await navigator.clipboard.writeText(pathData);
        console.log('Path copied to clipboard:', pathData);
      } catch (err) {
        console.error('Failed to copy path to clipboard:', err);
      }
    }
  };

  return (
    <div style={{
      backgroundColor: '#fff',
      padding: '0 8px 0 8px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        height: '94px', // Fixed height for ~2.5 elements (25% larger)
        overflowY: 'auto'
      }}>
        {items.length > 0 ? (
          items.map((item) => (
            <div key={`${item.element.id}-${item.type}-${item.subpathIndex || 0}`} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: item.type === 'subpath' ? '2px 4px 2px 16px' : '2px 4px',
              backgroundColor: '#f8f9fa',
              borderRadius: '3px',
              fontSize: '11px',
              marginBottom: '4px'
            }}>
              {item.type === 'element' ? (
                item.element.type === 'path' ? <Pen size={12} /> : <Pen size={12} />
              ) : (
                <Minus size={12} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500' }}>
                  {item.type === 'element'
                    ? `${item.element.type} (z: ${item.element.zIndex})`
                    : `Subpath ${item.subpathIndex}`
                  }
                </div>
                <div style={{ fontSize: '10px', color: '#666' }}>
                  {item.pointCount} points
                </div>
              </div>
              <IconButton
                onClick={() => duplicateItem(item)}
                title="Duplicate"
                size="small"
              >
                <Copy size={10} />
              </IconButton>
              <IconButton
                onClick={() => copyPathToClipboard(item)}
                title="Copy Path to Clipboard"
                size="small"
              >
                <Clipboard size={10} />
              </IconButton>
            </div>
          ))
        ) : (
          <div style={{
            fontSize: '11px',
            color: '#666',
            textAlign: 'center',
            padding: '8px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <IconButton onClick={() => { localStorage.removeItem('canvas-app-state'); window.location.reload(); }} title="Reset">
              <RotateCcw size={12} /> Reset
            </IconButton>
          </div>
        )}
      </div>
    </div>
  );
};
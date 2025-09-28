import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Plus, Scissors, Zap } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { Tag } from '../ui/Tag';

export const PathOperationsPanel: React.FC = () => {
  const { selectedIds, selectedSubpaths, elements, performPathUnion, performPathSimplify } = useCanvasStore();

  // Get selected paths/subpaths
  const selectedPaths = elements.filter(el =>
    selectedIds.includes(el.id) && el.type === 'path'
  );

  const selectedSubpathElements = selectedSubpaths.map(sp => {
    const element = elements.find(el => el.id === sp.elementId);
    if (element && element.type === 'path') {
      return { element, subpathIndex: sp.subpathIndex };
    }
    return null;
  }).filter(Boolean);

  const totalSelectedItems = selectedPaths.length + selectedSubpathElements.length;

  // Show if at least 1 path/subpath is selected
  if (totalSelectedItems < 1) {
    return null;
  }

  const performUnion = () => {
    performPathUnion();
  };

  const performSimplify = () => {
    performPathSimplify();
  };

  return (
    <div style={{ backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Scissors size={16} style={{ marginRight: '6px', color: '#666' }} />
          <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Path Operations</span>
        </div>
        <Tag badge={true}>
          {totalSelectedItems}
        </Tag>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        {/* Simplify operation - available with 1+ items */}
        <IconButton
          onPointerUp={performSimplify}
          title="Split subpaths into separate paths"
        >
          <Zap size={14} />
        </IconButton>

        {/* Boolean operations - require 2+ items */}
        {totalSelectedItems >= 2 && (
          <>
            <IconButton
              onPointerUp={performUnion}
              title="Union (Add all paths)"
            >
              <Plus size={14} />
            </IconButton>
          </>
        )}
      </div>
    </div>
  );
};
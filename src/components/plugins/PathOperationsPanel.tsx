import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Plus, Scissors, Zap, Minus, CirclePlus, Square, X, SplitSquareHorizontal } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { Tag } from '../ui/Tag';
import type { PathData } from '../../types';

export const PathOperationsPanel: React.FC = () => {
  const { selectedIds, selectedSubpaths, elements, performPathUnion, performPathSubtraction, performPathSimplify, performPathUnionPaperJS, performPathIntersect, performPathExclude, performPathDivide } = useCanvasStore();

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

  // Check if any selected path has more than one subpath
  const hasPathWithMultipleSubpaths = selectedPaths.some(pathEl => (pathEl.data as PathData).subPaths?.length > 1);

  // Show panel only if there are buttons to display
  if (!hasPathWithMultipleSubpaths && totalSelectedItems < 2) {
    return null;
  }

  const performUnion = () => {
    performPathUnion();
  };

  const performUnionPaperJS = () => {
    performPathUnionPaperJS();
  };

  const performSubtraction = () => {
    performPathSubtraction();
  };

  const performIntersect = () => {
    performPathIntersect();
  };

  const performExclude = () => {
    performPathExclude();
  };

  const performDivide = () => {
    performPathDivide();
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
        {/* Split subpaths operation - available only if a selected path has multiple subpaths */}
        {hasPathWithMultipleSubpaths && (
          <IconButton
            onPointerUp={performSimplify}
            title="Split subpaths into separate paths"
          >
            <Zap size={14} />
          </IconButton>
        )}

        {/* Boolean operations - require 2+ items */}
        {totalSelectedItems >= 2 && (
          <>
            <IconButton
              onPointerUp={performUnion}
              title="Union (Simple)"
            >
              <Plus size={14} />
            </IconButton>
            <IconButton
              onPointerUp={performUnionPaperJS}
              title="Union (Paper.js)"
            >
              <CirclePlus size={14} />
            </IconButton>
            {totalSelectedItems === 2 && (
              <>
                <IconButton
                  onPointerUp={performSubtraction}
                  title="Subtract (First - Second)"
                >
                  <Minus size={14} />
                </IconButton>
                <IconButton
                  onPointerUp={performIntersect}
                  title="Intersect (First ∩ Second)"
                >
                  <Square size={14} />
                </IconButton>
                <IconButton
                  onPointerUp={performExclude}
                  title="Exclude (First ⊕ Second)"
                >
                  <X size={14} />
                </IconButton>
                <IconButton
                  onPointerUp={performDivide}
                  title="Divide (Split at intersections)"
                >
                  <SplitSquareHorizontal size={14} />
                </IconButton>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
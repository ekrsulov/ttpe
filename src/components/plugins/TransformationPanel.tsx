import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { VectorSquare } from 'lucide-react';
import { PanelWithHeader } from '../ui/PanelComponents';
import { SelectionInfo } from '../ui/PanelHelpers';
import { Checkbox } from '../ui/FormComponents';

export const TransformationPanel: React.FC = () => {
  const {
    selectedIds,
    selectedSubpaths,
    transformation,
    updateTransformationState,
    isWorkingWithSubpaths
  } = useCanvasStore();
  const { showCoordinates, showRulers } = transformation;

  const isSubpathMode = isWorkingWithSubpaths();
  const selectedCount = isSubpathMode ? selectedSubpaths.length : selectedIds.length;

  return (
    <PanelWithHeader 
      icon={<VectorSquare size={16} />} 
      title="Transform"
      headerActions={isSubpathMode && (
        <span style={{ fontSize: '10px', color: '#8b5cf6', marginLeft: '4px', backgroundColor: '#f3f4f6', padding: '1px 4px', borderRadius: '3px' }}>
          Subpath
        </span>
      )}
    >
      <SelectionInfo 
        activePlugin="transformation"
        selectedCount={selectedCount}
        isSubpathMode={isSubpathMode}
        noSelectionMessage={`Select ${isSubpathMode ? 'a subpath' : 'an element'} to transform`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Checkbox
          id="showCoordinates"
          checked={showCoordinates}
          onChange={(checked) => updateTransformationState({ showCoordinates: checked })}
          label="Coordinates"
        />

        <Checkbox
          id="showRulers"
          checked={showRulers}
          onChange={(checked) => updateTransformationState({ showRulers: checked })}
          label="Rulers"
        />
      </div>
    </PanelWithHeader>
  );
};
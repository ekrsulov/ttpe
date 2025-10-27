import React from 'react';
import { VStack, Text } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../components/ui/Panel';
import { PercentSliderControl } from '../../components/ui/PercentSliderControl';
import { PaintBucket } from 'lucide-react';

const GridFillPanel: React.FC = () => {
  const gridFill = useCanvasStore(state => state.gridFill);
  const updateGridFillState = useCanvasStore(state => state.updateGridFillState);

  if (!gridFill || !updateGridFillState) {
    return null;
  }

  const handleFillOpacityChange = (value: number) => {
    updateGridFillState({ fillOpacity: value });
  };

  return (
    <Panel icon={<PaintBucket size={16} />} title="Grid Fill">
      <VStack spacing={2} align="stretch">
        <Text fontSize="12px" color="gray.500" mb={1}>
          Click on grid cells to fill them with shapes
        </Text>

        {/* Fill Settings */}
        <PercentSliderControl
          label="Fill Opacity"
          value={gridFill.fillOpacity}
          onChange={handleFillOpacityChange}
          title="Fill opacity"
        />
        
        <Text fontSize="11px" color="gray.400" mt={1}>
          Fill color is taken from the Editor panel
        </Text>
      </VStack>
    </Panel>
  );
};

export { GridFillPanel };

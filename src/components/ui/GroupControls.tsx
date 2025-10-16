import React from 'react';
import { ButtonGroup, IconButton, Tooltip } from '@chakra-ui/react';
import { Group, Ungroup } from 'lucide-react';

interface GroupControlsProps {
  canGroup: boolean;
  canUngroup: boolean;
  onGroup: () => void;
  onUngroup: () => void;
}

export const GroupControls: React.FC<GroupControlsProps> = ({
  canGroup,
  canUngroup,
  onGroup,
  onUngroup,
}) => {
  return (
    <ButtonGroup size="xs" isAttached variant="outline">
      <Tooltip label="Agrupar (Ctrl+G)" openDelay={300}>
        <IconButton
          aria-label="Agrupar elementos"
          icon={<Group size={14} />}
          onClick={onGroup}
          isDisabled={!canGroup}
          variant="outline"
        />
      </Tooltip>
      <Tooltip label="Desagrupar (Ctrl+Shift+G)" openDelay={300}>
        <IconButton
          aria-label="Desagrupar elementos"
          icon={<Ungroup size={14} />}
          onClick={onUngroup}
          isDisabled={!canUngroup}
          variant="outline"
        />
      </Tooltip>
    </ButtonGroup>
  );
};

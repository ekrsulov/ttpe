import type { ToolMode } from '../config/toolDefinitions';
import { TOOL_DEFINITIONS } from '../config/toolDefinitions';

const TOOL_DEFINITION_MAP = new Map(
  TOOL_DEFINITIONS.map((definition) => [definition.mode, definition])
);

export const getToolMetadata = (mode: ToolMode) => {
  const toolDefinition = TOOL_DEFINITION_MAP.get(mode);
  return {
    label: toolDefinition?.label ?? mode,
    icon: toolDefinition?.icon,
    cursor: toolDefinition?.cursor ?? 'default',
  };
};

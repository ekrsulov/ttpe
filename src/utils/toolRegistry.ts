import type { PluginDefinition } from '../types/plugins';
import type { CanvasStore } from '../store/canvasStore';
import { pluginManager } from './pluginManager';

export const registerToolPlugin = (definition: PluginDefinition<CanvasStore>): void => {
  pluginManager.register(definition);
};

export const unregisterToolPlugin = (pluginId: string): void => {
  pluginManager.unregister(pluginId);
};

export const getRegisteredTool = (pluginId: string) => pluginManager.getPlugin(pluginId);

export const listRegisteredTools = () => pluginManager.getAll();

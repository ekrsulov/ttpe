/**
 * @deprecated This module contained unused wrapper functions.
 * Use pluginManager directly from './pluginManager' instead.
 * 
 * This file is kept for backward compatibility but will be removed in a future version.
 * 
 * Migration:
 * - pluginManager.register() instead of registerToolPlugin()
 * - pluginManager.unregister() instead of unregisterToolPlugin()
 * - pluginManager.getPlugin() instead of getRegisteredTool()
 * - pluginManager.getAll() instead of listRegisteredTools()
 */

import { pluginManager } from './pluginManager';

// Re-export pluginManager for convenience
export { pluginManager };

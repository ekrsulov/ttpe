import { CollaborationManager } from './CollaborationManager';
import { canvasStoreApi } from '../../store/canvasStore';

/**
 * Global collaboration manager instance (singleton)
 */
let globalCollaborationManager: CollaborationManager | null = null;

/**
 * Get or create the global collaboration manager instance
 */
export function getCollaborationManager(): CollaborationManager {
  if (!globalCollaborationManager) {
    globalCollaborationManager = new CollaborationManager(canvasStoreApi);
  }
  return globalCollaborationManager;
}

import React from 'react';
import { CollaborationPresenceManager } from './CollaborationPresenceManager';
import { getCollaborationManager } from './collaborationManagerInstance';

/**
 * Singleton wrapper that provides the CollaborationManager instance
 * to the presence tracking system.
 */
export const CollaborationGlobalManager: React.FC = () => {
  // Use the singleton instance
  const manager = getCollaborationManager();

  return <CollaborationPresenceManager collaborationManager={manager} />;
};

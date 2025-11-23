/**
 * Collaboration types for multiplayer support
 */

export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  cursor?: {
    x: number;
    y: number;
  };
  selection?: string[];
  lastSeen: number;
}

export interface CollaborationSession {
  id: string;
  name: string;
  users: Record<string, CollaborationUser>;
  createdAt: number;
  updatedAt: number;
}

export interface CollaborationState {
  isEnabled: boolean;
  isConnected: boolean;
  sessionId: string | null;
  currentUserId: string | null;
  currentUser: CollaborationUser | null;
  users: Record<string, CollaborationUser>;
  error: string | null;
}

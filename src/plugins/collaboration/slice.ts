import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { CollaborationUser } from '../../types/collaboration';

export interface CollaborationSlice {
  collaboration: {
    isEnabled: boolean;
    isConnected: boolean;
    sessionId: string | null;
    currentUserId: string | null;
    currentUser: CollaborationUser | null;
    users: Record<string, CollaborationUser>;
    error: string | null;
  };

  // Actions
  setCollaborationEnabled: (enabled: boolean) => void;
  setCollaborationConnected: (connected: boolean) => void;
  setSessionId: (sessionId: string | null) => void;
  setCurrentUser: (user: CollaborationUser | null) => void;
  updateRemoteUser: (userId: string, user: CollaborationUser) => void;
  removeRemoteUser: (userId: string) => void;
  setCollaborationError: (error: string | null) => void;
  updateUserCursor: (userId: string, x: number, y: number) => void;
  updateUserSelection: (userId: string, selection: string[]) => void;
}

export const createCollaborationSlice: StateCreator<
  CanvasStore,
  [],
  [],
  CollaborationSlice
> = (set) => ({
  collaboration: {
    isEnabled: false,
    isConnected: false,
    sessionId: null,
    currentUserId: null,
    currentUser: null,
    users: {},
    error: null,
  },

  setCollaborationEnabled: (enabled) =>
    set((state) => ({
      collaboration: {
        ...state.collaboration,
        isEnabled: enabled,
      },
    })),

  setCollaborationConnected: (connected) =>
    set((state) => ({
      collaboration: {
        ...state.collaboration,
        isConnected: connected,
      },
    })),

  setSessionId: (sessionId) =>
    set((state) => ({
      collaboration: {
        ...state.collaboration,
        sessionId,
      },
    })),

  setCurrentUser: (user) =>
    set((state) => ({
      collaboration: {
        ...state.collaboration,
        currentUser: user,
        currentUserId: user?.id ?? null,
      },
    })),

  updateRemoteUser: (userId, user) =>
    set((state) => ({
      collaboration: {
        ...state.collaboration,
        users: {
          ...state.collaboration.users,
          [userId]: user,
        },
      },
    })),

  removeRemoteUser: (userId) =>
    set((state) => {
      const { [userId]: _, ...restUsers } = state.collaboration.users;
      return {
        collaboration: {
          ...state.collaboration,
          users: restUsers,
        },
      };
    }),

  setCollaborationError: (error) =>
    set((state) => ({
      collaboration: {
        ...state.collaboration,
        error,
      },
    })),

  updateUserCursor: (userId, x, y) =>
    set((state) => {
      const user = state.collaboration.users[userId];
      if (!user) return state;

      return {
        collaboration: {
          ...state.collaboration,
          users: {
            ...state.collaboration.users,
            [userId]: {
              ...user,
              cursor: { x, y },
              lastSeen: Date.now(),
            },
          },
        },
      };
    }),

  updateUserSelection: (userId, selection) =>
    set((state) => {
      const user = state.collaboration.users[userId];
      if (!user) return state;

      return {
        collaboration: {
          ...state.collaboration,
          users: {
            ...state.collaboration.users,
            [userId]: {
              ...user,
              selection,
              lastSeen: Date.now(),
            },
          },
        },
      };
    }),
});

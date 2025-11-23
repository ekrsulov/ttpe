import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { CanvasStoreApi } from '../../store/canvasStore';
import type { CollaborationUser } from '../../types/collaboration';
import type { CanvasElement } from '../../types';

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
];

/**
 * CollaborationManager handles real-time synchronization using Yjs CRDTs
 * and WebSocket connectivity for multiplayer editing.
 */
export class CollaborationManager {
  private doc: Y.Doc;
  private provider: WebsocketProvider | null = null;
  private storeApi: CanvasStoreApi;
  private yElements: Y.Map<unknown> | null = null;
  private yViewport: Y.Map<unknown> | null = null;
  private awareness: WebsocketProvider['awareness'] | null = null;
  private currentUserId: string;
  private isSyncing = false;

  constructor(storeApi: CanvasStoreApi) {
    this.doc = new Y.Doc();
    this.storeApi = storeApi;
    this.currentUserId = this.generateUserId();
  }

  /**
   * Connect to a collaboration session
   */
  public async connect(sessionId: string, userName?: string): Promise<void> {
    try {
      // Determine WebSocket server URL
      const wsUrl = this.getWebSocketUrl();
      
      // Create WebSocket provider
      this.provider = new WebsocketProvider(
        wsUrl,
        `canvas-session-${sessionId}`,
        this.doc,
        {
          connect: true,
        }
      );

      // Get shared types
      this.yElements = this.doc.getMap('elements');
      this.yViewport = this.doc.getMap('viewport');

      // Setup awareness for presence
      this.awareness = this.provider.awareness;
      
      // Set local user state
      const user: CollaborationUser = {
        id: this.currentUserId,
        name: userName || `User ${Math.floor(Math.random() * 1000)}`,
        color: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
        lastSeen: Date.now(),
      };

      this.awareness.setLocalState({
        user,
        cursor: null,
        selection: [],
      });

      // Update store
      this.storeApi.setState({
        collaboration: {
          ...this.storeApi.getState().collaboration,
          isEnabled: true,
          sessionId,
          currentUserId: this.currentUserId,
          currentUser: user,
        },
      });

      // Listen for provider status
      this.provider.on('status', (event: { status: string }) => {
        const connected = event.status === 'connected';
        this.storeApi.setState({
          collaboration: {
            ...this.storeApi.getState().collaboration,
            isConnected: connected,
            error: connected ? null : 'Connection lost',
          },
        });
      });

      // Listen for synced state
      this.provider.on('sync', (isSynced: boolean) => {
        if (isSynced) {
          console.log('[Collaboration] Synced with server');
          this.syncFromYjs();
        }
      });

      // Listen for awareness changes (remote users)
      this.awareness.on('change', () => {
        this.updateRemoteUsers();
      });

      // Listen for Yjs changes and sync to Zustand
      this.yElements?.observe(() => {
        if (!this.isSyncing) {
          this.syncFromYjs();
        }
      });

      this.yViewport?.observe(() => {
        if (!this.isSyncing) {
          this.syncViewportFromYjs();
        }
      });

      // Subscribe to Zustand changes and sync to Yjs
      this.storeApi.subscribe((state, prevState) => {
        if (!this.isSyncing && this.provider && this.provider.wsconnected) {
          this.syncToYjs(state, prevState);
        }
      });

    } catch (error) {
      console.error('[Collaboration] Connection error:', error);
      this.storeApi.setState({
        collaboration: {
          ...this.storeApi.getState().collaboration,
          error: error instanceof Error ? error.message : 'Connection failed',
        },
      });
      throw error;
    }
  }

  /**
   * Disconnect from the collaboration session
   */
  public disconnect(): void {
    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }

    this.storeApi.setState({
      collaboration: {
        isEnabled: false,
        isConnected: false,
        sessionId: null,
        currentUserId: null,
        currentUser: null,
        users: {},
        error: null,
      },
    });
  }

  /**
   * Update cursor position for presence
   */
  public updateCursor(x: number, y: number): void {
    if (this.awareness) {
      const localState = this.awareness.getLocalState();
      this.awareness.setLocalState({
        ...localState,
        cursor: { x, y },
      });
    }
  }

  /**
   * Update selection for presence
   */
  public updateSelection(selectedIds: string[]): void {
    if (this.awareness) {
      const localState = this.awareness.getLocalState();
      this.awareness.setLocalState({
        ...localState,
        selection: selectedIds,
      });
    }
  }

  /**
   * Sync Zustand state to Yjs
   */
  private syncToYjs(state: ReturnType<CanvasStoreApi['getState']>, prevState: ReturnType<CanvasStoreApi['getState']>): void {
    if (!this.yElements || !this.yViewport) return;

    this.isSyncing = true;

    try {
      this.doc.transact(() => {
        // Sync elements
        if (state.elements !== prevState.elements) {
          const elementsMap = new Map();
          state.elements.forEach((el: { id: string }) => {
            elementsMap.set(el.id, el);
          });
          
          // Update/Add elements
          elementsMap.forEach((element, id) => {
            this.yElements?.set(id, element);
          });

          // Remove deleted elements
          const currentIds = new Set(state.elements.map((el: CanvasElement) => el.id));
          const yjsIds = Array.from(this.yElements?.keys() || []);
          yjsIds.forEach((id) => {
            if (!currentIds.has(id as string)) {
              this.yElements?.delete(id as string);
            }
          });
        }

        // Sync viewport (optional, for shared view)
        if (state.viewport !== prevState.viewport) {
          this.yViewport?.set('zoom', state.viewport.zoom);
          this.yViewport?.set('panX', state.viewport.panX);
          this.yViewport?.set('panY', state.viewport.panY);
        }
      });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync Yjs state to Zustand
   */
  private syncFromYjs(): void {
    if (!this.yElements) return;

    this.isSyncing = true;

    try {
      const elements: CanvasElement[] = [];
      this.yElements.forEach((element: unknown) => {
        elements.push(element as CanvasElement);
      });

      // Sort by zIndex
      elements.sort((a, b) => a.zIndex - b.zIndex);

      this.storeApi.setState({
        elements,
      });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync viewport from Yjs
   */
  private syncViewportFromYjs(): void {
    if (!this.yViewport) return;

    this.isSyncing = true;

    try {
      const zoom = this.yViewport.get('zoom');
      const panX = this.yViewport.get('panX');
      const panY = this.yViewport.get('panY');

      if (zoom !== undefined && panX !== undefined && panY !== undefined) {
        this.storeApi.setState({
          viewport: {
            ...this.storeApi.getState().viewport,
            zoom: zoom as number,
            panX: panX as number,
            panY: panY as number,
          },
        });
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Update remote users from awareness
   */
  private updateRemoteUsers(): void {
    if (!this.awareness) return;

    const states = this.awareness.getStates();
    const users: Record<string, CollaborationUser> = {};

    states.forEach((state: { user?: CollaborationUser; cursor?: { x: number; y: number }; selection?: string[] }, clientId: number) => {
      if (!this.awareness || clientId === this.awareness.clientID) return; // Skip self

      const user = state.user;
      if (user) {
        users[user.id] = {
          ...user,
          cursor: state.cursor || undefined,
          selection: state.selection || [],
        };
      }
    });

    this.storeApi.setState({
      collaboration: {
        ...this.storeApi.getState().collaboration,
        users,
      },
    });
  }

  /**
   * Generate a unique user ID
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get WebSocket server URL from environment variable
   */
  private getWebSocketUrl(): string {
    const envUrl = import.meta.env.VITE_COLLABORATION_WS_URL;
    
    if (!envUrl) {
      console.warn(
        'VITE_COLLABORATION_WS_URL not set. Using default: ws://localhost:1234\n' +
        'Set this in your .env file for production deployments.'
      );
      return 'ws://localhost:1234';
    }
    
    return envUrl;
  }

  /**
   * Create a shareable URL for the current session
   */
  public static createSessionUrl(sessionId: string): string {
    const url = new URL(window.location.href);
    url.searchParams.set('session', sessionId);
    return url.toString();
  }

  /**
   * Extract session ID from URL
   */
  public static getSessionFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('session');
  }

  /**
   * Generate a new session ID
   */
  public static generateSessionId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

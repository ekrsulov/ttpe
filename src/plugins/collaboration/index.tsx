import { Users } from 'lucide-react';
import React from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import type { PanelConfig } from '../../types/panel';
import { createCollaborationSlice } from './slice';
import { CollaborationPanel } from './CollaborationPanel';
import { RemoteCursorsOverlay } from './RemoteCursorsOverlay';
import { RemoteSelectionsOverlay } from './RemoteSelectionsOverlay';
import { CollaborationGlobalManager } from './CollaborationGlobalManager';

// Lazy load the collaboration panel
const LazyCollaborationPanel = React.lazy(() => 
  Promise.resolve({ default: CollaborationPanel })
);

export const collaborationPlugin: PluginDefinition<CanvasStore> = {
  id: 'collaboration',
  metadata: {
    label: 'Collaboration',
    icon: Users,
  },

  // Register the collaboration slice
  slices: [
    (set, get, api) => {
      const slice = createCollaborationSlice(set, get, api);
      return {
        state: {
          collaboration: slice.collaboration,
          setCollaborationEnabled: slice.setCollaborationEnabled,
          setCollaborationConnected: slice.setCollaborationConnected,
          setSessionId: slice.setSessionId,
          setCurrentUser: slice.setCurrentUser,
          updateRemoteUser: slice.updateRemoteUser,
          removeRemoteUser: slice.removeRemoteUser,
          setCollaborationError: slice.setCollaborationError,
          updateUserCursor: slice.updateUserCursor,
          updateUserSelection: slice.updateUserSelection,
        },
        cleanup: () => {
          // Cleanup logic if needed
        },
      };
    },
  ],

  // Add collaboration panel to sidebar using the declarative approach
  sidebarPanels: [
    {
      key: 'collaboration',
      condition: (ctx) => ctx.showFilePanel, // Show when File panel is active
      component: LazyCollaborationPanel,
    } as PanelConfig,
  ],

  // Add global overlays (DOM layer)
  overlays: [
    {
      id: 'collaboration-manager',
      placement: 'global',
      component: CollaborationGlobalManager,
    },
    {
      id: 'remote-cursors',
      placement: 'global',
      component: RemoteCursorsOverlay,
    },
  ],

  // Add remote selections overlay (SVG layer)
  canvasLayers: [
    {
      id: 'remote-selections',
      placement: 'foreground',
      render: () => <RemoteSelectionsOverlay />,
    },
  ],
};

/**
 * Panel component with Chakra UI
 * Replaces PanelWithHeader from PanelComponents.tsx
 */

import React from 'react'
import { Box, Collapse, useDisclosure } from '@chakra-ui/react'
import { PanelHeader } from './PanelHeader'
import { RenderCountBadgeWrapper } from './RenderCountBadgeWrapper'

export interface PanelProps {
  /** Icon to display in header */
  icon?: React.ReactNode
  /** Panel title */
  title?: string
  /** Hide header (title & icon) entirely */
  hideHeader?: boolean
  /** Panel content */
  children: React.ReactNode
  /** Optional actions in header (e.g., badges, buttons) */
  headerActions?: React.ReactNode
  /** Whether panel should be open by default */
  defaultOpen?: boolean
  /** Whether panel can be collapsed */
  isCollapsible?: boolean
  /** Show render count badge (debug only) */
  showRenderCount?: boolean
}

export const Panel: React.FC<PanelProps> = ({
  icon,
  title,
  hideHeader = false,
  children,
  headerActions,
  defaultOpen = true,
  isCollapsible = false,
  showRenderCount = import.meta.env.DEV,
}) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: defaultOpen })

  return (
    <Box
      position="relative"
    >
      {showRenderCount && (
        <RenderCountBadgeWrapper componentName={`Panel: ${title || 'Untitled'}`} position="top-left" />
      )}
      
      {!hideHeader && (icon || title) && (
        <PanelHeader
          icon={icon}
          title={title}
          actions={headerActions}
          isCollapsible={isCollapsible}
          isOpen={isOpen}
          onToggle={onToggle}
        />
      )}
      
      {isCollapsible ? (
        <Collapse in={isOpen} animateOpacity>
          <Box>
            {children}
          </Box>
        </Collapse>
      ) : (
        <Box>
          {children}
        </Box>
      )}
    </Box>
  )
}

/**
 * Panel component with Chakra UI
 * Replaces PanelWithHeader from PanelComponents.tsx
 */

import React from 'react'
import { Box, Collapse, useDisclosure } from '@chakra-ui/react'
import { PanelHeader } from './PanelHeader'

export interface PanelProps {
  /** Icon to display in header */
  icon: React.ReactNode
  /** Panel title */
  title: string
  /** Panel content */
  children: React.ReactNode
  /** Optional actions in header (e.g., badges, buttons) */
  headerActions?: React.ReactNode
  /** Whether panel should be open by default */
  defaultOpen?: boolean
  /** Whether panel can be collapsed */
  isCollapsible?: boolean
}

export const Panel: React.FC<PanelProps> = ({
  icon,
  title,
  children,
  headerActions,
  defaultOpen = true,
  isCollapsible = false,
}) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: defaultOpen })

  return (
    <Box bg="white" mb={0.5}>
      <PanelHeader
        icon={icon}
        title={title}
        actions={headerActions}
        isCollapsible={isCollapsible}
        isOpen={isOpen}
        onToggle={onToggle}
      />
      
      {isCollapsible ? (
        <Collapse in={isOpen} animateOpacity>
          <Box pb={2}>
            {children}
          </Box>
        </Collapse>
      ) : (
        <Box pb={2}>
          {children}
        </Box>
      )}
    </Box>
  )
}

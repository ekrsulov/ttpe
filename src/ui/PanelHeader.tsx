/**
 * PanelHeader component with Chakra UI
 * Replaces PanelHeader from PanelComponents.tsx
 */

import React from 'react'
import { Flex, Heading, Box, Spacer, IconButton } from '@chakra-ui/react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useThemeColors } from '../hooks'

export interface PanelHeaderProps {
  /** Icon to display */
  icon?: React.ReactNode
  /** Header title */
  title?: string
  /** Optional actions (badges, buttons) */
  actions?: React.ReactNode
  /** Whether panel is collapsible */
  isCollapsible?: boolean
  /** Current open state */
  isOpen?: boolean
  /** Toggle handler */
  onToggle?: () => void
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  icon,
  title,
  actions,
  isCollapsible = false,
  isOpen = true,
  onToggle,
}) => {
  const { panelHeader: { hoverBg, iconColor, titleColor } } = useThemeColors()

  return (
    <Flex
      align="center"
      bg="transparent"
      px={0}
      py={0.5}
      borderRadius="md"
      mb={0}
      minH="24px"
      cursor={isCollapsible ? 'pointer' : 'default'}
      onClick={isCollapsible ? onToggle : undefined}
      _hover={isCollapsible ? { bg: hoverBg } : undefined}
      transition="background 0.2s ease"
    >
      {/* Icon */}
      {icon && (
        <Box
          as="span"
          mr={1.5}
          color={iconColor}
          display="flex"
          alignItems="center"
        >
          {icon}
        </Box>
      )}

      {/* Title */}
      {title && (
        <Heading
          as="h3"
          size="xs"
          fontWeight="extrabold"
          color={titleColor}
          fontSize="sm"
        >
          {title}
        </Heading>
      )}

      {/* Spacer pushes actions to the right */}
      <Spacer />

      {/* Header Actions */}
      {actions && (
        <Box mr={isCollapsible ? 1 : 0}>
          {actions}
        </Box>
      )}

      {/* Collapse Toggle Icon */}
      {isCollapsible && (
        <IconButton
          aria-label={isOpen ? 'Collapse panel' : 'Expand panel'}
          icon={isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          size="xs"
          variant="ghost"
          minW="auto"
          h="auto"
          p={0}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation()
            onToggle?.()
          }}
        />
      )}
    </Flex>
  )
}

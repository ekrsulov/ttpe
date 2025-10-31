import React from 'react';
import { Flex, HStack, Heading } from '@chakra-ui/react';
import type { LucideIcon } from 'lucide-react';
import { PanelStyledButton } from './PanelStyledButton';

interface SectionHeaderProps {
  /** Icon component from lucide-react */
  icon?: LucideIcon;
  /** Section title */
  title: string;
  /** Optional action button text */
  actionLabel?: string;
  /** Optional action button click handler */
  onAction?: () => void;
  /** Optional action button title (tooltip) */
  actionTitle?: string;
  /** Optional flag to show/hide action button */
  showAction?: boolean;
}

/**
 * Reusable section header component for Edit panel and similar contexts
 * Provides consistent styling for icon + title + optional action button layout
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon: Icon,
  title,
  actionLabel = 'Apply',
  onAction,
  actionTitle,
  showAction = true,
}) => {
  return (
    <Flex 
      align="center" 
      justify="space-between" 
      mb={0} 
      bg="transparent" 
      py={0} 
      px={0}
      borderRadius="md"
      minH="24px"
    >
      <HStack spacing={1.5}>
        {Icon && <Icon size={16} color="#666" />}
        <Heading size="xs" fontWeight="extrabold">{title}</Heading>
      </HStack>
      {showAction && onAction && (
        <PanelStyledButton
          onClick={onAction}
          size="xs"
          title={actionTitle || title}
        >
          {actionLabel}
        </PanelStyledButton>
      )}
    </Flex>
  );
};

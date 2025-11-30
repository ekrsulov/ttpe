import React from 'react';
import { Box, HStack, Text, IconButton } from '@chakra-ui/react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import type { FloatingContextMenuAction } from '../types/plugins';
import { useMenuColors } from '../hooks/useMenuColors';

interface FloatingContextMenuItemProps {
  action: FloatingContextMenuAction;
  onNavigateToSubmenu?: (action: FloatingContextMenuAction) => void;
  isMobile?: boolean;
}

/**
 * Individual menu item for FloatingContextMenu.
 * Handles both regular actions and submenu triggers.
 */
export const FloatingContextMenuItem: React.FC<FloatingContextMenuItemProps> = ({
  action,
  onNavigateToSubmenu,
  isMobile = false,
}) => {
  const { hoverBg, iconColor, dangerColor, dangerHoverBg } = useMenuColors();

  const hasSubmenu = action.submenu && action.submenu.length > 0;

  // Handle icon rendering with rotation for specific cases
  const renderIcon = () => {
    if (action.id === 'send-back') {
      return (
        <Box transform="rotate(180deg)">
          <action.icon size={16} />
        </Box>
      );
    }
    return <action.icon size={16} />;
  };

  const handleClick = () => {
    if (hasSubmenu && isMobile && onNavigateToSubmenu) {
      onNavigateToSubmenu(action);
    } else if (action.onClick) {
      action.onClick();
    }
  };

  return (
    <Box
      as="button"
      onClick={handleClick}
      disabled={action.isDisabled}
      px={3}
      py={2}
      w="full"
      display="flex"
      alignItems="center"
      gap={2}
      transition="all 0.2s"
      bg="transparent"
      color={action.variant === 'danger' ? dangerColor : iconColor}
      opacity={action.isDisabled ? 0.4 : 1}
      cursor={action.isDisabled ? 'not-allowed' : 'pointer'}
      _hover={!action.isDisabled ? {
        bg: action.variant === 'danger' ? dangerHoverBg : hoverBg
      } : {}}
      _focus={{ outline: 'none', boxShadow: 'none' }}
      _active={{ outline: 'none' }}
      sx={{
        WebkitTapHighlightColor: 'transparent',
        '&:focus': { outline: 'none !important', boxShadow: 'none !important' },
        '&:focus-visible': { outline: 'none !important', boxShadow: 'none !important' },
      }}
      fontSize="14px"
      fontWeight="medium"
    >
      {renderIcon()}
      <Box flex="1" textAlign="left">{action.label}</Box>
      {hasSubmenu && (
        <Box flexShrink={0}>
          <ChevronRight size={14} />
        </Box>
      )}
    </Box>
  );
};

interface FloatingContextMenuMobileSubmenuProps {
  parentAction: FloatingContextMenuAction;
  onBack: () => void;
}

/**
 * Mobile submenu view for FloatingContextMenu.
 * Shows a header with back button and the submenu items.
 */
export const FloatingContextMenuMobileSubmenu: React.FC<FloatingContextMenuMobileSubmenuProps> = ({
  parentAction,
  onBack,
}) => {
  const { borderColor, hoverBg, iconColor, dangerColor, dangerHoverBg } = useMenuColors();

  if (!parentAction.submenu) return null;

  return (
    <>
      {/* Header with back button and title */}
      <HStack
        px={2}
        py={2}
        spacing={1}
        borderBottom="1px solid"
        borderColor={borderColor}
      >
        <IconButton
          icon={<ChevronLeft size={18} />}
          aria-label="Back to main menu"
          size="sm"
          variant="ghost"
          onClick={onBack}
          minW="auto"
          h="auto"
          p={1}
          _focus={{ outline: 'none', boxShadow: 'none' }}
          _active={{ outline: 'none' }}
        />
        <Text fontSize="12px" fontWeight="semibold" color={iconColor} flex="1">
          {parentAction.label}
        </Text>
      </HStack>

      {/* Submenu items */}
      {parentAction.submenu.map(subAction => {
        const iconElement = subAction.id === 'send-back' ? (
          <Box transform="rotate(180deg)">
            <subAction.icon size={16} />
          </Box>
        ) : (
          <subAction.icon size={16} />
        );

        return (
          <Box
            key={subAction.id}
            as="button"
            onClick={subAction.onClick}
            disabled={subAction.isDisabled}
            px={3}
            py={2}
            w="full"
            display="flex"
            alignItems="center"
            gap={2}
            transition="all 0.2s"
            bg="transparent"
            color={subAction.variant === 'danger' ? dangerColor : iconColor}
            opacity={subAction.isDisabled ? 0.4 : 1}
            cursor={subAction.isDisabled ? 'not-allowed' : 'pointer'}
            _hover={!subAction.isDisabled ? {
              bg: subAction.variant === 'danger' ? dangerHoverBg : hoverBg
            } : {}}
            _focus={{ outline: 'none', boxShadow: 'none' }}
            _active={{ outline: 'none' }}
            sx={{
              WebkitTapHighlightColor: 'transparent',
              '&:focus': { outline: 'none !important', boxShadow: 'none !important' },
              '&:focus-visible': { outline: 'none !important', boxShadow: 'none !important' },
            }}
            fontSize="14px"
            fontWeight="medium"
          >
            {iconElement}
            <span>{subAction.label}</span>
          </Box>
        );
      })}
    </>
  );
};

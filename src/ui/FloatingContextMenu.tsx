import React, { useState } from 'react';
import { Box, VStack, Divider, useColorModeValue, Menu, MenuButton, MenuList, MenuItem, useBreakpointValue, HStack, Text, IconButton } from '@chakra-ui/react';
import ConditionalTooltip from './ConditionalTooltip';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import type { FloatingContextMenuAction } from '../types/plugins';

interface FloatingContextMenuProps {
  /** Array of actions to display in the menu */
  actions: FloatingContextMenuAction[];
  /** Whether the menu is visible */
  isOpen: boolean;
}

/**
 * Floating Context Menu
 * 
 * A menu that displays contextual actions for selected elements.
 * Used with FloatingContextMenuButton in the bottom action bar.
 */
export const FloatingContextMenu: React.FC<FloatingContextMenuProps> = ({
  actions,
  isOpen,
}) => {
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const iconColor = useColorModeValue('gray.700', 'gray.300');
  const dangerColor = useColorModeValue('red.500', 'red.400');
  const dangerHoverBg = useColorModeValue('red.50', 'rgba(239, 68, 68, 0.1)');

  // State for mobile submenu navigation
  const [activeSubmenu, setActiveSubmenu] = useState<FloatingContextMenuAction | null>(null);

  // Check if we're on mobile
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Use left placement on mobile to prevent cutoff (for desktop)
  const submenuPlacement = useBreakpointValue({ base: 'left-start', md: 'right-start' }) as 'left-start' | 'right-start';

  if (!isOpen) return null;

  // On mobile, show submenu if active
  if (isMobile && activeSubmenu) {
    return (
      <VStack
        spacing={0}
        align="stretch"
        bg={bg}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="lg"
        boxShadow="lg"
        minW="180px"
        py={1}
        tabIndex={-1}
        _focus={{ outline: 'none', boxShadow: 'lg' }}
        sx={{
          '&:focus': { outline: 'none !important' },
          '&:focus-visible': { outline: 'none !important' },
          '& *:focus': { outline: 'none !important' },
          '& *:focus-visible': { outline: 'none !important' },
        }}
      >
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
            onClick={() => setActiveSubmenu(null)}
            minW="auto"
            h="auto"
            p={1}
            _focus={{ outline: 'none', boxShadow: 'none' }}
            _active={{ outline: 'none' }}
          />
          <Text fontSize="12px" fontWeight="semibold" color={iconColor} flex="1">
            {activeSubmenu.label}
          </Text>
        </HStack>

        {/* Submenu items */}
        {activeSubmenu.submenu?.map(subAction => {
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
      </VStack>
    );
  }

  // Group actions by variant for visual separation
  const defaultActions = actions.filter(a => !a.variant || a.variant === 'default');
  const dangerActions = actions.filter(a => a.variant === 'danger');

  const renderAction = (action: FloatingContextMenuAction) => {
    // If action has submenu
    if (action.submenu && action.submenu.length > 0) {
      // On mobile, use navigation instead of nested menu
      if (isMobile) {
        return (
          <Box
            key={action.id}
            as="button"
            onClick={() => setActiveSubmenu(action)}
            px={3}
            py={2}
            w="full"
            display="flex"
            alignItems="center"
            gap={2}
            transition="all 0.2s"
            bg="transparent"
            color={iconColor}
            cursor="pointer"
            _hover={{ bg: hoverBg }}
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
            <action.icon size={16} />
            <Box flex="1" textAlign="left">{action.label}</Box>
            <Box flexShrink={0}>
              <ChevronRight size={14} />
            </Box>
          </Box>
        );
      }

      // On desktop, use Chakra Menu with nested submenu
      return (
        <Menu key={action.id} placement={submenuPlacement} isLazy>
          <MenuButton
            as={Box}
            px={3}
            py={2}
            w="full"
            borderRadius="md"
            transition="all 0.2s"
            bg="transparent"
            color={iconColor}
            cursor="pointer"
            _hover={{ bg: hoverBg }}
            _focus={{ outline: 'none', boxShadow: 'none' }}
            _active={{ outline: 'none' }}
            sx={{
              '&:focus': { outline: 'none !important', boxShadow: 'none !important' },
              '&:focus-visible': { outline: 'none !important', boxShadow: 'none !important' },
            }}
            fontSize="14px"
            fontWeight="medium"
          >
            <Box display="flex" alignItems="center" gap={2} w="full">
              <action.icon size={16} />
              <Box flex="1" textAlign="left">{action.label}</Box>
              <Box flexShrink={0}>
                <ChevronRight size={14} />
              </Box>
            </Box>
          </MenuButton>
          <MenuList
            bg={bg}
            borderColor={borderColor}
            boxShadow="lg"
            minW="160px"
            maxW="240px"
            py={1}
            _focus={{ outline: 'none', boxShadow: 'lg' }}
            sx={{
              '&:focus': { outline: 'none !important' },
              '&:focus-visible': { outline: 'none !important' },
            }}
          >
            {action.submenu.map(subAction => {
              const iconElement = subAction.id === 'send-back' ? (
                <Box transform="rotate(180deg)">
                  <subAction.icon size={16} />
                </Box>
              ) : (
                <subAction.icon size={16} />
              );

              return (
                <MenuItem
                  key={subAction.id}
                  onClick={subAction.onClick}
                  isDisabled={subAction.isDisabled}
                  icon={iconElement}
                  color={subAction.variant === 'danger' ? dangerColor : iconColor}
                  _hover={!subAction.isDisabled ? {
                    bg: subAction.variant === 'danger' ? dangerHoverBg : hoverBg
                  } : {}}
                  _focus={{ outline: 'none', boxShadow: 'none', bg: 'transparent' }}
                  _active={{ outline: 'none', bg: 'transparent' }}
                  sx={{
                    WebkitTapHighlightColor: 'transparent',
                    '&:focus': { outline: 'none !important', boxShadow: 'none !important' },
                    '&:focus-visible': { outline: 'none !important', boxShadow: 'none !important' },
                  }}
                  fontSize="14px"
                >
                  {subAction.label}
                </MenuItem>
              );
            })}
          </MenuList>
        </Menu>
      );
    }

    // Regular action without submenu
    return (
      <ConditionalTooltip key={action.id} label={action.label} placement="right">
        <Box
          as="button"
          onClick={action.onClick}
          disabled={action.isDisabled}
          px={3}
          py={2}
          w="full"
          display="flex"
          alignItems="center"
          gap={2}
          borderRadius="md"
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
          <action.icon size={16} />
          <span>{action.label}</span>
        </Box>
      </ConditionalTooltip>
    );
  };

  return (
    <VStack
      spacing={0}
      align="stretch"
      bg={bg}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="lg"
      boxShadow="lg"
      minW="180px"
      py={1}
      tabIndex={-1}
      _focus={{ outline: 'none', boxShadow: 'lg' }}
      sx={{
        '&:focus': { outline: 'none !important' },
        '&:focus-visible': { outline: 'none !important' },
        '& *:focus': { outline: 'none !important' },
        '& *:focus-visible': { outline: 'none !important' },
      }}
    >
      {defaultActions.length > 0 && (
        <>
          {defaultActions.map(renderAction)}
          {dangerActions.length > 0 && <Divider my={1} />}
        </>
      )}
      {dangerActions.map(renderAction)}
    </VStack>
  );
};



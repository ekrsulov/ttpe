import React from 'react';
import { Box, HStack, IconButton, Divider } from '@chakra-ui/react';
import { Lock, Menu, Unlock } from 'lucide-react';
import { RenderCountBadgeWrapper } from './RenderCountBadgeWrapper';
import type { CanvasElement } from '../../types';
import { TOOL_DEFINITIONS } from '../../config/toolDefinitions';

interface TopActionBarProps {
  activeMode: string | null;
  onModeChange: (mode: string) => void;
  sidebarWidth?: number;
  isSidebarPinned?: boolean;
  isSidebarOpen?: boolean;
  onMenuClick?: () => void;
  selectedPaths?: CanvasElement[];
  hasSelection?: boolean;
  hasLockedSelection?: boolean;
  areAllSelectedLocked?: boolean;
  hasLockedElements?: boolean;
  totalElements?: number;
  onLockSelection?: () => void;
  onUnlockSelection?: () => void;
  onLockAll?: () => void;
  onUnlockAll?: () => void;
}

export const TopActionBar: React.FC<TopActionBarProps> = ({
  activeMode,
  onModeChange,
  sidebarWidth = 0,
  isSidebarPinned = false,
  isSidebarOpen = false,
  onMenuClick,
  selectedPaths = [],
  hasSelection = false,
  hasLockedSelection = false,
  areAllSelectedLocked = false,
  hasLockedElements = false,
  totalElements = 0,
  onLockSelection,
  onUnlockSelection,
  onLockAll,
  onUnlockAll,
}) => {
  const showMenuButton = !isSidebarPinned;
  const isPositionedForSidebar = sidebarWidth > 0;

  const lockSelectionDisabled = !hasSelection;
  const unlockSelectionDisabled = !hasSelection || !hasLockedSelection;
  const lockAllDisabled = totalElements === 0;
  const unlockAllDisabled = !hasLockedElements;

  const lockSelectionVariant = areAllSelectedLocked
    ? 'solid'
    : hasLockedSelection
      ? 'outline'
      : 'ghost';

  const lockSelectionColor = areAllSelectedLocked ? 'blue' : 'gray';

  return (
    <Box
      position="fixed"
      top={{ base: 4, md: 6 }}
      left={isPositionedForSidebar ? "0" : "50%"}
      right={isPositionedForSidebar ? `${sidebarWidth}px` : "auto"}
      transform={isPositionedForSidebar ? "none" : "translateX(-50%)"}
      marginLeft={isPositionedForSidebar ? "auto" : 0}
      marginRight={isPositionedForSidebar ? "auto" : 0}
      width="fit-content"
      bg="white"
      borderRadius="xl"
      boxShadow="lg"
      px={1}
      py={1}
      zIndex={999}
      sx={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
      }}
    >
      <HStack 
        spacing={{ base: 0.5, md: 1 }}
        justify="center"
      >
        {/* Tool buttons */}
        {TOOL_DEFINITIONS.map(({ mode, icon: Icon, label }) => {
          const isDisabled = (() => {
            if (mode === 'transformation' || mode === 'edit') {
              return selectedPaths.length !== 1;
            }
            if (mode === 'subpath') {
              return selectedPaths.length !== 1 || (selectedPaths[0] && selectedPaths[0].data.subPaths.length <= 1);
            }
            return false;
          })();
          return (
            <IconButton
              key={mode}
              aria-label={label}
              icon={<Icon size={14} />}
              onClick={() => onModeChange(mode)}
              size="xs"
              variant={activeMode === mode ? 'solid' : 'ghost'}
              colorScheme={activeMode === mode ? 'blue' : 'gray'}
              title={label}
              isDisabled={isDisabled}
              sx={{
                minHeight: '28px',
                minWidth: '28px',
              }}
            />
          );
        })}

        {(onLockSelection || onUnlockSelection || onLockAll || onUnlockAll) && (
          <>
            <Divider orientation="vertical" h="18px" borderColor="gray.200" />
            <HStack spacing={0.5} pl={0.5}>
              {onLockSelection && (
                <IconButton
                  aria-label="Lock selection"
                  icon={<Lock size={14} />}
                  onClick={onLockSelection}
                  size="xs"
                  variant={lockSelectionVariant}
                  colorScheme={lockSelectionColor}
                  title={areAllSelectedLocked ? 'Selection locked' : 'Lock selection'}
                  isDisabled={lockSelectionDisabled}
                  sx={{
                    minHeight: '28px',
                    minWidth: '28px',
                  }}
                />
              )}
              {onUnlockSelection && (
                <IconButton
                  aria-label="Unlock selection"
                  icon={<Unlock size={14} />}
                  onClick={onUnlockSelection}
                  size="xs"
                  variant="ghost"
                  colorScheme="gray"
                  title="Unlock selection"
                  isDisabled={unlockSelectionDisabled}
                  sx={{
                    minHeight: '28px',
                    minWidth: '28px',
                  }}
                />
              )}
              {onLockAll && (
                <IconButton
                  aria-label="Lock all elements"
                  icon={<Lock size={14} />}
                  onClick={onLockAll}
                  size="xs"
                  variant="ghost"
                  colorScheme="gray"
                  title="Lock all elements"
                  isDisabled={lockAllDisabled}
                  sx={{
                    minHeight: '28px',
                    minWidth: '28px',
                  }}
                />
              )}
              {onUnlockAll && (
                <IconButton
                  aria-label="Unlock all elements"
                  icon={<Unlock size={14} />}
                  onClick={onUnlockAll}
                  size="xs"
                  variant="ghost"
                  colorScheme="gray"
                  title="Unlock all elements"
                  isDisabled={unlockAllDisabled}
                  sx={{
                    minHeight: '28px',
                    minWidth: '28px',
                  }}
                />
              )}
            </HStack>
          </>
        )}

        {/* Hamburger menu button - al final */}
        {showMenuButton && (
          <IconButton
            aria-label="Toggle sidebar"
            icon={<Menu size={14} />}
            onClick={onMenuClick}
            size="xs"
            variant={isSidebarOpen ? 'solid' : 'ghost'}
            colorScheme={isSidebarOpen ? 'blue' : 'gray'}
            title="Toggle Menu"
            sx={{
              minHeight: '28px',
              minWidth: '28px',
            }}
          />
        )}
      </HStack>
      <RenderCountBadgeWrapper componentName="TopActionBar" position="top-right" />
    </Box>
  );
};

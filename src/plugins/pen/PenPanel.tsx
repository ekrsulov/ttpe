import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { VStack, HStack, FormControl, FormLabel, useColorModeValue, Badge } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelStyledButton } from '../../ui/PanelStyledButton';

/**
 * Get badge color based on pen mode
 */
const getModeBadgeColor = (mode: string): string => {
    switch (mode) {
        case 'idle': return 'gray';
        case 'drawing': return 'green';
        case 'editing': return 'blue';
        case 'continuing': return 'orange';
        default: return 'gray';
    }
};

export const PenPanel: React.FC<{ hideTitle?: boolean }> = ({ hideTitle = false }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const penState = useCanvasStore((state) => (state as any).pen);
    const updatePenState = useCanvasStore((state) => state.updatePenState);

    const labelColor = useColorModeValue('gray.600', 'gray.300');

    if (!penState || !updatePenState) {
        return null;
    }

    const {
        autoAddDelete,
        guidelinesEnabled,
        mode,
    } = penState;

    // Check if path can be closed (same logic as cursor detection)
    const canClosePath = penState.currentPath && (
        penState.currentPath.anchors.length >= 3 ||
        (penState.currentPath.anchors.length === 2 && 
         penState.currentPath.anchors.some((a: { inHandle?: unknown; outHandle?: unknown }) => a.inHandle || a.outHandle))
    );

    // Mode badge for header
    const modeBadge = (
        <Badge 
            colorScheme={getModeBadgeColor(mode)} 
            fontSize="9px" 
            textTransform="capitalize"
            variant="subtle"
        >
            {mode}
        </Badge>
    );

    return (
        <Panel title="Pen Tool" hideHeader={hideTitle} headerActions={modeBadge}>
            <VStack spacing={2} align="stretch">
                {/* Tool Preferences */}
                <VStack spacing={1} align="stretch">
                    <FormControl display="flex" alignItems="center" minH="24px">
                        <FormLabel htmlFor="auto-add-delete" mb="0" fontSize="11px" flex="1" color={labelColor}>
                            Auto Add/Delete
                        </FormLabel>
                        <PanelSwitch
                            id="auto-add-delete"
                            isChecked={autoAddDelete}
                            onChange={(e) => updatePenState({ autoAddDelete: e.target.checked })}
                        />
                    </FormControl>
                    <FormControl display="flex" alignItems="center" minH="24px">
                        <FormLabel htmlFor="guidelines-enabled" mb="0" fontSize="11px" flex="1" color={labelColor}>
                            Snap to Guidelines
                        </FormLabel>
                        <PanelSwitch
                            id="guidelines-enabled"
                            isChecked={guidelinesEnabled}
                            onChange={(e) => updatePenState({ guidelinesEnabled: e.target.checked })}
                        />
                    </FormControl>
                </VStack>

                {/* Actions */}
                {penState.mode === 'drawing' && (
                    <HStack spacing={2}>
                        <PanelStyledButton
                            size="xs"
                            flex={1}
                            isDisabled={!canClosePath}
                            onClick={() => {
                                import('./actions').then(({ closePath }) => {
                                    closePath(useCanvasStore.getState);
                                });
                            }}
                        >
                            Close
                        </PanelStyledButton>
                        <PanelStyledButton
                            size="xs"
                            flex={1}
                            isDisabled={!penState.currentPath || penState.currentPath.anchors.length < 2}
                            onClick={() => {
                                import('./actions').then(({ finalizePath }) => {
                                    finalizePath(useCanvasStore.getState);
                                });
                            }}
                        >
                            Finish
                        </PanelStyledButton>
                        <PanelStyledButton
                            size="xs"
                            flex={1}
                            onClick={() => {
                                import('./actions').then(({ cancelPath }) => {
                                    cancelPath(useCanvasStore.getState);
                                });
                            }}
                        >
                            Cancel
                        </PanelStyledButton>
                    </HStack>
                )}
            </VStack>
        </Panel>
    );
};

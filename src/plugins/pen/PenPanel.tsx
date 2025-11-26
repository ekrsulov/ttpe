import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { VStack, HStack, FormControl, FormLabel, useColorModeValue } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelStyledButton } from '../../ui/PanelStyledButton';

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
    } = penState;

    const canClosePath = penState.currentPath && penState.currentPath.anchors.length >= 3;

    return (
        <Panel title="Pen Tool" hideHeader={hideTitle}>
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

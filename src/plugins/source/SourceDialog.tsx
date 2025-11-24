import React, { useEffect, useState } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Textarea,
    useToast,
    useColorModeValue,
} from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { serializePathsForExport } from '../../utils/exportUtils';
import type { SourcePluginSlice } from './sourcePluginSlice';

export const SourceDialog: React.FC = () => {
    const toast = useToast();
    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    // Store selectors
    const isDialogOpen = useCanvasStore(
        (state) => (state as unknown as SourcePluginSlice).source.isDialogOpen
    );
    const setSourceDialogOpen = useCanvasStore(
        (state) => (state as unknown as SourcePluginSlice).setSourceDialogOpen
    );
    const setSourceSvgContent = useCanvasStore(
        (state) => (state as unknown as SourcePluginSlice).setSourceSvgContent
    );
    const setSourceHasUnsavedChanges = useCanvasStore(
        (state) => (state as unknown as SourcePluginSlice).setSourceHasUnsavedChanges
    );
    const hasUnsavedChanges = useCanvasStore(
        (state) => (state as unknown as SourcePluginSlice).source.hasUnsavedChanges
    );
    const importSvgToCanvas = useCanvasStore(
        (state) => (state as unknown as SourcePluginSlice).importSvgToCanvas
    );

    const elements = useCanvasStore((state) => state.elements);
    const selectedIds = useCanvasStore((state) => state.selectedIds);

    // Local state
    const [localSvgContent, setLocalSvgContent] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    // Export on open
    useEffect(() => {
        if (isDialogOpen) {
            const result = serializePathsForExport(elements, selectedIds, {
                selectedOnly: false,
                padding: 0, // Requirement says padding 0
            });

            const content = result ? result.svgContent : '';
            setLocalSvgContent(content);
            setSourceSvgContent(content);
            setSourceHasUnsavedChanges(false);
        }
    }, [isDialogOpen, elements, selectedIds, setSourceSvgContent, setSourceHasUnsavedChanges]);

    const handleClose = () => {
        setSourceDialogOpen(false);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setLocalSvgContent(newContent);
        setSourceSvgContent(newContent);
        setSourceHasUnsavedChanges(true);
    };

    const handleClear = () => {
        setLocalSvgContent('');
        setSourceSvgContent('');
        setSourceHasUnsavedChanges(true);
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(localSvgContent);
            toast({
                title: 'SVG copied to clipboard',
                status: 'success',
                duration: 2000,
                isClosable: true,
                size: 'sm',
            });
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            toast({
                title: 'Failed to copy',
                status: 'error',
                duration: 2000,
                isClosable: true,
                size: 'sm',
            });
        }
    };

    const handleUpdateCanvas = async () => {
        if (!localSvgContent.trim()) {
            return;
        }

        setIsImporting(true);
        try {
            const blob = new Blob([localSvgContent], { type: 'image/svg+xml' });
            const file = new File([blob], 'source.svg', { type: 'image/svg+xml' });

            await importSvgToCanvas(file);

            toast({
                title: 'Canvas updated',
                status: 'success',
                duration: 2000,
                isClosable: true,
            });
            // Dialog is closed by the slice action on success
        } catch (_error) {
            toast({
                title: 'Failed to import SVG',
                description: 'Please check that the SVG is valid.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Modal
            isOpen={isDialogOpen}
            onClose={handleClose}
            size="xl"
            scrollBehavior="inside"
            closeOnOverlayClick={false}
        >
            <ModalOverlay />
            <ModalContent
                maxW={{ base: '95vw', md: '800px' }}
                maxH="90vh"
                bg={bgColor}
            >
                <ModalHeader borderBottom="1px" borderColor={borderColor}>
                    SVG Source
                </ModalHeader>
                <ModalBody py={4}>
                    <Textarea
                        value={localSvgContent}
                        onChange={handleTextChange}
                        fontFamily="monospace"
                        fontSize="sm"
                        rows={15}
                        whiteSpace="pre"
                        overflowX="auto"
                        resize="vertical"
                        autoFocus
                    />
                </ModalBody>
                <ModalFooter borderTop="1px" borderColor={borderColor} gap={2}>
                    <Button onClick={handleClear} variant="ghost" mr="auto">
                        Clear
                    </Button>
                    <Button onClick={handleCopy} variant="outline">
                        Copy
                    </Button>
                    <Button onClick={handleClose} variant="ghost">
                        Close
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={handleUpdateCanvas}
                        isDisabled={!hasUnsavedChanges}
                        isLoading={isImporting}
                        loadingText="Importing"
                    >
                        Update Canvas
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

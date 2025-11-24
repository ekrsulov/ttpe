import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HStack, VStack, Input, FormControl, FormLabel, Text, Box, Collapse, useDisclosure, IconButton as ChakraIconButton } from '@chakra-ui/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ConditionalTooltip from '../../ui/ConditionalTooltip';
import { useCanvasStore } from '../../store/canvasStore';

import { logger } from '../../utils';
import { Panel } from '../../ui/Panel';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { NumberInput } from '../../ui/NumberInput';
import { SliderControl } from '../../ui/SliderControl';
import { useSvgImport } from '../../hooks/useSvgImport';



export const FilePanel: React.FC = () => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const saveDocument = useCanvasStore(state => state.saveDocument);
  const loadDocument = useCanvasStore(state => state.loadDocument);
  const saveAsSvg = useCanvasStore(state => state.saveAsSvg);
  const settings = useCanvasStore(state => state.settings);
  const updateSettings = useCanvasStore(state => state.updateSettings);

  const {
    importResize: resizeImport,
    importResizeWidth: resizeWidth,
    importResizeHeight: resizeHeight,
    importApplyUnion: applyUnion,
    importAddFrame: addFrame
  } = settings;

  const setResizeImport = (value: boolean) => updateSettings({ importResize: value });
  const setResizeWidth = (value: number) => updateSettings({ importResizeWidth: value });
  const setResizeHeight = (value: number) => updateSettings({ importResizeHeight: value });
  const setApplyUnion = (value: boolean) => updateSettings({ importApplyUnion: value });
  const setAddFrame = (value: boolean) => updateSettings({ importAddFrame: value });

  const [pngSelectedOnly, setPngSelectedOnly] = useState(true);
  const [svgSelectedOnly, setSvgSelectedOnly] = useState(false);
  const svgInputRef = useRef<HTMLInputElement>(null);


  // Document name state
  const documentName = useCanvasStore(state => state.documentName);
  const setDocumentName = useCanvasStore(state => state.setDocumentName);
  const [localDocumentName, setLocalDocumentName] = useState(documentName);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Collapsible Advanced section state
  const { isOpen: isAdvancedOpen, onToggle: onAdvancedToggle } = useDisclosure();

  // Sync local state with store
  useEffect(() => {
    setLocalDocumentName(documentName);
  }, [documentName]);

  // Handle document name change with throttling
  const handleDocumentNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setLocalDocumentName(newName);

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set saving indicator immediately
    setIsSaving(true);

    // Throttle the save operation
    saveTimeoutRef.current = setTimeout(() => {
      setDocumentName(newName);
      setIsSaving(false);
    }, 500); // 500ms delay
  }, [setDocumentName]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleSave = () => {
    saveDocument();
  };

  const handleSaveAsSvg = () => {
    saveAsSvg(svgSelectedOnly);
  };

  const handleSaveAsPng = () => {
    // We need to get the SVG element from the Canvas component
    // For now, we'll dispatch a custom event that the Canvas can listen to
    const event = new CustomEvent('saveAsPng', {
      detail: { selectedOnly: pngSelectedOnly }
    });
    window.dispatchEvent(event);
  };

  const handleLoad = async () => {
    try {
      await loadDocument(true); // Always append for now
    } catch (error) {
      logger.error('Failed to load document', error);
      alert('Failed to load document. Please check the file format.');
    }
  };

  const handleImportSVG = () => {
    svgInputRef.current?.click();
  };

  const { importSvgFiles } = useSvgImport();

  const handleSVGFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    await importSvgFiles(files, {
      appendMode: true, // Always append in FilePanel for now, or we could add a toggle
      resizeImport,
      resizeWidth,
      resizeHeight,
      applyUnion,
      addFrame
    });

    // Reset file input
    if (svgInputRef.current) {
      svgInputRef.current.value = '';
    }
  };

  return (
    <Panel>
      <VStack spacing={2} align="stretch" pt={2}>
        {/* Document Name */}
        <FormControl position="relative">
          <FormLabel fontSize="12px" fontWeight="medium" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
            Document Name
          </FormLabel>
          <Input
            value={localDocumentName}
            onChange={handleDocumentNameChange}
            placeholder="Enter document name"
            size="sm"
            h="20px"
            borderRadius="0"
            _focus={{
              borderColor: 'gray.600',
              boxShadow: '0 0 0 1px var(--chakra-colors-gray-600)'
            }}
          />
          {isSaving && (
            <Text
              position="absolute"
              right={2}
              top="28px"
              fontSize="12px"
              color="gray.500"
              bg="white"
              _dark={{
                color: 'gray.400',
                bg: 'gray.700'
              }}
              px={1}
              pointerEvents="none"
            >
              Saving...
            </Text>
          )}
        </FormControl>

        <HStack spacing={1}>
          <PanelStyledButton
            onClick={handleSave}
            flex={1}
            size="sm"
          >
            Save
          </PanelStyledButton>

          <PanelStyledButton
            onClick={handleSaveAsSvg}
            flex={1}
            size="sm"
          >
            Svg
          </PanelStyledButton>

          <PanelStyledButton
            onClick={handleSaveAsPng}
            flex={1}
            size="sm"
          >
            Png
          </PanelStyledButton>
        </HStack>

        <HStack spacing={1}>
          <PanelStyledButton
            onClick={handleLoad}
            flex={1}
            size="sm"
          >
            Load
          </PanelStyledButton>

          <PanelStyledButton
            onClick={handleImportSVG}
            flex={1}
            size="sm"
          >
            Import SVG
          </PanelStyledButton>
        </HStack>

        {/* Hidden file input for SVG import */}
        <input
          ref={svgInputRef}
          type="file"
          accept=".svg,image/svg+xml"
          multiple
          style={{ display: 'none' }}
          onChange={handleSVGFileSelected}
        />

        {/* Export Padding Slider */}
        <Box mt={2}>
          <SliderControl
            label="Export Padding:"
            value={settings.exportPadding}
            min={0}
            max={100}
            step={5}
            onChange={(value) => updateSettings({ exportPadding: value })}
            title="Padding in pixels around exported SVG/PNG"
          />
        </Box>

        {/* Advanced Section - Collapsible */}
        <Box mt={1}>
          <HStack
            justify="space-between"
            py={1}
          >
            <Text
              color="gray.600"
              _dark={{ color: 'gray.400' }}
              cursor="pointer"
              onClick={onAdvancedToggle}
              _hover={{ color: "gray.800", _dark: { color: 'gray.200' } }}
            >
              Advanced
            </Text>
            <ConditionalTooltip label={isAdvancedOpen ? "Collapse Advanced" : "Expand Advanced"}>
              <ChakraIconButton
                aria-label={isAdvancedOpen ? "Collapse Advanced" : "Expand Advanced"}
                icon={isAdvancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                onClick={onAdvancedToggle}
                variant="ghost"
                size="xs"
                h="20px"
                minW="20px"
                borderRadius="full"
                flexShrink={0}
                bg="transparent"
              />
            </ConditionalTooltip>
          </HStack>

          <Collapse in={isAdvancedOpen} animateOpacity>
            <VStack spacing={2} align="stretch" mt={2}>

              <PanelToggle
                isChecked={true}
                onChange={() => { }}
                isDisabled={true}
              >
                Append to existing
              </PanelToggle>
              <PanelToggle
                isChecked={pngSelectedOnly}
                onChange={(e) => setPngSelectedOnly(e.target.checked)}
              >
                Save selected elements only (PNG)
              </PanelToggle>

              <PanelToggle
                isChecked={svgSelectedOnly}
                onChange={(e) => setSvgSelectedOnly(e.target.checked)}
              >
                Save selected elements only (SVG)
              </PanelToggle>

              <PanelToggle
                isChecked={addFrame}
                onChange={(e) => setAddFrame(e.target.checked)}
              >
                Add frame to imported SVG
              </PanelToggle>

              <PanelToggle
                isChecked={applyUnion}
                onChange={(e) => setApplyUnion(e.target.checked)}
              >
                Apply union to imported paths
              </PanelToggle>

              <PanelToggle
                isChecked={resizeImport}
                onChange={(e) => setResizeImport(e.target.checked)}
              >
                Resize imported SVG
              </PanelToggle>

              {resizeImport && (
                <VStack spacing={1} align="stretch">
                  <NumberInput
                    label="W"
                    value={resizeWidth}
                    onChange={setResizeWidth}
                    min={1}
                    max={1000}
                    inputWidth="50px"
                  />
                  <NumberInput
                    label="H"
                    value={resizeHeight}
                    onChange={setResizeHeight}
                    min={1}
                    max={1000}
                    inputWidth="50px"
                  />
                </VStack>
              )}

            </VStack>
          </Collapse>
        </Box>

        {/* Reset Application */}
        <Box pt={3}>
          <PanelStyledButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              useCanvasStore.persist.clearStorage();
              window.location.reload();
            }}
            size="sm"
            width="full"
            title="Reset Application - This will clear all data and reload the page"
          >
            Reset App
          </PanelStyledButton>
        </Box>
      </VStack>
    </Panel>
  );
};
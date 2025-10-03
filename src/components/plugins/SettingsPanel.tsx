import React, { useState, useEffect } from 'react';
import {
  VStack,
  FormControl,
  FormLabel,
  Input,
  Checkbox as ChakraCheckbox,
  Button,
  Select,
  Text,
  Box
} from '@chakra-ui/react';
import { Settings, RotateCcw } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { logger, LogLevel } from '../../utils';
import { Panel } from '../ui/Panel';
import { SliderControl } from '../ui/SliderControl';

export const SettingsPanel: React.FC = () => {
  const { documentName, settings, updateSettings } = useCanvasStore();
  const [localDocumentName, setLocalDocumentName] = useState(documentName);
  const [logLevel, setLogLevel] = useState<LogLevel>(LogLevel.WARN); // Default log level
  const [isSaving, setIsSaving] = useState(false);
  const [showCallerInfo, setShowCallerInfo] = useState(false);
  const [keyboardPrecision, setKeyboardPrecision] = useState(settings.keyboardMovementPrecision);

  // Sync local state with store
  useEffect(() => {
    setLocalDocumentName(documentName);
  }, [documentName]);

  // Sync keyboard precision with settings
  useEffect(() => {
    setKeyboardPrecision(settings.keyboardMovementPrecision);
  }, [settings.keyboardMovementPrecision]);

  // Initialize log level and caller info from current logger config
  useEffect(() => {
    const currentLevel = logger.getLogLevel();
    setLogLevel(currentLevel);
    
    const currentShowCallerInfo = logger.getShowCallerInfo();
    setShowCallerInfo(currentShowCallerInfo);
  }, []);



  const handleLogLevelChange = (newLevel: LogLevel) => {
    setLogLevel(newLevel);
    // Apply the log level change immediately (online)
    logger.setConfig({ level: newLevel });
    logger.info('Log level changed to', getLogLevelName(newLevel));
  };

  const handleCallerInfoToggle = (enabled: boolean) => {
    setShowCallerInfo(enabled);
    // Apply the caller info setting immediately (online)
    logger.setShowCallerInfo(enabled);
    logger.info('Caller info display', enabled ? 'enabled' : 'disabled');
  };

  const handleKeyboardPrecisionChange = (value: number) => {
    // Validate the input: must be between 0 and 10
    if (value >= 0 && value <= 10) {
      setKeyboardPrecision(value);
      updateSettings({ keyboardMovementPrecision: value });
      logger.debug('Keyboard movement precision changed to', value);
    }
  };

  const getLogLevelName = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.DEBUG: return 'DEBUG';
      case LogLevel.INFO: return 'INFO';
      case LogLevel.WARN: return 'WARN';
      case LogLevel.ERROR: return 'ERROR';
      default: return 'WARN';
    }
  };

  const handleDocumentNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setLocalDocumentName(newName);
    setIsSaving(true);
    
    // Debounced save
    setTimeout(() => {
      useCanvasStore.getState().setDocumentName(newName);
      setIsSaving(false);
      logger.debug('Document name auto-saved', { documentName: newName });
    }, 500);
  };

  return (
    <Panel icon={<Settings size={16} />} title="Settings">
      <VStack spacing={3} align="stretch">
        {/* Document Name */}
        <FormControl position="relative">
          <FormLabel fontSize="12px" fontWeight="medium" color="gray.600" mb={1}>
            Document Name
          </FormLabel>
          <Input
            value={localDocumentName}
            onChange={handleDocumentNameChange}
            placeholder="Enter document name"
            size="sm"
          />
          {isSaving && (
            <Text
              position="absolute"
              right={2}
              top="28px"
              fontSize="12px"
              color="gray.500"
              bg="white"
              px={1}
              pointerEvents="none"
            >
              Saving...
            </Text>
          )}
        </FormControl>

        {/* Log Level Selector */}
        <FormControl>
          <FormLabel fontSize="12px" fontWeight="medium" color="gray.600" mb={1}>
            Log Level
          </FormLabel>
          <Select
            value={logLevel}
            onChange={(e) => handleLogLevelChange(parseInt(e.target.value) as LogLevel)}
            size="sm"
          >
            <option value={LogLevel.DEBUG}>DEBUG</option>
            <option value={LogLevel.INFO}>INFO</option>
            <option value={LogLevel.WARN}>WARN</option>
            <option value={LogLevel.ERROR}>ERROR</option>
          </Select>
        </FormControl>

        {/* Show Caller Info Checkbox */}
        <ChakraCheckbox
          isChecked={showCallerInfo}
          onChange={(e) => handleCallerInfoToggle(e.target.checked)}
          size="sm"
        >
          Show caller info in logs
        </ChakraCheckbox>

        {/* Keyboard Movement Precision */}
        <SliderControl
          label="Precision:"
          value={keyboardPrecision}
          min={0}
          max={4}
          step={1}
          onChange={handleKeyboardPrecisionChange}
          title="Number of decimal places for keyboard movement (0 = integers only)"
        />

        {/* Reset Application */}
        <Box pt={3}>
          <Button
            onClick={() => {
              localStorage.removeItem('canvas-app-state');
              window.location.reload();
            }}
            colorScheme="red"
            leftIcon={<RotateCcw size={16} />}
            size="sm"
            width="full"
            variant="ghost"
            bg="transparent"
            title="Reset Application - This will clear all data and reload the page"
          >
            Reset App
          </Button>
        </Box>
      </VStack>
    </Panel>
  );
};
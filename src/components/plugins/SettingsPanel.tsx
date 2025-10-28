import React, { useState, useEffect } from 'react';
import {
  VStack,
  FormControl,
  FormLabel,
  Select,
  useBreakpointValue
} from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { logger, LogLevel } from '../../utils';
import { Panel } from '../ui/Panel';
import { PanelToggle } from '../ui/PanelToggle';
import { SliderControl } from '../ui/SliderControl';

export const SettingsPanel: React.FC = () => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const settings = useCanvasStore(state => state.settings);
  const updateSettings = useCanvasStore(state => state.updateSettings);
  
  // Detect if we're on mobile (base breakpoint)
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;
  
  const [logLevel, setLogLevel] = useState<LogLevel>(LogLevel.WARN); // Default log level
  const [showCallerInfo, setShowCallerInfo] = useState(false);
  const [keyboardPrecision, setKeyboardPrecision] = useState(settings.keyboardMovementPrecision);

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

  return (
    <Panel>
      <VStack spacing={3} align="stretch" pt={2}>
        {/* Log Level Selector - Only in development */}
        {import.meta.env.DEV && (
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
        )}

        {/* Show Caller Info Checkbox - Only in development */}
        {import.meta.env.DEV && (
          <PanelToggle
            isChecked={showCallerInfo}
            onChange={(e) => handleCallerInfoToggle(e.target.checked)}
          >
            Show caller info in logs
          </PanelToggle>
        )}

        {/* Show Render Count Badges */}
        {import.meta.env.DEV && (
          <PanelToggle
            isChecked={settings.showRenderCountBadges}
            onChange={(e) => updateSettings({ showRenderCountBadges: e.target.checked })}
          >
            Show render count badges (debug)
          </PanelToggle>
        )}

        {/* Show Minimap */}
        {!isMobile && (
          <PanelToggle
            isChecked={settings.showMinimap}
            onChange={(e) => updateSettings({ showMinimap: e.target.checked })}
          >
            Show minimap
          </PanelToggle>
        )}

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

        {/* Show Tooltips - Only on desktop */}
        {!isMobile && (
          <PanelToggle
            isChecked={settings.showTooltips}
            onChange={(e) => updateSettings({ showTooltips: e.target.checked })}
          >
            Show tooltips
          </PanelToggle>
        )}
      </VStack>
    </Panel>
  );
};
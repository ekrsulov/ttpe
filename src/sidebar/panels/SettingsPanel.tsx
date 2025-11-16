import React, { useState, useEffect } from 'react';
import {
  VStack,
  FormControl,
  FormLabel,
  useBreakpointValue,
  useColorMode
} from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { logger, LogLevel } from '../../utils';
import { Panel } from '../../ui/Panel';
// No icon button here - we show text label instead
import { PanelToggle } from '../../ui/PanelToggle';
import { SliderControl } from '../../ui/SliderControl';
import { JoinedButtonGroup } from '../../ui/JoinedButtonGroup';
import { CustomSelect } from '../../ui/CustomSelect';

export const SettingsPanel: React.FC = () => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const settings = useCanvasStore(state => state.settings);
  const updateSettings = useCanvasStore(state => state.updateSettings);
  const { setColorMode } = useColorMode();
  
  // Detect if we're on mobile (base breakpoint)
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;
  
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const stored = localStorage.getItem('chakra-ui-color-mode');
    return (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'light';
  });
  const [logLevel, setLogLevel] = useState<LogLevel>(LogLevel.WARN); // Default log level
  const [showCallerInfo, setShowCallerInfo] = useState(false);
  const [keyboardPrecision, setKeyboardPrecision] = useState(settings.keyboardMovementPrecision);
  interface DocumentWithFullscreen extends Document {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    msFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => void;
    mozCancelFullScreen?: () => void;
    msExitFullscreen?: () => void;
  }

  interface HTMLElementWithFullscreen extends HTMLElement {
    webkitRequestFullscreen?: () => void;
    mozRequestFullScreen?: () => void;
    msRequestFullscreen?: () => void;
  }

  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document === 'undefined') { return false; }
    const d = document as DocumentWithFullscreen;
    return !!(d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement);
  });

  // Sync selected theme with Chakra color mode
  useEffect(() => {
    setColorMode(selectedTheme);
    localStorage.setItem('chakra-ui-color-mode', selectedTheme);
  }, [selectedTheme, setColorMode]);

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

  const handleFullscreenChange = React.useCallback(() => {
    if (typeof document === 'undefined') { return; }
    const d = document as DocumentWithFullscreen;
    const fs = !!(d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement);
    setIsFullscreen(fs);
  }, []);

  useEffect(() => {
    // Add vendor-prefixed event listeners for older browsers
    if (typeof document === 'undefined') return;
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange as EventListener);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange as EventListener);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange as EventListener);
    };
  }, [handleFullscreenChange]);

  const requestFullscreen = async () => {
    try {
      const el = document.documentElement as HTMLElementWithFullscreen;

      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      }
    } catch (e) {
      // Not critical - log the error in dev
      logger.error('Failed to enter fullscreen', e);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else {
        const d = document as DocumentWithFullscreen;
        if (d.webkitExitFullscreen) {
          d.webkitExitFullscreen();
        } else if (d.mozCancelFullScreen) {
          d.mozCancelFullScreen();
        } else if (d.msExitFullscreen) {
          d.msExitFullscreen();
        }
      }
    } catch (e) {
      logger.error('Failed to exit fullscreen', e);
    }
  };

  const logLevelOptions = [
    { value: LogLevel.DEBUG.toString(), label: 'DEBUG' },
    { value: LogLevel.INFO.toString(), label: 'INFO' },
    { value: LogLevel.WARN.toString(), label: 'WARN' },
    { value: LogLevel.ERROR.toString(), label: 'ERROR' },
  ];

  return (
    <Panel>
      <VStack spacing={3} align="stretch" pt={2}>
        <FormControl>
          <FormLabel fontSize="12px" fontWeight="medium" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
            Theme
          </FormLabel>
          <JoinedButtonGroup
            key={selectedTheme}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' },
            ]}
            value={selectedTheme}
            onChange={setSelectedTheme}
          />
        </FormControl>

        {/* Log Level Selector - Only in development */}
        {import.meta.env.DEV && (
          <FormControl>
            <FormLabel fontSize="12px" fontWeight="medium" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
              Log Level
            </FormLabel>
            <CustomSelect
              value={logLevel.toString()}
              onChange={(value) => handleLogLevelChange(parseInt(value) as LogLevel)}
              options={logLevelOptions}
              size="sm"
            />
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

        {/* Scale Stroke With Zoom */}
        <PanelToggle
          isChecked={settings.scaleStrokeWithZoom}
          onChange={(e) => updateSettings({ scaleStrokeWithZoom: e.target.checked })}
        >
          Scale stroke with zoom
        </PanelToggle>

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

        {/* Fullscreen toggle */}
        <PanelToggle
          isChecked={isFullscreen}
          onChange={(e) => {
            const checked = e.target.checked;
            if (checked) {
              requestFullscreen();
            } else {
              exitFullscreen();
            }
          }}
        >
          Full Screen
        </PanelToggle>
      </VStack>
    </Panel>
  );
};
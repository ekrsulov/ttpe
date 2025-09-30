import React, { useState, useEffect } from 'react';
import { Settings, ChevronDown } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { logger, LogLevel } from '../../utils';
import { PanelWithHeader } from '../ui/PanelComponents';
import { TextInput, Checkbox } from '../ui/FormComponents';

export const SettingsPanel: React.FC = () => {
  const { documentName, setDocumentName, settings, updateSettings } = useCanvasStore();
  const [localDocumentName, setLocalDocumentName] = useState(documentName);
  const [logLevel, setLogLevel] = useState<LogLevel>(LogLevel.WARN); // Default log level
  const [showLogLevelDropdown, setShowLogLevelDropdown] = useState(false);
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

  // Auto-save document name when it changes
  useEffect(() => {
    if (localDocumentName !== documentName) {
      setIsSaving(true);
      const timeoutId = setTimeout(() => {
        setDocumentName(localDocumentName);
        setIsSaving(false);
        logger.debug('Document name auto-saved', { documentName: localDocumentName });
      }, 500); // Debounce for 500ms

      return () => {
        clearTimeout(timeoutId);
        setIsSaving(false);
      };
    }
  }, [localDocumentName, documentName, setDocumentName]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showLogLevelDropdown && !(event.target as Element)?.closest('[data-log-level-selector]')) {
        setShowLogLevelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLogLevelDropdown]);



  const handleLogLevelChange = (newLevel: LogLevel) => {
    setLogLevel(newLevel);
    // Apply the log level change immediately (online)
    logger.setConfig({ level: newLevel });
    setShowLogLevelDropdown(false);
    logger.info('Log level changed to', getLogLevelName(newLevel));
  };

  const handleCallerInfoToggle = (enabled: boolean) => {
    setShowCallerInfo(enabled);
    // Apply the caller info setting immediately (online)
    logger.setShowCallerInfo(enabled);
    logger.info('Caller info display', enabled ? 'enabled' : 'disabled');
  };

  const handleKeyboardPrecisionChange = (value: string) => {
    const numValue = parseInt(value, 10);
    // Validate the input: must be between 0 and 10
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 10) {
      setKeyboardPrecision(numValue);
      updateSettings({ keyboardMovementPrecision: numValue });
      logger.debug('Keyboard movement precision changed to', numValue);
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
    <PanelWithHeader icon={<Settings size={16} />} title="Settings">
      <div style={{ display: 'grid', gap: '6px' }}>
        <div style={{ position: 'relative' }}>
          <TextInput
            label="Document Name"
            value={localDocumentName}
            onChange={setLocalDocumentName}
            placeholder="Enter document name"
          />
          {isSaving && (
            <div style={{
              position: 'absolute',
              right: '8px',
              top: '28px',
              fontSize: '10px',
              color: '#666',
              backgroundColor: '#fff',
              padding: '2px 4px',
              borderRadius: '2px',
              pointerEvents: 'none'
            }}>
              Saving...
            </div>
          )}
        </div>

        {/* Log Level Selector */}
        <div style={{ position: 'relative' }} data-log-level-selector>
          <label style={{
            fontSize: '11px',
            fontWeight: '500',
            color: '#666',
            letterSpacing: '0.5px',
            display: 'block',
            marginBottom: '4px'
          }}>
            Log Level
          </label>
          <div
            onClick={() => setShowLogLevelDropdown(!showLogLevelDropdown)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontSize: '12px',
              color: '#333',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            <span>{getLogLevelName(logLevel)}</span>
            <ChevronDown 
              size={14} 
              style={{ 
                transform: showLogLevelDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }} 
            />
          </div>
          
          {showLogLevelDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: '3px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              zIndex: 1000,
              marginTop: '1px'
            }}>
              {[LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR].map(level => (
                <div
                  key={level}
                  onClick={() => handleLogLevelChange(level)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    backgroundColor: logLevel === level ? '#e3f2fd' : 'transparent',
                    borderBottom: '1px solid #f0f0f0'
                  }}
                  onMouseEnter={(e) => {
                    if (logLevel !== level) {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = logLevel === level ? '#e3f2fd' : 'transparent';
                  }}
                >
                  {getLogLevelName(level)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Show Caller Info Checkbox */}
        <Checkbox
          id="show-caller-info"
          checked={showCallerInfo}
          onChange={handleCallerInfoToggle}
          label="Show caller info in logs"
        />

        {/* Keyboard Movement Precision */}
        <div>
          <label style={{
            fontSize: '11px',
            fontWeight: '500',
            color: '#666',
            letterSpacing: '0.5px',
            display: 'block',
            marginBottom: '4px'
          }}>
            Keyboard Movement Precision
          </label>
          <input
            type="number"
            min="0"
            max="10"
            step="1"
            value={keyboardPrecision}
            onChange={(e) => handleKeyboardPrecisionChange(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontSize: '12px',
              color: '#333',
              backgroundColor: '#fff'
            }}
            title="Number of decimal places for keyboard movement (0 = integers only)"
          />
          <div style={{
            fontSize: '10px',
            color: '#888',
            marginTop: '2px'
          }}>
            Decimal places when moving with arrow keys (0-10)
          </div>
        </div>

      </div>
    </PanelWithHeader>
  );
};
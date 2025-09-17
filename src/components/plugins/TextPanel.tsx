import React, { useState, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Type, Palette, Bold, Italic, Eye, Wand2 } from 'lucide-react';
import { getAvailableFonts } from '../../utils';
import { FontSelector } from '../FontSelector';

export const TextPanel: React.FC = () => {
  const { plugins, updatePluginState, getSelectedTextsCount, updateSelectedTexts, convertTextToPath } = useCanvasStore();
  const selectedTextsCount = getSelectedTextsCount();

  // Font detection state
  const [availableFonts, setAvailableFonts] = useState<string[]>([]);
  const [isScanningFonts, setIsScanningFonts] = useState(true);

  // Load available fonts on component mount
  useEffect(() => {
    const loadFonts = async () => {
      setIsScanningFonts(true);
      try {
        const fonts = getAvailableFonts();
        setAvailableFonts(fonts);
      } catch (error) {
        console.error('Error detecting fonts:', error);
        // Fallback to basic fonts if detection fails
        setAvailableFonts(['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia']);
      } finally {
        setIsScanningFonts(false);
      }
    };

    loadFonts();
  }, []);

  const handleFontSizeChange = (value: number) => {
    if (selectedTextsCount > 0) {
      updateSelectedTexts({ fontSize: value });
    } else {
      updatePluginState('text', { fontSize: value });
    }
  };

  const handleFontFamilyChange = (value: string) => {
    if (selectedTextsCount > 0) {
      updateSelectedTexts({ fontFamily: value });
    } else {
      updatePluginState('text', { fontFamily: value });
    }
  };

  const handleTextChange = (value: string) => {
    if (selectedTextsCount === 1) {
      updateSelectedTexts({ text: value });
    } else {
      updatePluginState('text', { text: value });
    }
  };

  const handleColorChange = (value: string) => {
    if (selectedTextsCount > 0) {
      updateSelectedTexts({ color: value });
    } else {
      updatePluginState('text', { color: value });
    }
  };

  const handleFontWeightChange = (value: 'normal' | 'bold') => {
    if (selectedTextsCount > 0) {
      updateSelectedTexts({ fontWeight: value });
    } else {
      updatePluginState('text', { fontWeight: value });
    }
  };

  const handleFontStyleChange = (value: 'normal' | 'italic') => {
    if (selectedTextsCount > 0) {
      updateSelectedTexts({ fontStyle: value });
    } else {
      updatePluginState('text', { fontStyle: value });
    }
  };

  const handleOpacityChange = (value: number) => {
    if (selectedTextsCount > 0) {
      updateSelectedTexts({ opacity: value });
    } else {
      updatePluginState('text', { opacity: value });
    }
  };

  // Get current values from selected elements or plugin defaults
  const getCurrentFontSize = () => {
    if (selectedTextsCount > 0) {
      const selectedElements = useCanvasStore.getState().getSelectedElements();
      const textElements = selectedElements.filter(el => el.type === 'text');
      if (textElements.length > 0) {
        // Return the font size of the first selected text
        return (textElements[0].data as any).fontSize;
      }
    }
    return plugins.text.fontSize;
  };

  const getCurrentFontFamily = () => {
    if (selectedTextsCount > 0) {
      const selectedElements = useCanvasStore.getState().getSelectedElements();
      const textElements = selectedElements.filter(el => el.type === 'text');
      if (textElements.length > 0) {
        // Return the font family of the first selected text
        return (textElements[0].data as any).fontFamily;
      }
    }
    return plugins.text.fontFamily;
  };

  const getCurrentColor = () => {
    if (selectedTextsCount > 0) {
      const selectedElements = useCanvasStore.getState().getSelectedElements();
      const textElements = selectedElements.filter(el => el.type === 'text');
      if (textElements.length > 0) {
        // Return the color of the first selected text
        return (textElements[0].data as any).color;
      }
    }
    return plugins.text.color;
  };

  const getCurrentText = () => {
    if (selectedTextsCount === 1) {
      const selectedElements = useCanvasStore.getState().getSelectedElements();
      const textElements = selectedElements.filter(el => el.type === 'text');
      if (textElements.length > 0) {
        // Return the text of the selected text element
        return (textElements[0].data as any).text;
      }
    }
    return plugins.text.text;
  };

  const getCurrentFontWeight = () => {
    if (selectedTextsCount > 0) {
      const selectedElements = useCanvasStore.getState().getSelectedElements();
      const textElements = selectedElements.filter(el => el.type === 'text');
      if (textElements.length > 0) {
        return (textElements[0].data as any).fontWeight;
      }
    }
    return plugins.text.fontWeight;
  };

  const getCurrentFontStyle = () => {
    if (selectedTextsCount > 0) {
      const selectedElements = useCanvasStore.getState().getSelectedElements();
      const textElements = selectedElements.filter(el => el.type === 'text');
      if (textElements.length > 0) {
        return (textElements[0].data as any).fontStyle;
      }
    }
    return plugins.text.fontStyle;
  };

  const getCurrentOpacity = () => {
    if (selectedTextsCount > 0) {
      const selectedElements = useCanvasStore.getState().getSelectedElements();
      const textElements = selectedElements.filter(el => el.type === 'text');
      if (textElements.length > 0) {
        return (textElements[0].data as any).opacity;
      }
    }
    return plugins.text.opacity;
  };

  return (
    <div style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Type size={16} style={{ marginRight: '6px', color: '#666' }} />
          <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Text</span>
        </div>
        {selectedTextsCount > 0 && (
          <span style={{
            fontSize: '10px',
            color: '#666',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '12px',
            padding: '2px 6px',
            fontWeight: '500'
          }}>
            {selectedTextsCount}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gap: '6px' }}>
        {/* Text Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="text"
            value={getCurrentText()}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.code === 'Space') {
                e.stopPropagation();
              }
            }}
            placeholder="Enter text"
            disabled={selectedTextsCount > 1}
            style={{
              flex: 1,
              padding: '4px 6px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontSize: '12px'
            }}
          />
        </div>

        {selectedTextsCount > 1 && (
          <div style={{ fontSize: '10px', color: '#666' }}>
            Select one text to edit
          </div>
        )}

        {/* Font Size and Family */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <input
            type="number"
            value={getCurrentFontSize()}
            onChange={(e) => handleFontSizeChange(parseInt(e.target.value) || 12)}
            onKeyDown={(e) => {
              if (e.code === 'Space') {
                e.stopPropagation();
              }
            }}
            min="8"
            max="72"
            style={{
              width: '50px',
              padding: '4px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontSize: '12px'
            }}
          />
          <FontSelector
            value={getCurrentFontFamily()}
            onChange={handleFontFamilyChange}
            fonts={availableFonts}
            disabled={isScanningFonts}
            loading={isScanningFonts}
          />
        </div>

        {/* Style Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onPointerUp={() => handleFontWeightChange(getCurrentFontWeight() === 'bold' ? 'normal' : 'bold')}
            style={{
              padding: '4px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              backgroundColor: getCurrentFontWeight() === 'bold' ? '#007bff' : '#fff',
              color: getCurrentFontWeight() === 'bold' ? '#fff' : '#333',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Bold size={14} />
          </button>
          <button
            onPointerUp={() => handleFontStyleChange(getCurrentFontStyle() === 'italic' ? 'normal' : 'italic')}
            style={{
              padding: '4px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              backgroundColor: getCurrentFontStyle() === 'italic' ? '#007bff' : '#fff',
              color: getCurrentFontStyle() === 'italic' ? '#fff' : '#333',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Italic size={14} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <Palette size={14} style={{ color: '#666' }} />
            <input
              type="color"
              value={getCurrentColor()}
              onChange={(e) => handleColorChange(e.target.value)}
              style={{
                width: '24px',
                height: '24px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>

        {/* Opacity Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Eye size={14} style={{ color: '#666' }} />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={getCurrentOpacity()}
            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            style={{
              flex: 1,
              cursor: 'pointer'
            }}
          />
          <span style={{ fontSize: '12px', minWidth: '35px' }}>
            {Math.round(getCurrentOpacity() * 100)}%
          </span>
        </div>

        {/* Convert to Path Button */}
        {selectedTextsCount > 0 && (
          <button
            onPointerUp={() => {
              convertTextToPath().catch(error => {
                console.error('Error converting text to path:', error);
              });
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              width: '100%',
              justifyContent: 'center',
              marginTop: '8px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#45a049';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#4CAF50';
            }}
          >
            <Wand2 size={14} />
            Convert to Path
          </button>
        )}
      </div>
    </div>
  );
};
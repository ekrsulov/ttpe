import React, { useState, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Type, Palette, Bold, Italic, Eye } from 'lucide-react';
import { getAvailableFonts } from '../../utils';
import { FontSelector } from '../FontSelector';

export const TextPanel: React.FC = () => {
  const { plugins, updatePluginState } = useCanvasStore();

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
    updatePluginState('text', { fontSize: value });
  };

  const handleFontFamilyChange = (value: string) => {
    updatePluginState('text', { fontFamily: value });
  };

  const handleTextChange = (value: string) => {
    updatePluginState('text', { text: value });
  };

  const handleColorChange = (value: string) => {
    updatePluginState('text', { color: value });
  };

  const handleFontWeightChange = (value: 'normal' | 'bold') => {
    updatePluginState('text', { fontWeight: value });
  };

  const handleFontStyleChange = (value: 'normal' | 'italic') => {
    updatePluginState('text', { fontStyle: value });
  };

  const handleOpacityChange = (value: number) => {
    updatePluginState('text', { opacity: value });
  };

  // Get current values from plugin defaults
  const getCurrentFontSize = () => {
    return plugins.text.fontSize;
  };

  const getCurrentFontFamily = () => {
    return plugins.text.fontFamily;
  };

  const getCurrentColor = () => {
    return plugins.text.color;
  };

  const getCurrentText = () => {
    return plugins.text.text;
  };

  const getCurrentFontWeight = () => {
    return plugins.text.fontWeight;
  };

  const getCurrentFontStyle = () => {
    return plugins.text.fontStyle;
  };

  const getCurrentOpacity = () => {
    return plugins.text.opacity;
  };

  return (
    <div style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Type size={16} style={{ marginRight: '6px', color: '#666' }} />
          <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Text</span>
        </div>
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
            style={{
              flex: 1,
              padding: '4px 6px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontSize: '12px'
            }}
          />
        </div>

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

      </div>
    </div>
  );
}
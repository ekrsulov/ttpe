import React, { useState, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Type, Bold, Italic } from 'lucide-react';
import { getAvailableFonts } from '../../utils';
import { FontSelector } from '../FontSelector';
import { IconButton } from '../ui/IconButton';

export const TextPanel: React.FC = () => {
  const { text, updateTextState } = useCanvasStore();

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
    updateTextState({ fontSize: value });
  };

  const handleFontFamilyChange = (value: string) => {
    updateTextState({ fontFamily: value });
  };

  const handleFontWeightChange = (value: 'normal' | 'bold') => {
    updateTextState({ fontWeight: value });
  };

  const handleFontStyleChange = (value: 'normal' | 'italic') => {
    updateTextState({ fontStyle: value });
  };

  const handleTextChange = (value: string) => {
    updateTextState({ text: value });
  };

  // Get current values from plugin defaults
  const getCurrentFontSize = () => {
    return text.fontSize;
  };

  const getCurrentFontFamily = () => {
    return text.fontFamily;
  };

  const getCurrentText = () => {
    return text.text;
  };

  const getCurrentFontWeight = () => {
    return text.fontWeight;
  };

  const getCurrentFontStyle = () => {
    return text.fontStyle;
  };

  return (
    <div style={{ backgroundColor: '#fff' }}>
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

        {/* Font Selector */}
        <FontSelector
          value={getCurrentFontFamily()}
          onChange={handleFontFamilyChange}
          fonts={availableFonts}
          disabled={isScanningFonts}
          loading={isScanningFonts}
        />

        {/* Font Size and Style Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
          <IconButton
            onPointerUp={() => handleFontWeightChange(getCurrentFontWeight() === 'bold' ? 'normal' : 'bold')}
            active={getCurrentFontWeight() === 'bold'}
            activeBgColor="#007bff"
            activeColor="#fff"
            borderColor="#ccc"
            size="custom"
            customSize="22px"
            title="Bold"
          >
            <Bold size={12} />
          </IconButton>
          <IconButton
            onPointerUp={() => handleFontStyleChange(getCurrentFontStyle() === 'italic' ? 'normal' : 'italic')}
            active={getCurrentFontStyle() === 'italic'}
            activeBgColor="#007bff"
            activeColor="#fff"
            borderColor="#ccc"
            size="custom"
            customSize="22px"
            title="Italic"
          >
            <Italic size={12} />
          </IconButton>
        </div>

      </div>
    </div>
  );
}
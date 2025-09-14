import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Type, Palette, Bold, Italic } from 'lucide-react';

export const TextPanel: React.FC = () => {
  const { plugins, updatePluginState, getSelectedTextsCount, updateSelectedTexts } = useCanvasStore();
  const selectedTextsCount = getSelectedTextsCount();

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

  const handleTextDecorationChange = (value: 'none' | 'underline' | 'line-through') => {
    if (selectedTextsCount > 0) {
      updateSelectedTexts({ textDecoration: value });
    } else {
      updatePluginState('text', { textDecoration: value });
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

  const getCurrentTextDecoration = () => {
    if (selectedTextsCount > 0) {
      const selectedElements = useCanvasStore.getState().getSelectedElements();
      const textElements = selectedElements.filter(el => el.type === 'text');
      if (textElements.length > 0) {
        return (textElements[0].data as any).textDecoration;
      }
    }
    return plugins.text.textDecoration;
  };

  return (
    <div style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <Type size={16} style={{ marginRight: '6px', color: '#666' }} />
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Text</span>
        {selectedTextsCount > 0 && (
          <span style={{ fontSize: '10px', color: '#007bff', marginLeft: '6px' }}>
            ({selectedTextsCount})
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
          <select
            value={getCurrentFontFamily()}
            onChange={(e) => handleFontFamilyChange(e.target.value)}
            style={{
              flex: 1,
              padding: '4px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontSize: '12px'
            }}
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times</option>
            <option value="Courier New">Courier</option>
            <option value="Georgia">Georgia</option>
          </select>
        </div>

        {/* Style Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={() => handleFontWeightChange(getCurrentFontWeight() === 'bold' ? 'normal' : 'bold')}
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
            onClick={() => handleFontStyleChange(getCurrentFontStyle() === 'italic' ? 'normal' : 'italic')}
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
          <select
            value={getCurrentTextDecoration()}
            onChange={(e) => handleTextDecorationChange(e.target.value as 'none' | 'underline' | 'line-through')}
            style={{
              flex: 1,
              padding: '4px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontSize: '12px'
            }}
          >
            <option value="none">-</option>
            <option value="underline">U</option>
            <option value="line-through">S</option>
          </select>
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
      </div>
    </div>
  );
};
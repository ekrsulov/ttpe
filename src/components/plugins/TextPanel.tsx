import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';

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
    <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
      <h4>Text</h4>
      {selectedTextsCount > 0 && (
        <p style={{ fontSize: '12px', color: '#007bff', marginBottom: '10px' }}>
          Editing {selectedTextsCount} selected text{selectedTextsCount > 1 ? 's' : ''}
        </p>
      )}
      <div style={{ marginBottom: '10px' }}>
        <label>Font Size: </label>
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
        />
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label>Font Family: </label>
        <select
          value={getCurrentFontFamily()}
          onChange={(e) => handleFontFamilyChange(e.target.value)}
        >
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
        </select>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label>Text: </label>
        <input
          type="text"
          value={getCurrentText()}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.code === 'Space') {
              e.stopPropagation();
            }
          }}
          placeholder="Enter text here"
          disabled={selectedTextsCount > 1}
        />
        {selectedTextsCount > 1 && (
          <p style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
            Select only one text to edit content
          </p>
        )}
      </div>
      <div>
        <label>Color: </label>
        <input
          type="color"
          value={getCurrentColor()}
          onChange={(e) => handleColorChange(e.target.value)}
        />
      </div>
      <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div>
          <label>
            <input
              type="checkbox"
              checked={getCurrentFontWeight() === 'bold'}
              onChange={(e) => handleFontWeightChange(e.target.checked ? 'bold' : 'normal')}
            />
            Bold
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={getCurrentFontStyle() === 'italic'}
              onChange={(e) => handleFontStyleChange(e.target.checked ? 'italic' : 'normal')}
            />
            Italic
          </label>
        </div>
      </div>
      <div style={{ marginTop: '10px' }}>
        <label>Decoration: </label>
        <select
          value={getCurrentTextDecoration()}
          onChange={(e) => handleTextDecorationChange(e.target.value as 'none' | 'underline' | 'line-through')}
        >
          <option value="none">None</option>
          <option value="underline">Underline</option>
          <option value="line-through">Strikethrough</option>
        </select>
      </div>
    </div>
  );
};
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface FontSelectorProps {
  value: string;
  onChange: (font: string) => void;
  fonts: string[];
  disabled?: boolean;
  loading?: boolean;
}

export const FontSelector: React.FC<FontSelectorProps> = ({
  value,
  onChange,
  fonts,
  disabled = false,
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter fonts based on search term
  const filteredFonts = fonts.filter(font =>
    font.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    } else if (e.key === 'Enter' && filteredFonts.length > 0) {
      onChange(filteredFonts[0]);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleFontSelect = (font: string) => {
    onChange(font);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  if (loading) {
    return (
      <div style={{
        flex: 1,
        maxWidth: '200px',
        padding: '4px 8px',
        border: '1px solid #ccc',
        borderRadius: '3px',
        fontSize: '12px',
        backgroundColor: '#f8f9fa',
        color: '#666',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        Loading fonts...
      </div>
    );
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', flex: 1, maxWidth: '200px' }}>
      {/* Trigger/Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          border: '1px solid #ccc',
          borderRadius: '3px',
          backgroundColor: disabled ? '#f8f9fa' : '#fff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          minWidth: 0 // Allow flex shrinking
        }}
        onPointerUp={() => !disabled && setIsOpen(!isOpen)}
      >
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={isOpen ? "Search fonts..." : value}
          disabled={disabled}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '12px',
            fontFamily: isOpen ? 'inherit' : 'inherit', // Always use default font when closed
            cursor: disabled ? 'not-allowed' : 'text',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        />
        <ChevronDown
          size={14}
          style={{
            marginLeft: '4px',
            color: '#666',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0
          }}
        />
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '3px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 1000,
            marginTop: '1px',
            maxWidth: '300px'
          }}
        >
          {filteredFonts.length === 0 ? (
            <div style={{
              padding: '8px 12px',
              color: '#666',
              fontSize: '12px',
              textAlign: 'center'
            }}>
              No fonts found
            </div>
          ) : (
            filteredFonts.map((font) => (
              <div
                key={font}
                onPointerUp={() => handleFontSelect(font)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontFamily: font,
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: font === value ? '#e3f2fd' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '32px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = font === value ? '#e3f2fd' : 'transparent';
                }}
                title={font} // Tooltip para mostrar el nombre completo
              >
                <span style={{
                  fontFamily: font,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {font}
                </span>
                {font === value && (
                  <span style={{
                    color: '#007bff',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    flexShrink: 0,
                    marginLeft: '8px'
                  }}>
                    ✓
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
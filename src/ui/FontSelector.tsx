import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Input,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  InputGroup,
  InputRightElement,
  Text,
  useDisclosure,
  Badge
} from '@chakra-ui/react';
import { ChevronDown } from 'lucide-react';
import { isTTFFont } from '../utils/ttfFontUtils';

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
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [searchTerm, setSearchTerm] = useState('');
  const menuListRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // Filter fonts based on search term
  const filteredFonts = fonts.filter(font =>
    font.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Auto-scroll to selected font when dropdown opens
  useEffect(() => {
    if (isOpen && selectedItemRef.current) {
      // Use setTimeout to ensure the DOM has been rendered
      setTimeout(() => {
        selectedItemRef.current?.scrollIntoView({ 
          block: 'center',
          behavior: 'smooth'
        });
      }, 50);
    }
  }, [isOpen]);

  const handleFontSelect = (font: string) => {
    onChange(font);
    onClose();
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) onOpen();
  };

  if (loading) {
    return (
      <Box
        flex={1}
        maxW="200px"
        p="4px 8px"
        border="1px solid"
        borderColor="gray.300"
        borderRadius="md"
        fontSize="xs"
        bg="gray.50"
        color="gray.600"
      >
        Loading fonts...
      </Box>
    );
  }

  return (
    <Menu isOpen={isOpen} onClose={() => { onClose(); setSearchTerm(''); }}>
      <MenuButton
        as={Box}
        position="relative"
        flex={1}
        maxW="200px"
        onClick={disabled ? undefined : onOpen}
        cursor={disabled ? 'not-allowed' : 'pointer'}
      >
        <InputGroup size="sm">
          <Input
            value={isOpen ? searchTerm : value}
            onChange={handleInputChange}
            onFocus={onOpen}
            placeholder={isOpen ? "Search fonts..." : value}
            isDisabled={disabled}
            fontSize="xs"
            bg={disabled ? 'gray.50' : 'white'}
            _dark={{
              bg: disabled ? 'gray.900' : 'gray.800',
              borderColor: 'whiteAlpha.300',
              _hover: { borderColor: 'whiteAlpha.400' }
            }}
            borderColor="gray.300"
            _hover={{ borderColor: 'gray.400' }}
            _focus={{ borderColor: 'gray.600', boxShadow: '0 0 0 1px var(--chakra-colors-gray-600)' }}
          />
          <InputRightElement h="full">
            <Box color="gray.600" _dark={{ color: 'gray.400' }}>
              <ChevronDown
                size={14}
                style={{
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              />
            </Box>
          </InputRightElement>
        </InputGroup>
      </MenuButton>

      <MenuList
        ref={menuListRef}
        maxH="200px"
        overflowY="auto"
        maxW="300px"
        zIndex={1000}
      >
        {filteredFonts.length === 0 ? (
          <Box p={2} textAlign="center">
            <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
              No fonts found
            </Text>
          </Box>
        ) : (
          filteredFonts.map((font) => (
            <MenuItem
              key={font}
              ref={font === value ? selectedItemRef : null}
              data-selected={font === value ? "true" : undefined}
              onClick={() => handleFontSelect(font)}
              fontSize="sm"
              fontFamily={font}
              bg={font === value ? 'gray.200' : 'transparent'}
              _dark={{
                bg: font === value ? 'gray.700' : 'transparent'
              }}
              _hover={{ bg: 'gray.50', _dark: { bg: 'whiteAlpha.100' } }}
              minH="32px"
              title={font}
            >
              <Text
                flex={1}
                fontFamily={font}
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                {font}
              </Text>
              {isTTFFont(font) && (
                <Badge 
                  colorScheme="purple" 
                  fontSize="9px"
                  ml={2}
                  px={1.5}
                  py={0.5}
                  borderRadius="sm"
                >
                  TTF
                </Badge>
              )}
              {font === value && (
                <Text
                  color="gray.600"
                  fontSize="xs"
                  fontWeight="bold"
                  ml={2}
                >
                  ✓
                </Text>
              )}
            </MenuItem>
          ))
        )}
      </MenuList>
    </Menu>
  );
};
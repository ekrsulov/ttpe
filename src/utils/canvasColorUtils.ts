/**
 * Utility functions for canvas color calculations and contrast determination
 */

/**
 * Calculate contrasting selection color based on element's color (stroke or fill)
 */
export const getContrastingColor = (color: string): string => {
  if (!color || color === 'none') return '#ff6b35'; // Default orange-red for transparent/no-color elements

  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Calculate relative luminance
  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const rgb = hexToRgb(color);
  if (!rgb) return '#ff6b35'; // Fallback if not a valid hex color

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  const isDark = luminance < 0.5;

  // High contrast color palette based on luminance
  if (isDark) {
    // For dark colors, use bright contrasting colors
    const brightColors = [
      '#ff6b35', // Orange-red
      '#f7931e', // Orange
      '#00ff88', // Bright green
      '#00d4ff', // Bright cyan
      '#ff44ff', // Magenta
      '#ffff00', // Yellow
      '#ff4444', // Red
    ];

    // Select color based on hue to ensure good contrast
    const hue = Math.atan2(Math.sqrt(3) * (rgb.g - rgb.b), 2 * rgb.r - rgb.g - rgb.b) * 180 / Math.PI;
    const colorIndex = Math.floor((hue + 180) / (360 / brightColors.length)) % brightColors.length;
    return brightColors[colorIndex];
  } else {
    // For light colors, use dark contrasting colors
    const darkColors = [
      '#8b0000', // Dark red
      '#006400', // Dark green
      '#00008b', // Dark blue
      '#8b008b', // Dark magenta
      '#8b4513', // Saddle brown
      '#2f4f4f', // Dark slate gray
      '#000000', // Black
    ];

    // Select color based on saturation and value
    const max = Math.max(rgb.r, rgb.g, rgb.b);
    const min = Math.min(rgb.r, rgb.g, rgb.b);
    const saturation = max === 0 ? 0 : (max - min) / max;

    if (saturation < 0.3) {
      return '#8b0000'; // Dark red for desaturated colors
    } else {
      const colorIndex = Math.floor((rgb.r * 2 + rgb.g + rgb.b) / (255 * 4) * darkColors.length) % darkColors.length;
      return darkColors[colorIndex];
    }
  }
};

/**
 * Determine the effective color for contrast calculation based on element properties
 */
export const getEffectiveColorForContrast = (
  strokeColor: string | undefined,
  fillColor: string | undefined,
  strokeWidth: number | undefined,
  strokeOpacity: number | undefined
): string => {
  // Determine if the path has an effective stroke
  const hasEffectiveStroke = (strokeWidth || 0) > 0 &&
    strokeColor !== 'none' &&
    (strokeOpacity || 1) > 0;

  // Use fillColor for contrasting color calculation if no effective stroke
  return hasEffectiveStroke ? (strokeColor || '#000000') : (fillColor || 'none');
};

/**
 * Special subpath selection color
 */
export const SUBPATH_SELECTION_COLOR = '#8b5cf6'; // Purple to indicate subpath mode
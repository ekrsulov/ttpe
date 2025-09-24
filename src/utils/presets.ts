export interface Preset {
  id: string;
  name: string;
  strokeWidth: number;
  strokeColor: string;
  strokeOpacity: number;
  fillColor: string;
  fillOpacity: number;
}

// Helper function to convert hex to HSL
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

// Get the primary color for sorting (stroke if available, otherwise fill)
function getPrimaryColor(preset: Preset): string {
  if (preset.strokeColor !== 'none') {
    return preset.strokeColor;
  }
  return preset.fillColor !== 'none' ? preset.fillColor : '#808080'; // Default gray for 'none'
}

export const PRESETS: Preset[] = [
  // Sort all presets by chromatic tone (hue value)
  ...[
    {
      id: 'thick-black',
      name: 'Bold Black',
      strokeWidth: 8,
      strokeColor: '#000000',
      strokeOpacity: 1,
      fillColor: 'none',
      fillOpacity: 1
    },
    {
      id: 'thick-red',
      name: 'Bold Red',
      strokeWidth: 6,
      strokeColor: '#dc3545',
      strokeOpacity: 1,
      fillColor: '#ffebee',
      fillOpacity: 0.8
    },
    {
      id: 'thick-blue',
      name: 'Bold Blue',
      strokeWidth: 7,
      strokeColor: '#007bff',
      strokeOpacity: 1,
      fillColor: '#e3f2fd',
      fillOpacity: 0.7
    },
    {
      id: 'pale-pink',
      name: 'Soft Pink',
      strokeWidth: 2,
      strokeColor: '#fce4ec',
      strokeOpacity: 0.8,
      fillColor: '#fce4ec',
      fillOpacity: 0.4
    },
    {
      id: 'pale-blue',
      name: 'Soft Blue',
      strokeWidth: 3,
      strokeColor: '#e8eaf6',
      strokeOpacity: 0.9,
      fillColor: '#e8eaf6',
      fillOpacity: 0.5
    },
    {
      id: 'pale-green',
      name: 'Soft Green',
      strokeWidth: 2,
      strokeColor: '#e8f5e8',
      strokeOpacity: 0.8,
      fillColor: '#e8f5e8',
      fillOpacity: 0.4
    },
    {
      id: 'vibrant-purple',
      name: 'Vibrant Purple',
      strokeWidth: 4,
      strokeColor: '#9c27b0',
      strokeOpacity: 1,
      fillColor: '#ba68c8',
      fillOpacity: 0.9
    },
    {
      id: 'bright-orange',
      name: 'Bright Orange',
      strokeWidth: 5,
      strokeColor: '#ff9800',
      strokeOpacity: 1,
      fillColor: '#ffb74d',
      fillOpacity: 0.8
    },
    {
      id: 'electric-blue',
      name: 'Electric Blue',
      strokeWidth: 3,
      strokeColor: '#00bcd4',
      strokeOpacity: 1,
      fillColor: '#4dd0e1',
      fillOpacity: 0.9
    },
    {
      id: 'minimal-gray',
      name: 'Minimal Gray',
      strokeWidth: 1,
      strokeColor: '#9e9e9e',
      strokeOpacity: 0.7,
      fillColor: 'none',
      fillOpacity: 1
    },
    {
      id: 'clean-white',
      name: 'Clean White',
      strokeWidth: 2,
      strokeColor: '#ffffff',
      strokeOpacity: 0.9,
      fillColor: '#f5f5f5',
      fillOpacity: 0.6
    },
    {
      id: 'subtle-outline',
      name: 'Subtle Outline',
      strokeWidth: 1,
      strokeColor: '#424242',
      strokeOpacity: 0.5,
      fillColor: 'none',
      fillOpacity: 1
    },
    {
      id: 'warm-autumn',
      name: 'Warm Autumn',
      strokeWidth: 4,
      strokeColor: '#8d6e63',
      strokeOpacity: 0.9,
      fillColor: '#d7ccc8',
      fillOpacity: 0.7
    },
    {
      id: 'cool-ocean',
      name: 'Cool Ocean',
      strokeWidth: 3,
      strokeColor: '#0277bd',
      strokeOpacity: 0.8,
      fillColor: '#b3e5fc',
      fillOpacity: 0.6
    },
    {
      id: 'sunset-glow',
      name: 'Sunset Glow',
      strokeWidth: 5,
      strokeColor: '#ff5722',
      strokeOpacity: 1,
      fillColor: '#ffccbc',
      fillOpacity: 0.8
    },
    {
      id: 'neon-green',
      name: 'Neon Green',
      strokeWidth: 4,
      strokeColor: '#00ff00',
      strokeOpacity: 1,
      fillColor: '#e8f5e8',
      fillOpacity: 0.6
    },
    {
      id: 'royal-purple',
      name: 'Royal Purple',
      strokeWidth: 6,
      strokeColor: '#6a1b9a',
      strokeOpacity: 1,
      fillColor: '#ce93d8',
      fillOpacity: 0.8
    },
    {
      id: 'golden-yellow',
      name: 'Golden Yellow',
      strokeWidth: 3,
      strokeColor: '#ffd700',
      strokeOpacity: 0.9,
      fillColor: '#fff9c4',
      fillOpacity: 0.7
    },
    {
      id: 'crimson-red',
      name: 'Crimson Red',
      strokeWidth: 5,
      strokeColor: '#b71c1c',
      strokeOpacity: 1,
      fillColor: '#ffcdd2',
      fillOpacity: 0.7
    },
    {
      id: 'teal-aqua',
      name: 'Teal Aqua',
      strokeWidth: 4,
      strokeColor: '#00695c',
      strokeOpacity: 0.9,
      fillColor: '#b2dfdb',
      fillOpacity: 0.8
    },
    {
      id: 'lavender-dream',
      name: 'Lavender Dream',
      strokeWidth: 2,
      strokeColor: '#e1bee7',
      strokeOpacity: 0.8,
      fillColor: '#f3e5f5',
      fillOpacity: 0.5
    },
    {
      id: 'charcoal-gray',
      name: 'Charcoal Gray',
      strokeWidth: 8,
      strokeColor: '#263238',
      strokeOpacity: 1,
      fillColor: '#546e7a',
      fillOpacity: 0.9
    },
    {
      id: 'mint-fresh',
      name: 'Mint Fresh',
      strokeWidth: 3,
      strokeColor: '#4caf50',
      strokeOpacity: 0.9,
      fillColor: '#c8e6c9',
      fillOpacity: 0.6
    },
    {
      id: 'coral-pink',
      name: 'Coral Pink',
      strokeWidth: 4,
      strokeColor: '#ff7043',
      strokeOpacity: 1,
      fillColor: '#ffebee',
      fillOpacity: 0.7
    },
    {
      id: 'navy-blue',
      name: 'Navy Blue',
      strokeWidth: 6,
      strokeColor: '#0d47a1',
      strokeOpacity: 1,
      fillColor: '#bbdefb',
      fillOpacity: 0.8
    },
    {
      id: 'sage-green',
      name: 'Sage Green',
      strokeWidth: 2,
      strokeColor: '#689f38',
      strokeOpacity: 0.8,
      fillColor: '#dcedc8',
      fillOpacity: 0.5
    },
    {
      id: 'rose-gold',
      name: 'Rose Gold',
      strokeWidth: 3,
      strokeColor: '#e91e63',
      strokeOpacity: 0.9,
      fillColor: '#fce4ec',
      fillOpacity: 0.6
    },
    {
      id: 'slate-blue',
      name: 'Slate Blue',
      strokeWidth: 5,
      strokeColor: '#455a64',
      strokeOpacity: 0.9,
      fillColor: '#b0bec5',
      fillOpacity: 0.7
    },
    {
      id: 'sunflower',
      name: 'Sunflower',
      strokeWidth: 4,
      strokeColor: '#ffeb3b',
      strokeOpacity: 0.8,
      fillColor: '#fffde7',
      fillOpacity: 0.6
    },
    {
      id: 'emerald',
      name: 'Emerald',
      strokeWidth: 5,
      strokeColor: '#2e7d32',
      strokeOpacity: 1,
      fillColor: '#a5d6a7',
      fillOpacity: 0.8
    }
  ].sort((a, b) => {
    const colorA = getPrimaryColor(a);
    const colorB = getPrimaryColor(b);

    // Put 'none' colors at the end
    if (colorA === '#808080' && colorB !== '#808080') return 1;
    if (colorB === '#808080' && colorA !== '#808080') return -1;
    if (colorA === '#808080' && colorB === '#808080') return 0;

    const [hueA] = hexToHsl(colorA);
    const [hueB] = hexToHsl(colorB);

    return hueA - hueB;
  })
];
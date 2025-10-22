import { hexToHsl } from './canvasColorUtils';

export interface Preset {
  id: string;
  name: string;
  strokeWidth: number;
  strokeColor: string;
  strokeOpacity: number;
  fillColor: string;
  fillOpacity: number;
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
      id: 'thick-red',
      name: 'Bold Red',
      strokeWidth: 6,
      strokeColor: '#dc3545',
      strokeOpacity: 1,
      fillColor: '#ffebee',
      fillOpacity: 0.8
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
      id: 'golden-yellow',
      name: 'Golden Yellow',
      strokeWidth: 3,
      strokeColor: '#ffd700',
      strokeOpacity: 0.9,
      fillColor: '#fff9c4',
      fillOpacity: 0.7
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
      id: 'thick-blue',
      name: 'Bold Blue',
      strokeWidth: 7,
      strokeColor: '#007bff',
      strokeOpacity: 1,
      fillColor: '#e3f2fd',
      fillOpacity: 0.7
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
      id: 'black',
      name: 'Black',
      strokeWidth: 4,
      strokeColor: '#000000',
      strokeOpacity: 1,
      fillColor: 'none',
      fillOpacity: 1
    }
  ].sort((a, b) => {
    const colorA = getPrimaryColor(a);
    const colorB = getPrimaryColor(b);

    // Put 'none' colors at the end
    if (colorA === '#808080' && colorB !== '#808080') return 1;
    if (colorB === '#808080' && colorA !== '#808080') return -1;
    if (colorA === '#808080' && colorB === '#808080') return 0;

    const { h: hueA } = hexToHsl(colorA);
    const { h: hueB } = hexToHsl(colorB);

    return hueA - hueB;
  })
];
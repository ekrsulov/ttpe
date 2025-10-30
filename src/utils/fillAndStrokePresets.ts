import { hexToHsl } from './canvasColorUtils';
import { DEFAULT_STROKE_COLOR_DARK, DEFAULT_STROKE_COLOR_LIGHT } from './defaultColors';

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

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const hslToHex = (h: number, s: number, l: number): string => {
  const normalizedS = clamp(s, 0, 1);
  const normalizedL = clamp(l, 0, 1);
  const chroma = (1 - Math.abs(2 * normalizedL - 1)) * normalizedS;
  const hueSegment = h / 60;
  const x = chroma * (1 - Math.abs((hueSegment % 2) - 1));
  const m = normalizedL - chroma / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hueSegment >= 0 && hueSegment < 1) {
    r = chroma;
    g = x;
  } else if (hueSegment < 2) {
    r = x;
    g = chroma;
  } else if (hueSegment < 3) {
    g = chroma;
    b = x;
  } else if (hueSegment < 4) {
    g = x;
    b = chroma;
  } else if (hueSegment < 5) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  const to255 = (channel: number) => Math.round((channel + m) * 255);
  const toHex = (channel: number) => channel.toString(16).padStart(2, '0');

  return `#${toHex(to255(r))}${toHex(to255(g))}${toHex(to255(b))}`.toLowerCase();
};

const adjustStrokeForDarkMode = (color: string): string => {
  const { h, s, l } = hexToHsl(color);
  const normalizedS = s / 100;
  const normalizedL = l / 100;
  const boostedLightness = clamp(normalizedL + 0.25, 0.55, 0.9);
  const boostedSaturation = clamp(normalizedS + 0.15, 0.4, 0.85);
  return hslToHex(h, boostedSaturation, boostedLightness);
};

const createComplementaryFill = (strokeColor: string, fallback: string): string => {
  if (fallback === 'none') {
    return 'none';
  }

  const { h } = hexToHsl(strokeColor);
  const complementaryHue = (h + 180) % 360;
  return hslToHex(complementaryHue, 0.55, 0.35);
};

const BASE_PRESETS: Preset[] = [
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
    strokeColor: DEFAULT_STROKE_COLOR_LIGHT,
    strokeOpacity: 1,
    fillColor: 'none',
    fillOpacity: 1
  }
];

const sortPresets = (presets: Preset[]): Preset[] =>
  [...presets].sort((a, b) => {
    const colorA = getPrimaryColor(a);
    const colorB = getPrimaryColor(b);

    if (colorA === '#808080' && colorB !== '#808080') return 1;
    if (colorB === '#808080' && colorA !== '#808080') return -1;
    if (colorA === '#808080' && colorB === '#808080') return 0;

    const { h: hueA } = hexToHsl(colorA);
    const { h: hueB } = hexToHsl(colorB);

    return hueA - hueB;
  });

const LIGHT_MODE_PRESETS: Preset[] = sortPresets(BASE_PRESETS);

const DARK_MODE_PRESETS: Preset[] = sortPresets(
  BASE_PRESETS.map((preset) => {
    if (preset.id === 'black') {
      return {
        ...preset,
        strokeColor: DEFAULT_STROKE_COLOR_DARK,
        fillColor: 'none',
      };
    }

    const adjustedStroke = adjustStrokeForDarkMode(preset.strokeColor);
    return {
      ...preset,
      strokeColor: adjustedStroke,
      fillColor: createComplementaryFill(adjustedStroke, preset.fillColor),
    };
  })
);

export const PRESETS: Preset[] = LIGHT_MODE_PRESETS;

export const DARK_PRESETS: Preset[] = DARK_MODE_PRESETS;

export function getFillAndStrokePresets(colorMode: 'light' | 'dark'): Preset[] {
  return colorMode === 'dark' ? DARK_MODE_PRESETS : LIGHT_MODE_PRESETS;
}
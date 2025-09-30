// Dash array presets for stroke styling
export interface DashPreset {
  id: string;
  name: string;
  dashArray: string;
  description: string;
}

export const DASH_PRESETS: DashPreset[] = [
  {
    id: 'solid',
    name: 'Solid',
    dashArray: 'none',
    description: 'No dashes, continuous line'
  },
  {
    id: 'dashed',
    name: 'Dashed',
    dashArray: '5,5',
    description: 'Medium dashes with equal gaps'
  },
  {
    id: 'dotted',
    name: 'Dotted',
    dashArray: '1,3',
    description: 'Small dots with gaps'
  },
  {
    id: 'dash-dot',
    name: 'Dash-Dot',
    dashArray: '10,3,2,3',
    description: 'Dash followed by dot pattern'
  },
  {
    id: 'long-dash',
    name: 'Long Dash',
    dashArray: '15,5',
    description: 'Long dashes with short gaps'
  },
  {
    id: 'short-dash',
    name: 'Short Dash',
    dashArray: '3,2',
    description: 'Short dashes with small gaps'
  },
  {
    id: 'double-dash',
    name: 'Double Dash',
    dashArray: '8,3,3,3',
    description: 'Alternating long and short dashes'
  },
  {
    id: 'morse',
    name: 'Morse',
    dashArray: '12,3,3,3,3,3',
    description: 'Morse code style pattern'
  },
  {
    id: 'fine-dots',
    name: 'Fine Dots',
    dashArray: '0.5,2',
    description: 'Very small dots with medium gaps'
  },
  {
    id: 'thick-dash',
    name: 'Thick Dash',
    dashArray: '20,8',
    description: 'Very long dashes with wide gaps'
  },
  {
    id: 'dash-double-dot',
    name: 'Dash Double Dot',
    dashArray: '12,3,2,3,2,3',
    description: 'Dash followed by two dots pattern'
  },
  {
    id: 'railroad',
    name: 'Railroad',
    dashArray: '6,2,2,2,6,2',
    description: 'Railroad track style pattern'
  },
  {
    id: 'dense-dots',
    name: 'Dense Dots',
    dashArray: '10,3',
    description: 'Medium dashes with short gaps'
  }
];

/**
 * Converts a dash array string to SVG format
 */
export function formatDashArray(dashArray: string): string {
  if (dashArray === 'none' || !dashArray) {
    return 'none';
  }
  return dashArray;
}

/**
 * Gets dash preset by id
 */
export function getDashPreset(id: string): DashPreset | undefined {
  return DASH_PRESETS.find(preset => preset.id === id);
}
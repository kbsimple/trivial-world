import { createTamagui } from 'tamagui';
import { createInterFont } from '@tamagui/font-inter';

const config = createTamagui({
  fonts: {
    heading: createInterFont(),
    body: createInterFont(),
  },
  themes: {
    dark: {
      background: '#1a1a2e',
      color: '#ffffff',
      // Category colors match Trivial World branding
      blueCategory: '#0066cc',
      pinkCategory: '#ff69b4',
      yellowCategory: '#ffd700',
      purpleCategory: '#9932cc',
      greenCategory: '#228b22',
      orangeCategory: '#ff8c00',
    },
    light: {
      background: '#ffffff',
      color: '#1a1a2e',
      // Category colors for light theme
      blueCategory: '#0066cc',
      pinkCategory: '#ff69b4',
      yellowCategory: '#ffd700',
      purpleCategory: '#9932cc',
      greenCategory: '#228b22',
      orangeCategory: '#ff8c00',
    },
  },
});

export default config;
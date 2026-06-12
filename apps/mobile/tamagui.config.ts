import { createTamagui } from 'tamagui';
import { createInterFont } from '@tamagui/font-inter';
import { tokens, shorthands, media, animations } from '@tamagui/config/v4';

const config = createTamagui({
  tokens,
  media,
  shorthands,
  animations,
  fonts: {
    heading: createInterFont(),
    body: createInterFont(),
  },
  themes: {
    dark: {
      background: '#1a1a2e',
      color: '#ffffff',
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

import { View, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';

// IN-03: Utility for consistent theme color access with fallback
type ThemeValue = ReturnType<typeof useTheme>;
const getThemeColor = (theme: ThemeValue, key: keyof ThemeValue, fallback: string): string => {
  const value = theme[key]?.val;
  return typeof value === 'string' ? value : fallback;
};

interface DieFaceProps {
  value: number; // 1-6
  size?: number; // default 120
}

/**
 * DieFace - Renders a visual die face with dots
 * Uses a 3x3 grid pattern for dot placement
 * Dark theme with white dots
 */
export function DieFace({ value, size = 120 }: DieFaceProps) {
  const theme = useTheme();

  // Dot positions for each value (0-8 mapping to 3x3 grid)
  // Grid: [0,1,2]
  //       [3,4,5]
  //       [6,7,8]
  const dotPatterns: Record<number, number[]> = {
    1: [4], // center
    2: [0, 8], // top-left, bottom-right
    3: [0, 4, 8], // diagonal
    4: [0, 2, 6, 8], // corners
    5: [0, 2, 4, 6, 8], // corners + center
    6: [0, 2, 3, 5, 6, 8], // two columns
  };

  const dots = dotPatterns[value] || [];

  // Calculate dimensions based on size
  const dotSize = size / 6;
  const gap = size / 12;

  // IN-03: Use theme utility for consistent color access
  const backgroundColor = getThemeColor(theme, 'background', '#2a2a4e');
  const dotColor = getThemeColor(theme, 'color', '#ffffff');

  return (
    <View style={[
      styles.container,
      {
        width: size,
        height: size,
        borderRadius: size / 8,
        backgroundColor,
      }
    ]}>
      <View style={[styles.grid, { width: size - gap * 2, height: size - gap * 2 }]}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((position) => (
          <View
            key={position}
            style={[
              styles.dot,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: dots.includes(position) ? dotColor : 'transparent',
              }
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    margin: 2,
  },
});
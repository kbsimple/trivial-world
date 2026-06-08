import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { PlayerColor, CATEGORY_COLORS } from '../constants/categories';
import { CATEGORY_NAMES } from '../constants/categories';

interface CategoryBadgeProps {
  /** Category color to display */
  category: PlayerColor;
  /** Optional size prop (default: '$3') */
  size?: '$1' | '$2' | '$3' | '$4' | '$5';
}

/**
 * CategoryBadge component
 * Displays category name on colored background matching Trivial World category colors
 * Used in question display to show current category
 *
 * Per D-10: Category badge displayed prominently with colored background
 */
export function CategoryBadge({ category, size = '$3' }: CategoryBadgeProps) {
  const theme = useTheme();
  const backgroundColor = CATEGORY_COLORS[category];
  const categoryName = CATEGORY_NAMES[category];

  // Map Tamagui size tokens to font sizes
  const sizeMap: Record<string, number> = {
    '$1': 12,
    '$2': 14,
    '$3': 16,
    '$4': 18,
    '$5': 20,
  };

  const fontSize = sizeMap[size] || 16;

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.text, { fontSize }]}>
        {categoryName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
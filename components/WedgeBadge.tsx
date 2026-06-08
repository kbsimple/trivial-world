import { View, StyleSheet } from 'react-native';
import { PlayerColor, CATEGORY_COLORS } from '../constants/categories';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

interface WedgeBadgeProps {
  /** The category color for this wedge */
  color: PlayerColor;
  /** Whether the wedge has been earned */
  earned: boolean;
  /** Size of the badge in pixels */
  size?: number;
}

/**
 * WedgeBadge - Single wedge icon showing earned or empty state
 *
 * Per RESEARCH.md Pattern 4:
 * - Reanimated for smooth earned animation
 * - CATEGORY_COLORS for wedge colors
 * - Dark theme compatible (unearned = dimmed)
 */
export function WedgeBadge({ color, earned, size = 24 }: WedgeBadgeProps) {
  const scale = useSharedValue(earned ? 1 : 0.85);
  const opacity = useSharedValue(earned ? 1 : 0.4);

  // Animate when earned state changes
  // Note: Animation would be triggered by parent when earned changes

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const backgroundColor = earned ? CATEGORY_COLORS[color] : '#333333';

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          backgroundColor,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 4,
    marginHorizontal: 2,
    // Slight shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
import { View, StyleSheet } from 'react-native';
import { PlayerColor, PLAYER_COLORS } from '../constants/categories';
import { WedgeBadge } from './WedgeBadge';

interface WedgeCollectionProps {
  /** Wedges earned by the player (array of category colors) */
  wedges: PlayerColor[];
  /** Size of each wedge badge */
  size?: 'small' | 'medium' | 'large';
}

/**
 * WedgeCollection - Display all 6 wedge slots showing earned status
 *
 * Per RESEARCH.md Pattern 4:
 * - Maps over PLAYER_COLORS to show all 6 slots
 * - Each slot shows earned or unearned state
 * - Size prop for different contexts
 */
export function WedgeCollection({ wedges, size = 'medium' }: WedgeCollectionProps) {
  // Size mappings in pixels
  const sizeMap = {
    small: 16,
    medium: 24,
    large: 32,
  };

  const wedgeSize = sizeMap[size];

  return (
    <View style={styles.container}>
      {PLAYER_COLORS.map((color) => (
        <WedgeBadge
          key={color}
          color={color}
          earned={wedges.includes(color)}
          size={wedgeSize}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
});
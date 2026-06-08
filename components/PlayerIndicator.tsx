import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { PlayerColor, CATEGORY_COLORS } from '../constants/categories';

interface PlayerIndicatorProps {
  /** Player display name */
  playerName: string;
  /** Player's assigned color */
  playerColor: PlayerColor;
}

/**
 * PlayerIndicator component
 * Small indicator showing current player at top of question screen
 *
 * Per D-17: Small name/avatar at top of screen showing current player
 * Per D-14: Minimal design - just enough to identify whose turn it is
 */
export function PlayerIndicator({ playerName, playerColor }: PlayerIndicatorProps) {
  const theme = useTheme();
  const colorDot = CATEGORY_COLORS[playerColor];

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundHover?.val as string || '#2a2a3e' }]}>
      {/* Color dot matching player's category color */}
      <View style={[styles.colorDot, { backgroundColor: colorDot }]} />

      {/* Player name - small and non-distracting */}
      <Text style={[styles.playerName, { color: theme.color?.val as string }]}>
        {playerName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6, // Circular
  },
  playerName: {
    fontSize: 14, // D-17: Small text, non-distracting
    fontWeight: '500',
  },
});
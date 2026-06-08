import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { Player } from '../types/player';
import { CATEGORY_COLORS } from '../constants/categories';
import { WedgeCollection } from './WedgeCollection';

interface PlayerScoreCardProps {
  /** Player to display */
  player: Player;
  /** Rank in leaderboard (1-based) */
  rank: number;
  /** Whether this player is the winner */
  isWinner: boolean;
}

/**
 * PlayerScoreCard - Individual player score display
 *
 * Per RESEARCH.md Pattern 3:
 * - Shows rank, player name, wedge collection, and count
 * - Highlights winner with accent color
 * - Uses CATEGORY_COLORS for player color indicator
 */
export function PlayerScoreCard({ player, rank, isWinner }: PlayerScoreCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isWinner
            ? (theme.accent?.val as string || '#4CAF50')
            : (theme.background?.val as string || '#1a1a2e'),
          borderColor: isWinner ? (theme.accent?.val as string || '#4CAF50') : '#444',
        },
      ]}
    >
      {/* Rank indicator */}
      <View style={styles.rankContainer}>
        <Text style={[styles.rank, { color: theme.color?.val as string || '#ffffff' }]}>
          #{rank}
        </Text>
      </View>

      {/* Player info: color dot + name */}
      <View style={styles.playerInfo}>
        <View
          style={[
            styles.colorDot,
            { backgroundColor: CATEGORY_COLORS[player.color] },
          ]}
        />
        <Text
          style={[
            styles.name,
            {
              color: theme.color?.val as string || '#ffffff',
              fontWeight: isWinner ? '700' : '500',
            },
          ]}
        >
          {player.name}
          {isWinner && ' - Winner!'}
        </Text>
      </View>

      {/* Wedge collection display */}
      <WedgeCollection wedges={player.wedges} size="medium" />

      {/* Wedge count */}
      <Text style={[styles.wedgeCount, { color: theme.color?.val as string || '#ffffff' }]}>
        {player.wedges.length}/6
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rank: {
    fontSize: 18,
    fontWeight: '600',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
  },
  wedgeCount: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
    minWidth: 40,
    textAlign: 'right',
  },
});
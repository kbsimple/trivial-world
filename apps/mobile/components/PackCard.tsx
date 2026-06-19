import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { PackIndexEntry } from '@trivial-world/types';
import { SEMANTIC_COLORS } from '../constants/theme';

interface PackCardProps {
  pack: PackIndexEntry;
  isDownloaded: boolean;
  hasUpdate: boolean;
  isActive: boolean;
  onPress: () => void;
  onSelect?: () => void;
}

/**
 * Pack card component
 * Displays pack info with status badges
 * Per D-13: Shows "Update Available" badge when newer version exists
 * Per UI-SPEC: Name, author, question count, status
 */
export function PackCard({
  pack,
  isDownloaded,
  hasUpdate,
  isActive,
  onPress,
  onSelect,
}: PackCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      style={[
        styles.container,
        isActive && styles.activeContainer,
        { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
      ]}
      onPress={onPress}
    >
      {/* Pack info */}
      <View style={styles.infoContainer}>
        <Text style={[styles.name, { color: theme.color?.val as string }]}>
          {pack.name}
        </Text>
        <Text style={[styles.author, { color: theme.color?.val as string, opacity: 0.7 }]}>
          by {pack.author}
        </Text>
        <Text style={[styles.count, { color: theme.color?.val as string, opacity: 0.7 }]}>
          {pack.totalQuestions} questions
        </Text>
      </View>

      {/* Status badges */}
      <View style={styles.badgesContainer}>
        {/* Update available badge (D-13) */}
        {hasUpdate && (
          <View style={styles.updateBadge}>
            <Text style={styles.updateBadgeText}>Update Available</Text>
          </View>
        )}

        {/* Downloaded indicator */}
        {isDownloaded && !hasUpdate && (
          <Text style={[styles.downloadedText, { color: SEMANTIC_COLORS.selected }]}>
            Downloaded
          </Text>
        )}

        {/* Active indicator */}
        {isActive && (
          <Text style={[styles.activeText, { color: SEMANTIC_COLORS.selected }]}>
            Active
          </Text>
        )}
      </View>

      {/* Select button */}
      {onSelect && (
        <Pressable
          style={[styles.selectButton, { backgroundColor: SEMANTIC_COLORS.selected }]}
          onPress={onSelect}
        >
          <Text style={styles.selectButtonText}>Select</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  activeContainer: {
    borderWidth: 2,
    borderColor: SEMANTIC_COLORS.selected,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  author: {
    fontSize: 14,
    marginBottom: 2,
    textAlign: 'center',
  },
  count: {
    fontSize: 12,
    textAlign: 'center',
  },
  badgesContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginRight: 8,
  },
  updateBadge: {
    backgroundColor: '#ffa500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  updateBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  downloadedText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
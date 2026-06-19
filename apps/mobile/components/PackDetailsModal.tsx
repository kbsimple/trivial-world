import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { PackIndexEntry, PackMetadata, Category } from '@trivial-world/types';
import { CATEGORY_COLORS, CATEGORY_NAMES, PLAYER_COLORS } from '../constants/categories';
import type { PlayerColor } from '../constants/categories';
import { SEMANTIC_COLORS } from '../constants/theme';

interface PackDetailsModalProps {
  visible: boolean;
  pack: PackIndexEntry | PackMetadata | null;
  isDownloaded: boolean;
  onClose: () => void;
  onDownload?: () => void;
  onSelect?: () => void;
}

/**
 * Pack details modal overlay
 * Per D-08: Modal overlay (not separate screen)
 * Per D-09: Shows category distribution, counts, difficulty, metadata
 */
export function PackDetailsModal({
  visible,
  pack,
  isDownloaded,
  onClose,
  onDownload,
  onSelect,
}: PackDetailsModalProps) {
  const theme = useTheme();

  if (!pack) return null;

  const categoryEntries = Object.entries(pack.categoryCounts) as [Category, number][];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.background?.val as string }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.color?.val as string }]}>
              {pack.name}
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: theme.color?.val as string }]}>
                Close
              </Text>
            </Pressable>
          </View>

          {/* Author and version */}
          <Text style={[styles.author, { color: theme.color?.val as string, opacity: 0.7 }]}>
            by {pack.author} - v{pack.version}
          </Text>

          {/* Category distribution (D-09) */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.color?.val as string }]}>
              Category Distribution
            </Text>
            {categoryEntries.map(([category, count]) => (
              <View key={category} style={styles.categoryRow}>
                <View
                  style={[
                    styles.categoryDot,
                    { backgroundColor: CATEGORY_COLORS[category as PlayerColor] },
                  ]}
                />
                <Text style={[styles.categoryName, { color: theme.color?.val as string }]}>
                  {CATEGORY_NAMES[category as PlayerColor]}
                </Text>
                <Text style={[styles.categoryCount, { color: theme.color?.val as string, opacity: 0.7 }]}>
                  {count}
                </Text>
              </View>
            ))}
          </View>

          {/* Total questions */}
          <Text style={[styles.totalQuestions, { color: theme.color?.val as string }]}>
            {pack.totalQuestions} total questions
          </Text>

          {/* Metadata (D-09) */}
          {'size' in pack && (
            <Text style={[styles.metadata, { color: theme.color?.val as string, opacity: 0.7 }]}>
              Size: {(pack.size / 1024).toFixed(1)} KB
            </Text>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {!isDownloaded && onDownload && (
              <Pressable style={[styles.actionButton, { backgroundColor: SEMANTIC_COLORS.success }]} onPress={onDownload}>
                <Text style={styles.actionButtonText}>Download</Text>
              </Pressable>
            )}

            {isDownloaded && onSelect && (
              <Pressable style={[styles.actionButton, { backgroundColor: SEMANTIC_COLORS.success }]} onPress={onSelect}>
                <Text style={styles.actionButtonText}>Select Pack</Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.actionButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
              onPress={onClose}
            >
              <Text style={[styles.actionButtonText, { color: theme.color?.val as string }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 16,
  },
  author: {
    fontSize: 14,
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalQuestions: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  metadata: {
    fontSize: 12,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
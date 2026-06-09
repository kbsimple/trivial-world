import { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'tamagui';
import { usePackStore } from '../../stores/packStore';
import { PackCard } from '../../components/PackCard';
import { PackDetailsModal } from '../../components/PackDetailsModal';
import { DownloadProgress } from '../../components/DownloadProgress';
import { CategoryFilter } from '../../components/CategoryFilter';
import { DifficultyFilter } from '../../components/DifficultyFilter';
import { Category, Difficulty, PackIndexEntry } from '@trivial-world/types';

/**
 * Pack selection screen
 * Per D-01: Pack selection BEFORE setup screen
 * Per CONF-01: Shows available packs with metadata
 * Per D-05/D-06: Category and difficulty filters
 * Per D-13: Shows "Update Available" badge (version comparison in 08-03)
 */
export default function PackSelectionScreen() {
  const router = useRouter();
  const theme = useTheme();

  // Pack store state and actions
  const {
    availablePacks,
    downloadedPackIds,
    activePackId,
    enabledCategories,
    enabledDifficulties,
    isLoading,
    isDownloading,
    downloadProgress,
    downloadError,
    fetchAvailablePacks,
    downloadPack,
    refreshDownloadedPacks,
    selectPack,
    setEnabledCategories,
    setEnabledDifficulties,
    clearDownloadError,
  } = usePackStore();

  // Local state
  const [selectedPack, setSelectedPack] = useState<PackIndexEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch available packs on mount
  useEffect(() => {
    fetchAvailablePacks().catch((error) => {
      console.error('Failed to fetch pack index:', error);
      Alert.alert('Error', 'Failed to load available packs. Please try again.');
    });

    // Refresh downloaded packs from database
    refreshDownloadedPacks();
  }, []);

  // Show download error alert (D-11)
  useEffect(() => {
    if (downloadError) {
      Alert.alert(
        'Download Failed',
        `${downloadError}\n\nTap "Retry" to try again.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: clearDownloadError },
          { text: 'Retry', onPress: () => selectedPack && handleDownload(selectedPack) },
        ]
      );
    }
  }, [downloadError]);

  const handlePackPress = (pack: PackIndexEntry) => {
    setSelectedPack(pack);
    setModalVisible(true);
  };

  const handleDownload = async (pack: PackIndexEntry) => {
    setModalVisible(false);
    try {
      await downloadPack(pack);
      Alert.alert('Success', `${pack.name} downloaded successfully!`);
    } catch (error) {
      // Error handled by store and alert above
      console.error('Download failed:', error);
    }
  };

  const handleSelectPack = async (packId: string) => {
    await selectPack(packId);
    setModalVisible(false);
    // Navigate to setup screen (D-01: Pack -> Setup -> Game)
    router.push('/game/setup');
  };

  const handleCategoryToggle = (category: Category) => {
    const current = enabledCategories || [];
    if (current.includes(category)) {
      // Remove category
      setEnabledCategories(current.filter((c) => c !== category));
    } else {
      // Add category
      setEnabledCategories([...current, category]);
    }
  };

  const handleDifficultyToggle = (difficulty: Difficulty) => {
    const current = enabledDifficulties || [];
    if (current.includes(difficulty)) {
      // Remove difficulty
      setEnabledDifficulties(current.filter((d) => d !== difficulty));
    } else {
      // Add difficulty
      setEnabledDifficulties([...current, difficulty]);
    }
  };

  const handleSelectAllCategories = () => {
    setEnabledCategories(null); // null = all
  };

  const handleClearAllCategories = () => {
    setEnabledCategories([]);
  };

  const handleSelectAllDifficulties = () => {
    setEnabledDifficulties(null); // null = all
  };

  // Check if pack has update available (D-13/D-14)
  // Stub function - semver comparison implemented in 08-03 Plan Task 7
  // The actual implementation loads downloaded versions from WatermelonDB
  // and uses utils/versionCompare.ts for semver comparison
  const hasUpdateAvailable = (pack: PackIndexEntry): boolean => {
    // Placeholder - returns false until version comparison is implemented
    // 08-03 Plan Task 7 completes this implementation
    return false;
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background?.val as string }]}>
        <ActivityIndicator size="large" color={theme.color?.val as string} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val as string }]}>
      {/* Header */}
      <Text style={[styles.title, { color: theme.color?.val as string }]}>
        Select Question Pack
      </Text>

      {/* Download progress (D-10) */}
      {isDownloading && selectedPack && (
        <DownloadProgress
          packName={selectedPack.name}
          progress={downloadProgress}
          bytesWritten={0} // Placeholder - would need actual bytes
          bytesTotal={selectedPack.size}
        />
      )}

      {/* Category filter (D-05) */}
      <CategoryFilter
        enabledCategories={enabledCategories}
        onToggle={handleCategoryToggle}
        onSelectAll={handleSelectAllCategories}
        onClearAll={handleClearAllCategories}
      />

      {/* Difficulty filter (D-06) */}
      <DifficultyFilter
        enabledDifficulties={enabledDifficulties}
        onToggle={handleDifficultyToggle}
        onSelectAll={handleSelectAllDifficulties}
        onClearAll={() => setEnabledDifficulties([])}
      />

      {/* Pack list (CONF-01) */}
      <FlatList
        data={availablePacks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PackCard
            pack={item}
            isDownloaded={downloadedPackIds.includes(item.id)}
            hasUpdate={hasUpdateAvailable(item)}
            isActive={activePackId === item.id}
            onPress={() => handlePackPress(item)}
            onSelect={
              downloadedPackIds.includes(item.id)
                ? () => handleSelectPack(item.id)
                : undefined
            }
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.color?.val as string }]}>
            No packs available
          </Text>
        }
      />

      {/* Pack details modal (D-08, D-09) */}
      <PackDetailsModal
        visible={modalVisible}
        pack={selectedPack}
        isDownloaded={selectedPack ? downloadedPackIds.includes(selectedPack.id) : false}
        onClose={() => setModalVisible(false)}
        onDownload={
          selectedPack && !downloadedPackIds.includes(selectedPack.id)
            ? () => handleDownload(selectedPack)
            : undefined
        }
        onSelect={
          selectedPack && downloadedPackIds.includes(selectedPack.id)
            ? () => handleSelectPack(selectedPack.id)
            : undefined
        }
      />

      {/* Back button */}
      <Pressable
        style={[styles.backButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
        onPress={() => router.back()}
      >
        <Text style={[styles.backButtonText, { color: theme.color?.val as string }]}>
          Back
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.7,
  },
  backButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
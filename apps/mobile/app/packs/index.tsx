import { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, Alert, Platform, LayoutAnimation } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'tamagui';
import { usePackStore } from '../../stores/packStore';
import { PackCard } from '../../components/PackCard';
import { PackDetailsModal } from '../../components/PackDetailsModal';
import { DownloadProgress } from '../../components/DownloadProgress';
import { CategoryFilter } from '../../components/CategoryFilter';
import { DifficultyFilter } from '../../components/DifficultyFilter';
import { Category, Difficulty, PackIndexEntry } from '@trivial-world/types';
import { hasUpdateAvailable } from '../../utils/versionCompare';

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
    downloadBytesWritten,
    downloadError,
    fetchAvailablePacks,
    downloadPack,
    refreshDownloadedPacks,
    selectPack,
    selectPackList,
    setEnabledCategories,
    setEnabledDifficulties,
    clearDownloadError,
  } = usePackStore();

  // Local state
  const [selectedPack, setSelectedPack] = useState<PackIndexEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  // Multi-pack dynamic selection
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>([]);
  // D-14: Downloaded pack versions for semver comparison
  const [downloadedPackVersions, setDownloadedPackVersions] = useState<Record<string, string>>({});
  // WR-01: Track pack that caused download error for retry
  const errorPackRef = useRef<PackIndexEntry | null>(null);
  // Collapsible filters
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const toggleFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFiltersExpanded(prev => !prev);
  };

  // Fetch available packs on mount
  useEffect(() => {
    fetchAvailablePacks().catch((error) => {
      console.error('Failed to fetch pack index:', error);
      Alert.alert('Error', 'Failed to load available packs. Please try again.');
    });

    // Refresh downloaded packs from database
    refreshDownloadedPacks();
  }, []);

  // Load downloaded pack versions from WatermelonDB (D-14)
  useEffect(() => {
    const loadDownloadedVersions = async () => {
      if (Platform.OS === 'web' || downloadedPackIds.length === 0) {
        setDownloadedPackVersions({});
        return;
      }

      try {
        const { getDatabase } = await import('../../database');
        const database = getDatabase();
        const packs = await database.get('question_packs').query().fetch();
        const versions: Record<string, string> = {};
        for (const pack of packs) {
          const p = pack as any;
          versions[p.packId] = p.version;
        }
        setDownloadedPackVersions(versions);
      } catch (error) {
        console.error('Error loading downloaded versions:', error);
      }
    };
    loadDownloadedVersions();
  }, [downloadedPackIds]);

  // Show download error alert (D-11)
  // WR-01: Use ref to avoid stale closure in retry handler
  useEffect(() => {
    if (downloadError) {
      const packToRetry = errorPackRef.current;
      Alert.alert(
        'Download Failed',
        `${downloadError}\n\nTap "Retry" to try again.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => {
            clearDownloadError();
            errorPackRef.current = null;
          }},
          { text: 'Retry', onPress: () => {
            if (packToRetry) handleDownload(packToRetry);
          }},
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
    // WR-01: Store pack reference for retry
    errorPackRef.current = pack;
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
    setSelectedPackIds([]);
    router.push('/game/setup');
  };

  const togglePackSelection = (packId: string) => {
    setSelectedPackIds((prev) =>
      prev.includes(packId) ? prev.filter((id) => id !== packId) : [...prev, packId]
    );
  };

  const handlePlaySelected = async () => {
    if (selectedPackIds.length === 1) {
      await selectPack(selectedPackIds[0]);
    } else {
      await selectPackList(selectedPackIds);
    }
    setSelectedPackIds([]);
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

  // Check if pack has update available (D-13, D-14)
  // Uses semver comparison between pack index version and downloaded version
  const checkHasUpdateAvailable = (pack: PackIndexEntry): boolean => {
    // If pack is not downloaded, no update available
    if (!downloadedPackIds.includes(pack.id)) {
      return false;
    }

    // Get downloaded version from loaded versions
    const downloadedVersion = downloadedPackVersions[pack.id];
    if (!downloadedVersion) {
      return false;
    }

    // Use semver comparison (D-14)
    return hasUpdateAvailable(pack.version, downloadedVersion);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background?.val as string }]}>
        <ActivityIndicator size="large" color={theme.color?.val as string} />
      </View>
    );
  }

  const hasSelection = selectedPackIds.length > 0;

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
          bytesWritten={downloadBytesWritten}
          bytesTotal={selectedPack.size}
        />
      )}

      {/* Collapsible filters (D-05, D-06) */}
      <Pressable style={styles.filtersToggle} onPress={toggleFilters}>
        <Text style={[styles.filtersToggleText, { color: theme.color?.val as string }]}>
          Filters {filtersExpanded ? '▲' : '▼'}
        </Text>
      </Pressable>
      {filtersExpanded && (
        <View>
          <CategoryFilter
            enabledCategories={enabledCategories}
            onToggle={handleCategoryToggle}
            onSelectAll={handleSelectAllCategories}
            onClearAll={handleClearAllCategories}
          />
          <DifficultyFilter
            enabledDifficulties={enabledDifficulties}
            onToggle={handleDifficultyToggle}
            onSelectAll={handleSelectAllDifficulties}
            onClearAll={() => setEnabledDifficulties([])}
          />
        </View>
      )}

      {/* Pack list (CONF-01) */}
      <FlatList
        data={availablePacks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isDownloaded = downloadedPackIds.includes(item.id) || Platform.OS === 'web';
          const isSelected = selectedPackIds.includes(item.id);
          return (
            <PackCard
              pack={item}
              isDownloaded={downloadedPackIds.includes(item.id)}
              hasUpdate={checkHasUpdateAvailable(item)}
              isActive={hasSelection ? isSelected : activePackId === item.id}
              onPress={
                isDownloaded
                  ? () => togglePackSelection(item.id)
                  : () => handlePackPress(item)
              }
            />
          );
        }}
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
          selectedPack && !downloadedPackIds.includes(selectedPack.id) && Platform.OS !== 'web'
            ? () => handleDownload(selectedPack)
            : undefined
        }
        onSelect={
          selectedPack && (downloadedPackIds.includes(selectedPack.id) || Platform.OS === 'web')
            ? () => handleSelectPack(selectedPack.id)
            : undefined
        }
      />

      {/* Footer — in layout flow, no absolute positioning */}
      <View style={styles.footer}>
        {hasSelection ? (
          <>
            <Pressable
              style={[styles.playButton, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}
              onPress={handlePlaySelected}
            >
              <Text style={[styles.playButtonText, { color: theme.color?.val as string }]}>
                Play with {selectedPackIds.length} pack{selectedPackIds.length !== 1 ? 's' : ''} →
              </Text>
            </Pressable>
            <Pressable style={styles.clearButton} onPress={() => setSelectedPackIds([])}>
              <Text style={[styles.clearButtonText, { color: theme.color?.val as string }]}>
                Clear selection
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={[styles.footerButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
              onPress={() => router.push('/packs/combos')}
            >
              <Text style={[styles.footerButtonText, { color: theme.color?.val as string }]}>
                Manage Combos
              </Text>
            </Pressable>
            <Pressable
              style={[styles.footerButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
              onPress={() => router.replace('/')}
            >
              <Text style={[styles.footerButtonText, { color: theme.color?.val as string }]}>
                Home
              </Text>
            </Pressable>
          </>
        )}
      </View>
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
  filtersToggle: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 4,
  },
  filtersToggleText: {
    fontSize: 13,
    opacity: 0.55,
    letterSpacing: 0.5,
  },
  list: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.7,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
    gap: 10,
  },
  footerButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  playButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 14,
    opacity: 0.6,
  },
});
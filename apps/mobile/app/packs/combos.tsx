import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'tamagui';
import { usePackStore } from '../../stores/packStore';
import type { PackCombo } from '@trivial-world/types';

/**
 * Combo management screen
 * - Create named combos from 2+ downloaded packs
 * - List and delete saved combos
 * - Only downloaded packs (or all on web) are selectable
 */
export default function CombosScreen() {
  const router = useRouter();
  const theme = useTheme();

  const { savedCombos, availablePacks, downloadedPackIds, createCombo, deleteCombo } = usePackStore();

  const [name, setName] = useState('');
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>([]);

  // Pitfall 4: only downloaded packs can be combined on native
  const selectablePacks = availablePacks.filter(
    (p) => downloadedPackIds.includes(p.id) || Platform.OS === 'web'
  );

  const togglePack = (packId: string) => {
    setSelectedPackIds((prev) =>
      prev.includes(packId) ? prev.filter((id) => id !== packId) : [...prev, packId]
    );
  };

  const isCreateValid = name.trim().length > 0 && selectedPackIds.length >= 2;

  const handleCreateCombo = () => {
    if (!isCreateValid) {
      Alert.alert('Invalid Combo', 'A combo needs a name and at least 2 packs.');
      return;
    }
    createCombo(name.trim(), selectedPackIds);
    setName('');
    setSelectedPackIds([]);
  };

  const handleDeleteCombo = (comboId: string) => {
    Alert.alert(
      'Remove Combo',
      'Are you sure you want to remove this combo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteCombo(comboId),
        },
      ]
    );
  };

  const renderComboItem = ({ item }: { item: PackCombo }) => (
    <View style={styles.comboCard}>
      <View style={styles.comboInfo}>
        <Text style={[styles.comboName, { color: theme.color?.val as string }]}>{item.name}</Text>
        <Text style={[styles.comboDetail, { color: theme.color?.val as string }]}>
          {item.packIds.length} packs
        </Text>
      </View>
      <Pressable onPress={() => handleDeleteCombo(item.id)}>
        <Text style={styles.deleteText}>Remove</Text>
      </Pressable>
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background?.val as string }]}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={[styles.title, { color: theme.color?.val as string }]}>Pack Combos</Text>

      {/* Create form */}
      <TextInput
        style={[styles.input, { color: theme.color?.val as string, borderColor: theme.color?.val as string }]}
        value={name}
        onChangeText={setName}
        placeholder="Combo name"
        placeholderTextColor={(theme.color?.val as string) + '80'}
      />

      {/* Selectable pack list */}
      {selectablePacks.map((pack) => {
        const isSelected = selectedPackIds.includes(pack.id);
        return (
          <Pressable
            key={pack.id}
            style={[styles.packOption, isSelected && styles.packOptionSelected]}
            onPress={() => togglePack(pack.id)}
          >
            <Text style={[{ color: theme.color?.val as string }]}>
              {isSelected ? '✓ ' : '  '}
              {pack.name}
            </Text>
          </Pressable>
        );
      })}

      {selectablePacks.length === 0 && (
        <Text style={[styles.emptyText, { color: theme.color?.val as string }]}>
          Download at least 2 packs to create a combo
        </Text>
      )}

      {/* Create button */}
      <Pressable
        style={[
          styles.createButton,
          { opacity: isCreateValid ? 1 : 0.4, backgroundColor: 'rgba(255, 255, 255, 0.2)' },
        ]}
        onPress={handleCreateCombo}
        disabled={!isCreateValid}
      >
        <Text style={[{ color: theme.color?.val as string, fontWeight: '600', fontSize: 16 }]}>
          Create Combo
        </Text>
      </Pressable>

      {/* Saved combos list */}
      <Text style={[styles.sectionTitle, { color: theme.color?.val as string }]}>Saved Combos</Text>
      <View>
        {savedCombos.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.color?.val as string }]}>No combos yet</Text>
        ) : (
          savedCombos.map((item) => (
            <View key={item.id}>{renderComboItem({ item })}</View>
          ))
        )}
      </View>

      {/* Back button */}
      <Pressable
        style={[styles.backButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
        onPress={() => router.back()}
      >
        <Text style={[styles.backButtonText, { color: theme.color?.val as string }]}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  packOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  packOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  createButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  comboCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  comboInfo: {
    flex: 1,
  },
  comboName: {
    fontSize: 16,
    fontWeight: '500',
  },
  comboDetail: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 2,
  },
  deleteText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '500',
    paddingLeft: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.6,
    marginVertical: 12,
  },
  backButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

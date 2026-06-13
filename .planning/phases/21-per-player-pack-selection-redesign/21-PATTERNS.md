# Phase 21: Per-Player Pack Selection Redesign - Pattern Map

**Mapped:** 2026-06-13
**Files analyzed:** 2
**Analogs found:** 2 / 2

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/mobile/app/game/setup.tsx` | screen/component | request-response + event-driven | `apps/mobile/app/game/setup.tsx` (self — partial rewrite of Row 2 chip logic) | exact (self) |
| `apps/mobile/app/packs/index.tsx` | screen/component | CRUD + request-response | `apps/mobile/app/packs/combos.tsx` (conditional mode pattern), `apps/mobile/app/packs/index.tsx` (self — additive mode branch) | exact (self) |

---

## Pattern Assignments

### `apps/mobile/app/game/setup.tsx` (screen, event-driven)

**Analog:** Self — the file being modified. All patterns below are extracted from the current implementation at lines 1-528.

---

#### Imports pattern (lines 1-12) — DELETE `Alert`, `Modal`, `TouchableWithoutFeedback` from import list; keep the rest

```typescript
import { useState, useEffect } from 'react';
import { Platform, View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'tamagui';
import { usePlayerStore } from '../../stores/playerStore';
import { useGameStore } from '../../stores/gameStore';
import { usePackStore } from '../../stores/packStore';
import { AddPlayerButton } from '../../components/AddPlayerButton';
import { CATEGORY_COLORS } from '../../constants/categories';
import type { PlayerColor } from '../../constants/categories';
import type { QuestionPackModel } from '../../database/models';
import { SEMANTIC_COLORS } from '../../constants/theme';
```

After Phase 21 the import line changes to:
```typescript
import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
// ... rest unchanged
```

`Platform`, `Modal`, `TouchableWithoutFeedback` are removed because the web picker Modal and all Alert/Modal pickers for packs/difficulty are gone. `Alert` is retained — it is still used in `handleStartGame` (lines 152-167).

---

#### Store destructure pattern (lines 27-28) — remove `updatePlayerDifficulty`

Current (line 27):
```typescript
const { players, addPlayer, removePlayer, updatePlayerName, updatePlayerPack, updatePlayerCombo, updatePlayerDifficulty } = usePlayerStore();
```

After Phase 21:
```typescript
const { players, addPlayer, removePlayer, updatePlayerName, updatePlayerPack, updatePlayerCombo } = usePlayerStore();
```

`updatePlayerDifficulty` is removed because the difficulty chip is removed.

---

#### State cleanup — remove `webPicker` state (lines 40-43)

Delete entirely:
```typescript
const [webPicker, setWebPicker] = useState<{
  title: string;
  options: { label: string; onPress: () => void }[];
} | null>(null);
```

No replacement — the `webPicker` state only powered the now-removed Modal.

---

#### allPlayersCustom pattern (lines 36-38) — UNCHANGED, copy as-is

```typescript
const allPlayersCustom =
  players.length > 0 &&
  players.every((p) => p.packId !== null || p.comboId !== null);
```

Do not touch this. It powers Start Game button enable/disable and CONF-01 bypass.

---

#### New handler: handleCustomPack (replaces handlePickSource, lines 100-129)

Remove `handlePickSource` entirely. Add:

```typescript
const handleCustomPack = (playerId: string) => {
  router.push({ pathname: '/packs', params: { targetPlayerId: playerId } });
};
```

Pattern source: Expo Router `router.push` with params — verified pattern from docs and codebase. Use `router.push` (not `replace`) so that `router.back()` in `/packs` reliably returns to setup.

---

#### New handler: handleRevertToShared (replaces part of handlePickSource)

```typescript
const handleRevertToShared = (playerId: string) => {
  updatePlayerPack(playerId, null);
  updatePlayerCombo(playerId, null);
};
```

**Critical:** Must call BOTH `updatePlayerPack(id, null)` AND `updatePlayerCombo(id, null)`.
Calling only `updatePlayerPack(id, null)` does NOT clear `comboId` — see playerStore line 80:
```typescript
comboId: packId !== null ? null : p.comboId
// When packId IS null, comboId is left unchanged.
```

---

#### Remove handler: handlePickDifficulty (lines 131-147)

Delete entirely. The difficulty chip is removed from the player row (Decision A1).

---

#### Per-player row chip logic (lines 216-280) — Row 2 replacement

**Current Row 2 (to be replaced):**
```typescript
{/* Row 2: per-player pack chip + difficulty chip (always visible) */}
<View style={styles.packChipRow}>
  <Pressable
    style={[
      styles.packChip,
      displayName ? styles.packChipActive : styles.packChipDefault,
    ]}
    onPress={() => handlePickSource(player.id)}
  >
    <Text style={styles.packChipText} numberOfLines={1}>
      {chipLabel}
    </Text>
  </Pressable>
  <Pressable
    style={[
      styles.packChip,
      player.difficultyPreference ? styles.packChipActive : styles.packChipDefault,
    ]}
    onPress={() => handlePickDifficulty(player.id)}
  >
    <Text style={styles.packChipText} numberOfLines={1}>
      {difficultyLabel}
    </Text>
  </Pressable>
</View>
```

**New Row 2 (single Shared/Custom toggle chip):**

First update the per-player derived values computed inside the map (lines 217-229). Replace `chipLabel` and remove `difficultyLabel`:
```typescript
const playerComboName = player.comboId
  ? (savedCombos.find(c => c.id === player.comboId)?.name ?? 'Custom Combo')
  : null;
const playerPackName = !playerComboName && player.packId
  ? (availablePacks.find(p => p.id === player.packId)?.name ?? 'Custom Pack')
  : null;
const displayName = playerComboName ?? playerPackName;
const isCustom = player.packId !== null || player.comboId !== null;
const chipLabel = isCustom
  ? (displayName
      ? `Custom: ${displayName.length > 12 ? displayName.slice(0, 12) + '…' : displayName}`
      : 'Custom')
  : 'Shared';
// difficultyLabel — REMOVED (difficulty chip removed in Phase 21)
```

Then the JSX:
```typescript
{/* Row 2: Shared/Custom toggle chip */}
<View style={styles.packChipRow}>
  <Pressable
    style={[
      styles.packChip,
      isCustom ? styles.packChipActive : styles.packChipDefault,
    ]}
    onPress={() => isCustom
      ? handleRevertToShared(player.id)
      : handleCustomPack(player.id)
    }
  >
    <Text style={styles.packChipText} numberOfLines={1}>
      {chipLabel}
    </Text>
  </Pressable>
</View>
```

Style keys used: `packChipRow`, `packChip`, `packChipActive`, `packChipDefault`, `packChipText` — all present in the existing StyleSheet (lines 441-461). No new styles required.

---

#### Remove: web picker Modal JSX (lines 329-362)

Delete entirely:
```typescript
{/* Web picker modal — replaces Alert.alert for source/difficulty selection */}
{Platform.OS === 'web' && webPicker && (
  <Modal transparent visible onRequestClose={() => setWebPicker(null)}>
    ...
  </Modal>
)}
```

---

#### Remove: web picker StyleSheet keys (lines 491-527)

Delete these 7 keys from the StyleSheet:
```typescript
webPickerBackdrop: { ... },
webPickerCard: { ... },
webPickerTitle: { ... },
webPickerDivider: { ... },
webPickerItem: { ... },
webPickerItemPressed: { ... },
webPickerItemText: { ... },
```

---

### `apps/mobile/app/packs/index.tsx` (screen/component, CRUD + request-response)

**Primary analog:** Self — additive changes only. The existing game-level behavior is preserved behind an `if (!targetPlayerId)` guard. All patterns below are from the current file (lines 1-422).

---

#### New import: useLocalSearchParams + usePlayerStore (add to line 3)

```typescript
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePlayerStore } from '../../stores/playerStore';
```

`useLocalSearchParams` is the standard Expo Router hook for reading URL query params. It returns string values — `targetPlayerId` will be `undefined` when absent or a player ID string when present. Typed generic form:
```typescript
const { targetPlayerId } = useLocalSearchParams<{ targetPlayerId?: string }>();
```

---

#### New: read targetPlayerId param and player name (add near top of component, after existing state)

```typescript
const { targetPlayerId } = useLocalSearchParams<{ targetPlayerId?: string }>();
const players = usePlayerStore((state) => state.players);
const { updatePlayerPack, updatePlayerCombo } = usePlayerStore();

// Per-player mode: look up player name for title
const targetPlayer = targetPlayerId
  ? players.find(p => p.id === targetPlayerId) ?? null
  : null;
```

---

#### savedCombos from packStore — already available, just access it

```typescript
// Already destructured from usePackStore() at lines 26-45:
// savedCombos is not currently destructured — add it:
const {
  availablePacks,
  downloadedPackIds,
  activePackId,
  // ... existing fields ...
  savedCombos,   // ADD THIS
  selectPack,
  selectPackList,
  // ...
} = usePackStore();
```

---

#### Modified handler: handleSelectPack — add per-player branch (current lines 139-144)

**Current:**
```typescript
const handleSelectPack = async (packId: string) => {
  await selectPack(packId);
  setModalVisible(false);
  setSelectedPackIds([]);
  router.push('/game/setup');
};
```

**Phase 21 replacement:**
```typescript
const handleSelectPack = async (packId: string) => {
  if (targetPlayerId) {
    updatePlayerPack(targetPlayerId, packId);
    setModalVisible(false);
    router.back();
  } else {
    await selectPack(packId);
    setModalVisible(false);
    setSelectedPackIds([]);
    router.push('/game/setup');
  }
};
```

The `PackDetailsModal` `onSelect` callback already calls `handleSelectPack(selectedPack.id)` (line 306), so it naturally follows the same conditional.

---

#### New handler: handleSelectComboForPlayer

```typescript
const handleSelectComboForPlayer = (comboId: string) => {
  if (targetPlayerId) {
    updatePlayerCombo(targetPlayerId, comboId);
    router.back();
  }
};
```

---

#### Modified handler: handlePlaySelected — guard for per-player mode (current lines 152-160)

**Current:**
```typescript
const handlePlaySelected = async () => {
  if (selectedPackIds.length === 1) {
    await selectPack(selectedPackIds[0]);
  } else {
    await selectPackList(selectedPackIds);
  }
  setSelectedPackIds([]);
  router.push('/game/setup');
};
```

This handler is NOT called in per-player mode (the multi-pack footer is hidden). No change needed to the handler body — the footer visibility guard (see below) prevents it from being invoked.

---

#### Dynamic title — conditional on targetPlayerId

**Current title JSX (lines 227-229):**
```typescript
<Text style={[styles.title, { color: theme.color?.val as string }]}>
  Select Question Pack
</Text>
```

**Phase 21 replacement:**
```typescript
<Text style={[styles.title, { color: theme.color?.val as string }]}>
  {targetPlayer ? `Select Pack for ${targetPlayer.name}` : 'Select Question Pack'}
</Text>
```

---

#### FlatList pack tap behavior — already handled by handleSelectPack branch

The `onPress` for downloaded packs currently calls `togglePackSelection(item.id)` (line 279). In per-player mode, multi-selection is disabled. Replace the tap handler logic:

**Current (line 277-281):**
```typescript
onPress={
  isDownloaded
    ? () => togglePackSelection(item.id)
    : () => handlePackPress(item)
}
```

**Phase 21 replacement:**
```typescript
onPress={
  isDownloaded
    ? targetPlayerId
      ? () => handleSelectPack(item.id)
      : () => togglePackSelection(item.id)
    : () => handlePackPress(item)
}
```

In per-player mode, tapping a downloaded pack immediately selects it for the player and calls `router.back()`.

The `isActive` prop on `PackCard` also needs a guard:
```typescript
isActive={hasSelection ? isSelected : activePackId === item.id}
```
In per-player mode `hasSelection` is always false (multi-select is hidden), so the `isActive` highlighting falls back to `activePackId === item.id` which is fine (it shows the game-level active pack as a reference — low visual noise, no behavioral impact).

---

#### New section: Saved Combos in per-player mode (add above footer)

When `targetPlayerId` is set and `savedCombos.length > 0`, render a selectable combos list below the FlatList. Pattern derived from `combos.tsx` FlatList and the existing `footerButton` / `footerButtonText` styles.

```typescript
{targetPlayerId && savedCombos.length > 0 && (
  <View style={styles.comboSection}>
    <Text style={[styles.comboSectionHeader, { color: theme.color?.val as string }]}>
      Saved Combos
    </Text>
    {savedCombos.map((combo) => (
      <Pressable
        key={combo.id}
        style={[styles.footerButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
        onPress={() => handleSelectComboForPlayer(combo.id)}
      >
        <Text style={[styles.footerButtonText, { color: theme.color?.val as string }]}>
          {combo.name}
        </Text>
      </Pressable>
    ))}
  </View>
)}
```

New style keys to add:
```typescript
comboSection: {
  paddingHorizontal: 20,
  paddingTop: 8,
  paddingBottom: 4,
  gap: 8,
},
comboSectionHeader: {
  fontSize: 13,
  fontWeight: '600',
  opacity: 0.55,
  letterSpacing: 0.5,
},
```

Pattern source: `filtersToggleText` (lines 375-378) for the section header style; `footerButton`/`footerButtonText` (lines 397-403) for combo row style — both already in the file StyleSheet.

---

#### Modified footer: per-player mode shows Back button only (current lines 312-349)

**Current footer JSX (lines 312-349):**
```typescript
<View style={styles.footer}>
  {hasSelection ? (
    <>
      <Pressable style={[styles.playButton, ...]} onPress={handlePlaySelected}>...</Pressable>
      <Pressable style={styles.clearButton} onPress={() => setSelectedPackIds([])}>...</Pressable>
    </>
  ) : (
    <>
      <Pressable style={[styles.footerButton, ...]} onPress={() => router.push('/packs/combos')}>
        Manage Combos
      </Pressable>
      <Pressable style={[styles.footerButton, ...]} onPress={() => router.replace('/')}>
        Home
      </Pressable>
    </>
  )}
</View>
```

**Phase 21 replacement:**
```typescript
<View style={styles.footer}>
  {targetPlayerId ? (
    <Pressable
      style={[styles.footerButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
      onPress={() => router.back()}
    >
      <Text style={[styles.footerButtonText, { color: theme.color?.val as string }]}>
        Back
      </Text>
    </Pressable>
  ) : hasSelection ? (
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
```

The `footerButton` and `footerButtonText` styles (lines 397-403) are reused unchanged.

---

## Shared Patterns

### Router navigation push vs. back

**Source:** `apps/mobile/app/game/setup.tsx` lines 173-175 and `apps/mobile/app/packs/index.tsx` lines 142-143

- `setup.tsx` uses `router.replace('/game/turn')` for one-way navigation (no back expected)
- `packs/index.tsx` uses `router.push('/game/setup')` for game-level pack selection return
- **Phase 21 new pattern:** `setup.tsx` uses `router.push('/packs', { params })` so that `router.back()` in `/packs` reliably returns to setup (push adds to stack; replace would remove setup from stack)

```typescript
// setup.tsx — navigate to packs for a specific player
router.push({ pathname: '/packs', params: { targetPlayerId: playerId } });

// packs/index.tsx — return to caller (setup or wherever)
router.back();
```

### Zustand reactive state update (result passing between screens)

**Source:** `apps/mobile/stores/playerStore.ts` lines 78-88

There is no return-value mechanism in Expo Router. The established pattern is: write to Zustand on the destination screen, then navigate back. The calling screen reads Zustand state reactively and re-renders automatically.

```typescript
// In /packs/index.tsx — write to playerStore, then go back
updatePlayerPack(targetPlayerId, packId);
router.back();
// setup.tsx sees player.packId updated on next render cycle
```

### Conditional behavior via URL param

**Source:** No existing `useLocalSearchParams` usage in source files (only in compiled dist). Pattern is from Expo Router docs — verified.

```typescript
import { useLocalSearchParams } from 'expo-router';

// Read param — undefined when absent, string when present
const { targetPlayerId } = useLocalSearchParams<{ targetPlayerId?: string }>();

// Guard all per-player code paths
if (targetPlayerId) {
  // per-player mode
} else {
  // game-level mode (existing behavior — unchanged)
}
```

Default to game-level (falsy `targetPlayerId`) so existing tests that render `/packs` without params continue to work.

### Pressable chip style toggle (active vs. default)

**Source:** `apps/mobile/app/game/setup.tsx` lines 258-267 and StyleSheet lines 452-461

```typescript
// Conditional style based on boolean state — exact pattern to reuse for Shared/Custom toggle
<Pressable
  style={[
    styles.packChip,
    isCustom ? styles.packChipActive : styles.packChipDefault,
  ]}
  onPress={...}
>
  <Text style={styles.packChipText} numberOfLines={1}>{chipLabel}</Text>
</Pressable>

// StyleSheet (existing — no changes needed):
packChip: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 6,
},
packChipDefault: {
  backgroundColor: 'rgba(255,255,255,0.12)',
},
packChipActive: {
  backgroundColor: 'rgba(255,255,255,0.28)',
},
packChipText: {
  fontSize: 11,
  color: '#ccc',
},
```

### playerStore mutual exclusion

**Source:** `apps/mobile/stores/playerStore.ts` lines 78-88

```typescript
// updatePlayerPack clears comboId ONLY when packId is non-null:
updatePlayerPack: (id, packId) => set((state) => ({
  players: state.players.map(p =>
    p.id === id ? { ...p, packId, comboId: packId !== null ? null : p.comboId } : p
  ),
})),

// updatePlayerCombo clears packId ONLY when comboId is non-null:
updatePlayerCombo: (id, comboId) => set((state) => ({
  players: state.players.map(p =>
    p.id === id ? { ...p, comboId, packId: comboId !== null ? null : p.packId } : p
  ),
})),
```

Revert-to-Shared requires BOTH calls because `updatePlayerPack(id, null)` leaves `comboId` intact:
```typescript
updatePlayerPack(playerId, null);   // clears packId, leaves comboId unchanged
updatePlayerCombo(playerId, null);  // clears comboId
```

---

## No Analog Found

None — both files have strong self-analogs and the patterns are fully derivable from the existing codebase.

---

## Metadata

**Analog search scope:** `apps/mobile/app/game/`, `apps/mobile/app/packs/`, `apps/mobile/stores/`
**Files scanned:** 5 (setup.tsx, packs/index.tsx, packs/combos.tsx, playerStore.ts, packStore.ts)
**Pattern extraction date:** 2026-06-13

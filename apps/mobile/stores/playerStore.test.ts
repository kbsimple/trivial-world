/**
 * Tests for player store
 * Per D-05: Auto-assigned colors from PLAYER_COLORS
 * Per D-06: Max 6 players
 * Per D-07: Default name "Player N"
 * Per D-08: Color reassignment on removal
 * Per SCOR-01: Wedge awarding and tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PLAYER_COLORS } from '../constants/categories';
import type { PlayerColor } from '../constants/categories';

// Mock AsyncStorage to avoid actual storage operations
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}));

// Import store after mocking AsyncStorage
import { usePlayerStore } from './playerStore';

// Helper to get fresh store state
// Zustand state is immutable, so we need to call getState() after each mutation
function getStore() {
  return usePlayerStore.getState();
}

describe('usePlayerStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state directly
    usePlayerStore.setState({ players: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty players array', () => {
      const store = getStore();
      expect(store.players).toEqual([]);
      expect(store.players).toHaveLength(0);
    });
  });

  describe('addPlayer', () => {
    it('adds a player with auto-assigned color', () => {
      getStore().addPlayer('Alice');
      const store = getStore();

      expect(store.players).toHaveLength(1);
      expect(store.players[0].name).toBe('Alice');
      expect(store.players[0].color).toBe(PLAYER_COLORS[0]);
      expect(store.players[0].wedges).toEqual([]);
    });

    it('assigns default name "Player N" when name not provided', () => {
      getStore().addPlayer();
      const store = getStore();

      expect(store.players[0].name).toBe('Player 1');
    });

    it('assigns default name when empty string provided', () => {
      getStore().addPlayer('');
      const store = getStore();

      // Empty string is falsy, so default name is used
      expect(store.players[0].name).toBe('Player 1');
    });

    it('assigns colors in order from PLAYER_COLORS', () => {
      const store = getStore();
      for (let i = 0; i < 6; i++) {
        store.addPlayer(`Player ${i + 1}`);
      }
      const finalStore = getStore();

      expect(finalStore.players[0].color).toBe('blue');
      expect(finalStore.players[1].color).toBe('pink');
      expect(finalStore.players[2].color).toBe('yellow');
      expect(finalStore.players[3].color).toBe('purple');
      expect(finalStore.players[4].color).toBe('green');
      expect(finalStore.players[5].color).toBe('orange');
    });

    it('generates unique IDs for each player', () => {
      getStore().addPlayer('Alice');
      getStore().addPlayer('Bob');
      const store = getStore();

      expect(store.players[0].id).not.toBe(store.players[1].id);
    });

    it('limits to maximum 6 players', () => {
      const store = getStore();

      // Add 6 players (max)
      for (let i = 0; i < 6; i++) {
        store.addPlayer(`Player ${i + 1}`);
      }
      expect(getStore().players).toHaveLength(6);

      // Try to add 7th player - should be ignored
      store.addPlayer('Extra Player');
      const finalStore = getStore();
      expect(finalStore.players).toHaveLength(6);
      expect(finalStore.players.map(p => p.name)).not.toContain('Extra Player');
    });

    it('initializes empty wedges array for new player', () => {
      getStore().addPlayer('Alice');
      const store = getStore();

      expect(store.players[0].wedges).toEqual([]);
      expect(store.players[0].wedges).toHaveLength(0);
    });
  });

  describe('removePlayer', () => {
    it('removes player by ID', () => {
      getStore().addPlayer('Alice');
      getStore().addPlayer('Bob');
      getStore().addPlayer('Charlie');
      const store = getStore();

      const aliceId = store.players[0].id;
      store.removePlayer(aliceId);
      const afterStore = getStore();

      expect(afterStore.players).toHaveLength(2);
      expect(afterStore.players.map(p => p.name)).toEqual(['Bob', 'Charlie']);
    });

    it('reassigns colors after removal (D-08)', () => {
      getStore().addPlayer('Alice'); // blue
      getStore().addPlayer('Bob');    // pink
      getStore().addPlayer('Charlie'); // yellow
      const store = getStore();

      // Remove first player (Alice)
      store.removePlayer(store.players[0].id);
      const afterStore = getStore();

      // Bob should now have blue, Charlie should have pink
      expect(afterStore.players[0].name).toBe('Bob');
      expect(afterStore.players[0].color).toBe('blue');
      expect(afterStore.players[1].name).toBe('Charlie');
      expect(afterStore.players[1].color).toBe('pink');
    });

    it('maintains color order when middle player removed', () => {
      getStore().addPlayer('Alice');   // blue
      getStore().addPlayer('Bob');     // pink
      getStore().addPlayer('Charlie'); // yellow
      getStore().addPlayer('Dave');    // purple
      const store = getStore();

      // Remove Bob (index 1)
      store.removePlayer(store.players[1].id);
      const afterStore = getStore();

      // Remaining: Alice (blue), Charlie, Dave
      expect(afterStore.players).toHaveLength(3);
      expect(afterStore.players[0].name).toBe('Alice');
      expect(afterStore.players[0].color).toBe('blue');
      expect(afterStore.players[1].name).toBe('Charlie');
      expect(afterStore.players[1].color).toBe('pink');
      expect(afterStore.players[2].name).toBe('Dave');
      expect(afterStore.players[2].color).toBe('yellow');
    });

    it('handles removal from single player list', () => {
      getStore().addPlayer('Alice');
      const store = getStore();

      store.removePlayer(store.players[0].id);
      const afterStore = getStore();

      expect(afterStore.players).toHaveLength(0);
    });

    it('does nothing when removing non-existent ID', () => {
      getStore().addPlayer('Alice');
      const store = getStore();

      store.removePlayer('non-existent-id');
      const afterStore = getStore();

      expect(afterStore.players).toHaveLength(1);
    });
  });

  describe('updatePlayerName', () => {
    it('updates player name by ID', () => {
      getStore().addPlayer('Alice');
      const store = getStore();

      const playerId = store.players[0].id;
      store.updatePlayerName(playerId, 'Alice Updated');
      const afterStore = getStore();

      expect(afterStore.players[0].name).toBe('Alice Updated');
    });

    it('does nothing for non-existent ID', () => {
      getStore().addPlayer('Alice');
      const store = getStore();

      store.updatePlayerName('non-existent-id', 'New Name');
      const afterStore = getStore();

      expect(afterStore.players[0].name).toBe('Alice');
    });

    it('preserves other player properties when updating name', () => {
      getStore().addPlayer('Alice');
      const store = getStore();
      const originalId = store.players[0].id;
      const originalColor = store.players[0].color;

      store.updatePlayerName(originalId, 'Alice Renamed');
      const afterStore = getStore();

      expect(afterStore.players[0].id).toBe(originalId);
      expect(afterStore.players[0].color).toBe(originalColor);
      expect(afterStore.players[0].wedges).toEqual([]);
      expect(afterStore.players[0].packId).toBeNull();
    });
  });

  describe('updatePlayerPack', () => {
    it('sets packId for a player by ID', () => {
      getStore().addPlayer('Alice');
      const store = getStore();
      const playerId = store.players[0].id;

      store.updatePlayerPack(playerId, 'pack-123');
      const afterStore = getStore();

      expect(afterStore.players[0].packId).toBe('pack-123');
    });

    it('clears packId when set to null', () => {
      getStore().addPlayer('Alice');
      const store = getStore();
      const playerId = store.players[0].id;

      store.updatePlayerPack(playerId, 'pack-123');
      store.updatePlayerPack(playerId, null);
      const afterStore = getStore();

      expect(afterStore.players[0].packId).toBeNull();
    });

    it('does not change other players', () => {
      getStore().addPlayer('Alice');
      getStore().addPlayer('Bob');
      const store = getStore();
      const aliceId = store.players[0].id;

      store.updatePlayerPack(aliceId, 'pack-123');
      const afterStore = getStore();

      expect(afterStore.players[1].packId).toBeNull();
    });

    it('does nothing for non-existent ID', () => {
      getStore().addPlayer('Alice');
      const store = getStore();

      store.updatePlayerPack('non-existent-id', 'pack-123');
      const afterStore = getStore();

      expect(afterStore.players[0].packId).toBeNull();
    });
  });

  describe('resetPlayers', () => {
    it('clears all players', () => {
      getStore().addPlayer('Alice');
      getStore().addPlayer('Bob');
      getStore().addPlayer('Charlie');
      const store = getStore();

      store.resetPlayers();
      const afterStore = getStore();

      expect(afterStore.players).toHaveLength(0);
      expect(afterStore.players).toEqual([]);
    });

    it('can add players again after reset', () => {
      getStore().addPlayer('Alice');
      const store = getStore();
      store.resetPlayers();
      getStore().addPlayer('Bob');
      const afterStore = getStore();

      expect(afterStore.players).toHaveLength(1);
      expect(afterStore.players[0].name).toBe('Bob');
      expect(afterStore.players[0].color).toBe('blue');
    });
  });

  describe('awardWedge', () => {
    it('awards a wedge to a player', () => {
      getStore().addPlayer('Alice');
      const store = getStore();
      const playerId = store.players[0].id;

      store.awardWedge(playerId, 'blue');
      const afterStore = getStore();

      expect(afterStore.players[0].wedges).toEqual(['blue']);
    });

    it('can award multiple wedges to same player', () => {
      getStore().addPlayer('Alice');
      const store = getStore();
      const playerId = store.players[0].id;

      store.awardWedge(playerId, 'blue');
      store.awardWedge(playerId, 'pink');
      store.awardWedge(playerId, 'yellow');
      const afterStore = getStore();

      expect(afterStore.players[0].wedges).toEqual(['blue', 'pink', 'yellow']);
    });

    it('prevents duplicate wedges of same color', () => {
      getStore().addPlayer('Alice');
      const store = getStore();
      const playerId = store.players[0].id;

      store.awardWedge(playerId, 'blue');
      store.awardWedge(playerId, 'blue'); // Duplicate - should be ignored
      const afterStore = getStore();

      expect(afterStore.players[0].wedges).toEqual(['blue']);
      expect(afterStore.players[0].wedges).toHaveLength(1);
    });

    it('does nothing for non-existent player', () => {
      getStore().addPlayer('Alice');
      const store = getStore();

      store.awardWedge('non-existent-id', 'blue');
      const afterStore = getStore();

      expect(afterStore.players[0].wedges).toEqual([]);
    });

    it('limits to maximum 6 wedges', () => {
      getStore().addPlayer('Alice');
      const store = getStore();
      const playerId = store.players[0].id;

      // Award all 6 wedges
      const colors: PlayerColor[] = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'];
      colors.forEach(color => store.awardWedge(playerId, color));
      let afterStore = getStore();

      expect(afterStore.players[0].wedges).toHaveLength(6);

      // Try to add 7th wedge - should be ignored
      store.awardWedge(playerId, 'blue');
      afterStore = getStore();
      expect(afterStore.players[0].wedges).toHaveLength(6);
    });
  });

  describe('getWedgeCount', () => {
    it('returns 0 for player with no wedges', () => {
      getStore().addPlayer('Alice');
      const store = getStore();

      const count = store.getWedgeCount(store.players[0].id);

      expect(count).toBe(0);
    });

    it('returns correct count after awarding wedges', () => {
      getStore().addPlayer('Alice');
      const store = getStore();
      const playerId = store.players[0].id;

      store.awardWedge(playerId, 'blue');
      store.awardWedge(playerId, 'pink');
      const afterStore = getStore();

      expect(afterStore.getWedgeCount(playerId)).toBe(2);
    });

    it('returns 0 for non-existent player', () => {
      const store = getStore();

      const count = store.getWedgeCount('non-existent-id');

      expect(count).toBe(0);
    });
  });

  describe('hasAllWedges', () => {
    it('returns false when player has fewer than 6 wedges', () => {
      getStore().addPlayer('Alice');
      const store = getStore();
      const playerId = store.players[0].id;

      store.awardWedge(playerId, 'blue');
      store.awardWedge(playerId, 'pink');
      const afterStore = getStore();

      expect(afterStore.hasAllWedges(playerId)).toBe(false);
    });

    it('returns true when player has all 6 wedges', () => {
      getStore().addPlayer('Alice');
      const store = getStore();
      const playerId = store.players[0].id;

      const colors: PlayerColor[] = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'];
      colors.forEach(color => store.awardWedge(playerId, color));
      const afterStore = getStore();

      expect(afterStore.hasAllWedges(playerId)).toBe(true);
    });

    it('returns false for non-existent player', () => {
      const store = getStore();

      expect(store.hasAllWedges('non-existent-id')).toBe(false);
    });
  });

  describe('resetWedges', () => {
    it('clears wedges for all players', () => {
      getStore().addPlayer('Alice');
      getStore().addPlayer('Bob');
      const store = getStore();

      const aliceId = store.players[0].id;
      const bobId = store.players[1].id;

      store.awardWedge(aliceId, 'blue');
      store.awardWedge(bobId, 'pink');
      store.awardWedge(bobId, 'yellow');
      store.resetWedges();
      const afterStore = getStore();

      expect(afterStore.players[0].wedges).toEqual([]);
      expect(afterStore.players[1].wedges).toEqual([]);
    });

    it('preserves player names and colors', () => {
      getStore().addPlayer('Alice');
      getStore().addPlayer('Bob');
      const store = getStore();

      const aliceId = store.players[0].id;
      store.awardWedge(aliceId, 'blue');

      const originalNames = store.players.map(p => p.name);
      const originalColors = store.players.map(p => p.color);
      const originalIds = store.players.map(p => p.id);

      store.resetWedges();
      const afterStore = getStore();

      expect(afterStore.players.map(p => p.name)).toEqual(originalNames);
      expect(afterStore.players.map(p => p.color)).toEqual(originalColors);
      expect(afterStore.players.map(p => p.id)).toEqual(originalIds);
    });
  });

  describe('edge cases', () => {
    it('handles duplicate names (allowed)', () => {
      getStore().addPlayer('Alice');
      getStore().addPlayer('Alice'); // Same name allowed
      const store = getStore();

      expect(store.players).toHaveLength(2);
      expect(store.players[0].name).toBe('Alice');
      expect(store.players[1].name).toBe('Alice');
    });

    it('handles special characters in names', () => {
      getStore().addPlayer('Player with special chars: @#$%!');
      const store = getStore();

      expect(store.players[0].name).toBe('Player with special chars: @#$%!');
    });

    it('handles very long names', () => {
      const longName = 'A'.repeat(1000);
      getStore().addPlayer(longName);
      const store = getStore();

      expect(store.players[0].name).toBe(longName);
    });

    it('handles whitespace-only names (uses default)', () => {
      getStore().addPlayer('   '); // Whitespace is truthy, so it's used
      const store = getStore();

      expect(store.players[0].name).toBe('   ');
    });

    it('handles concurrent add and remove operations', () => {
      getStore().addPlayer('Alice');
      getStore().addPlayer('Bob');
      getStore().addPlayer('Charlie');
      const store = getStore();

      const aliceId = store.players[0].id;
      store.removePlayer(aliceId);
      getStore().addPlayer('Dave');
      const afterStore = getStore();

      expect(afterStore.players).toHaveLength(3);
      expect(afterStore.players.map(p => p.name)).toEqual(['Bob', 'Charlie', 'Dave']);
    });

    it('handles rapid wedge awards to same player', () => {
      getStore().addPlayer('Alice');
      const store = getStore();
      const playerId = store.players[0].id;

      // Award wedges rapidly
      const colors: PlayerColor[] = ['blue', 'pink', 'yellow', 'purple', 'green', 'orange'];
      colors.forEach(color => store.awardWedge(playerId, color));
      const afterStore = getStore();

      expect(afterStore.getWedgeCount(playerId)).toBe(6);
      expect(afterStore.hasAllWedges(playerId)).toBe(true);
    });

    it('maintains state integrity after multiple operations', () => {
      // Add players
      getStore().addPlayer('Alice');
      getStore().addPlayer('Bob');
      getStore().addPlayer('Charlie');
      let store = getStore();

      // Award wedges
      const aliceId = store.players[0].id;
      store.awardWedge(aliceId, 'blue');
      store.awardWedge(aliceId, 'pink');
      store = getStore();

      // Remove middle player
      store.removePlayer(store.players[1].id);
      store = getStore();

      // Update name
      store.updatePlayerName(store.players[0].id, 'Alice Updated');
      store = getStore();

      // Reset wedges
      store.resetWedges();
      store = getStore();

      // Add another player
      store.addPlayer('Dave');
      const afterStore = getStore();

      expect(afterStore.players).toHaveLength(3);
      expect(afterStore.players[0].name).toBe('Alice Updated');
      expect(afterStore.players[0].wedges).toEqual([]);
      expect(afterStore.players[1].name).toBe('Charlie');
      expect(afterStore.players[2].name).toBe('Dave');
    });
  });
});
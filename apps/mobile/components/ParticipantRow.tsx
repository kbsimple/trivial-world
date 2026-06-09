import { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from 'tamagui';
import { CATEGORY_COLORS } from '../constants/categories';
import type { PlayerColor } from '../constants/categories';
import type { Player } from '../types/player';

interface ParticipantRowProps {
  player: Player;
  onRemove: (id: string) => void;
  onNameChange: (id: string, name: string) => void;
}

/**
 * Participant row component
 * - Displays player color indicator and name
 * - Swipe left to remove (D-08)
 * - Inline name editing (D-04)
 */
export function ParticipantRow({ player, onRemove, onNameChange }: ParticipantRowProps) {
  const theme = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;

  // Swipe gesture for removal (D-08)
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.setValue(e.translationX);
    })
    .onEnd((e) => {
      if (e.translationX < -100) {
        // Swipe threshold reached - remove player
        onRemove(player.id);
      } else {
        // Spring back to original position
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, { transform: [{ translateX }] }]}>
        {/* Color indicator */}
        <View
          style={[
            styles.colorIndicator,
            { backgroundColor: CATEGORY_COLORS[player.color as PlayerColor] },
          ]}
        />

        {/* Player name */}
        <View style={styles.nameContainer}>
          <Text
            style={[styles.name, { color: theme.color?.val as string }]}
            onPress={() => {
              // Name editing handled by parent TextInput
            }}
          >
            {player.name}
          </Text>
        </View>

        {/* Swipe hint */}
        <Text style={[styles.hint, { color: theme.color?.val as string, opacity: 0.5 }]}>
          ← Swipe to remove
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
  },
  colorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
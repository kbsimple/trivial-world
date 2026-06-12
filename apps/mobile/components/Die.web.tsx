import { View, Pressable, StyleSheet } from 'react-native';
import { DieFace } from './DieFace';
import { impactAsync } from '../utils/haptics';
import { ImpactFeedbackStyle } from 'expo-haptics';

interface DieProps {
  result: number | null;
  onRoll: () => number | void;
  isRolling?: boolean;
}

/**
 * Die - Web implementation without react-native-reanimated / gesture-handler.
 * Identical UI and semantics, using Pressable + opacity for visual feedback.
 */
export function Die({ result, onRoll, isRolling = false }: DieProps) {
  const handlePress = () => {
    if (isRolling) return;
    impactAsync(ImpactFeedbackStyle.Medium);
    onRoll();
  };

  const displayValue = result ?? 1;

  return (
    <Pressable
      onPress={handlePress}
      testID="die"
      style={({ pressed }) => [
        styles.container,
        { opacity: pressed || isRolling ? 0.7 : 1 },
      ]}
    >
      <View>
        <DieFace value={displayValue} size={140} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

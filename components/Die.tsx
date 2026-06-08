import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { DieFace } from './DieFace';

interface DieProps {
  result: number | null;
  onRoll: () => void;
  isRolling?: boolean;
}

/**
 * Die - Interactive die with tap-to-roll animation
 * Uses react-native-reanimated for 60fps animations on UI thread
 * Provides haptic feedback during roll
 *
 * Per RESEARCH.md Pattern 1:
 * - Shared values for rotation/scale
 * - withSequence for multi-stage animation
 * - GestureDetector for tap handling
 */
export function Die({ result, onRoll, isRolling = false }: DieProps) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const handleRoll = () => {
    // Prevent multiple taps during animation
    if (isRolling) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Multi-stage roll animation (1.5s total)
    // Stage 1: Fast rotation (0.5s)
    // Stage 2: Settle into final position (0.3s)
    // Stage 3: Bounce (spring)
    rotation.value = withSequence(
      withTiming(360 * 3, { duration: 500, easing: Easing.out(Easing.quad) }),
      withTiming(360 * 5 + (result || 1) * 60, { duration: 300 }),
    );

    // Shake effect
    translateX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-5, { duration: 50 }),
      withTiming(5, { duration: 50 }),
      withTiming(0, { duration: 100 }),
    );

    translateY.value = withSequence(
      withTiming(-20, { duration: 50 }),
      withTiming(0, { duration: 100 }),
    );

    // Bounce scale
    scale.value = withSequence(
      withTiming(1.1, { duration: 100 }),
      withSpring(1, { damping: 10 }),
    );

    // Callback to parent after animation starts
    runOnJS(onRoll)();
  };

  const tap = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.95, { damping: 15 });
    })
    .onEnd(() => {
      handleRoll();
    })
    .onFinalize(() => {
      // Reset scale if gesture cancelled
      scale.value = withSpring(1, { damping: 15 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  // Display result or placeholder
  const displayValue = result ?? 1;

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <DieFace value={displayValue} size={140} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
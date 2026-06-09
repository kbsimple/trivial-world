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

// IN-01: Animation configuration constants
const ANIMATION_CONFIG = {
  ROTATION_MULTIPLIER: 360,
  INITIAL_ROTATIONS: 3,
  FINAL_ROTATIONS: 5,
  DEGREE_PER_FACE: 60,
  ROLL_DURATION_MS: 500,
  SETTLE_DURATION_MS: 300,
  SHAKE_DURATION_MS: 50,
  SHAKE_FINAL_DURATION_MS: 100,
  BOUNCE_Y_OFFSET: 20,
  BOUNCE_DURATION_MS: 50,
} as const;

interface DieProps {
  result: number | null;
  onRoll: () => number | void; // CR-01: Can return the roll result
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

    // CR-01: Get the roll result synchronously from parent
    // Parent calls rollDie() and returns the result immediately
    const rolledValue = onRoll() ?? result ?? 1;

    // Multi-stage roll animation (1.5s total)
    // Stage 1: Fast rotation (0.5s)
    // Stage 2: Settle into final position (0.3s)
    // Stage 3: Bounce (spring)
    rotation.value = withSequence(
      withTiming(
        ANIMATION_CONFIG.ROTATION_MULTIPLIER * ANIMATION_CONFIG.INITIAL_ROTATIONS,
        { duration: ANIMATION_CONFIG.ROLL_DURATION_MS, easing: Easing.out(Easing.quad) }
      ),
      withTiming(
        ANIMATION_CONFIG.ROTATION_MULTIPLIER * ANIMATION_CONFIG.FINAL_ROTATIONS + rolledValue * ANIMATION_CONFIG.DEGREE_PER_FACE,
        { duration: ANIMATION_CONFIG.SETTLE_DURATION_MS }
      ),
    );

    // Shake effect
    translateX.value = withSequence(
      withTiming(-10, { duration: ANIMATION_CONFIG.SHAKE_DURATION_MS }),
      withTiming(10, { duration: ANIMATION_CONFIG.SHAKE_DURATION_MS }),
      withTiming(-5, { duration: ANIMATION_CONFIG.SHAKE_DURATION_MS }),
      withTiming(5, { duration: ANIMATION_CONFIG.SHAKE_DURATION_MS }),
      withTiming(0, { duration: ANIMATION_CONFIG.SHAKE_FINAL_DURATION_MS }),
    );

    translateY.value = withSequence(
      withTiming(-ANIMATION_CONFIG.BOUNCE_Y_OFFSET, { duration: ANIMATION_CONFIG.SHAKE_DURATION_MS }),
      withTiming(0, { duration: ANIMATION_CONFIG.SHAKE_FINAL_DURATION_MS }),
    );

    // Bounce scale
    scale.value = withSequence(
      withTiming(1.1, { duration: ANIMATION_CONFIG.SHAKE_FINAL_DURATION_MS }),
      withSpring(1, { damping: 10 }),
    );
  };

  const tap = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.95, { damping: 15 });
    })
    .onEnd(() => {
      'worklet';
      // Run handleRoll on JS thread since it calls onRoll() and Haptics
      runOnJS(handleRoll)();
    })
    .onFinalize(() => {
      'worklet';
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
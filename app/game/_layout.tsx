import { Stack } from 'expo-router';

/**
 * Game flow layout
 * Nested layout for game screens
 * Inherits dark theme from parent layout
 *
 * Flow: setup -> roll -> move -> question -> (repeat or results)
 * SCOR-04: Results screen shown when phase === 'finished'
 */
export default function GameLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="setup" />
      <Stack.Screen name="roll" />
      <Stack.Screen name="move" />
      <Stack.Screen name="question" />
      <Stack.Screen name="results" />
    </Stack>
  );
}
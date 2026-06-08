import { Stack } from 'expo-router';

/**
 * Game flow layout
 * Nested layout for game screens
 * Inherits dark theme from parent layout
 */
export default function GameLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="setup" />
      <Stack.Screen name="question" />
    </Stack>
  );
}
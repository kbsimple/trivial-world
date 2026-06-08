import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TamaguiProvider, Theme } from 'tamagui';
import config from '../tamagui.config';

/**
 * Root layout
 * Wraps entire app with required providers
 * - GestureHandlerRootView: Required for react-native-gesture-handler
 * - TamaguiProvider: Provides Tamagui theme and tokens
 * - Theme: Dark theme default (D-18)
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <Theme name="dark">
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="game/setup" />
            <Stack.Screen name="game/question" />
          </Stack>
        </Theme>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
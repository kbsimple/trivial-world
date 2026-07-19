import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TamaguiProvider, Theme } from 'tamagui';
import config from '../tamagui.config';

/**
 * Root layout — web/PWA-only (Phase 24-02 collapse).
 *
 * Wraps the entire app with required providers:
 * - GestureHandlerRootView: Required for react-native-gesture-handler
 * - TamaguiProvider: Provides Tamagui theme and tokens
 * - Theme: Dark theme default (D-18)
 *
 * The former native database-initialization effect (WatermelonDB seed) was
 * removed when the native build path was deleted in 24-01. Web has no
 * database to initialize, so the root layout renders the navigator
 * immediately on first render.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <Theme name="dark">
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="game" />
            <Stack.Screen name="packs" />
          </Stack>
        </Theme>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
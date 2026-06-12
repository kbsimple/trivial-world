import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
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
 * - Database initialization: Seeds default pack on first launch (D-02)
 *   - Mobile: WatermelonDB with pack downloads (D-07)
 *   - Web: Skipped - uses bundled questions only (D-08)
 *
 * NOTE: Database module is NOT imported at top level to avoid bundling
 * native modules (WatermelonDB/SQLite) on web. Use getDatabase() from
 * services/database.ts instead, which handles platform detection.
 */

export default function RootLayout() {
  // On web there's no database to initialize, so start ready immediately.
  // Expo Router requires the Root Layout to render a navigator on the first render —
  // returning null prevents route mounting and causes a navigation error.
  const [isInitialized, setIsInitialized] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    // Mobile: Initialize database and seed default pack (D-02)
    // Dynamic import to avoid bundling WatermelonDB/SQLite on web
    import('../database')
      .then(({ initializeDatabaseAsync }) => initializeDatabaseAsync())
      .then(() => {
        setIsInitialized(true);
      })
      .catch((error) => {
        console.error('Database initialization failed:', error);
        // Still set initialized to true so app renders
        // Error handling can be improved later
        setIsInitialized(true);
      });
  }, []);

  if (!isInitialized) {
    // Loading state while database initializes
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <Theme name="dark">
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="game/setup" />
            <Stack.Screen name="game/question" />
            <Stack.Screen name="packs" options={{ headerShown: false }} />
          </Stack>
        </Theme>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
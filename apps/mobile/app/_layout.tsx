import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TamaguiProvider, Theme } from 'tamagui';
import { SQLiteAdapter } from '@nozbe/watermelondb/adapters/sqlite';
import config from '../tamagui.config';
import { createDatabase, initializeDatabase, schema, migrations } from '../database';

/**
 * Root layout
 * Wraps entire app with required providers
 * - GestureHandlerRootView: Required for react-native-gesture-handler
 * - TamaguiProvider: Provides Tamagui theme and tokens
 * - Theme: Dark theme default (D-18)
 * - Database initialization: Seeds default pack on first launch (D-02)
 */

// Create database adapter and instance
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true, // Use JSI for better performance
  onSetUpError: (error) => {
    console.error('Database setup failed:', error);
  },
});

export const database = createDatabase(adapter);

export default function RootLayout() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize database and seed default pack (D-02)
    initializeDatabase()
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
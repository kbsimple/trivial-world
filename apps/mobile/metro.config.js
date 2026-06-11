/**
 * Metro configuration for Expo web build
 *
 * Configures Metro bundler to handle platform-specific modules correctly.
 * For web builds, we mock out native-only modules:
 * - @nozbe/watermelondb (uses SQLite, not available on web)
 * - @nozbe/watermelondb/adapters/sqlite (native SQLite adapter)
 * - @react-native-async-storage/async-storage (native storage, web uses sessionStorage)
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Resolver configuration to handle platform-specific modules
 *
 * For web platform, mock native-only modules:
 * 1. Web uses bundled questions from questionProvider.ts
 * 2. Web uses sessionStorage from platformStorage.ts (not AsyncStorage)
 * 3. These native modules cause "__fbBatchedBridgeConfig is not set" error on web
 *
 * Note: The __fbBatchedBridgeConfig error was actually caused by missing
 * nativeModuleProxy global. Fixed via public/index.html polyfill.
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // On web platform, mock native-only modules
  if (platform === 'web') {
    // Mock WatermelonDB and all its sub-paths
    if (moduleName === '@nozbe/watermelondb' || moduleName.startsWith('@nozbe/watermelondb/')) {
      return {
        type: 'empty',
      };
    }

    // Mock AsyncStorage
    if (moduleName === '@react-native-async-storage/async-storage' || moduleName.startsWith('@react-native-async-storage/async-storage/')) {
      return {
        type: 'empty',
      };
    }
  }

  // Default resolution for all other cases
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
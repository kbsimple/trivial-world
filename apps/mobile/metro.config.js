/**
 * Metro configuration for Expo web build
 *
 * Configures Metro bundler to handle platform-specific modules correctly.
 * For web builds, we need to avoid bundling native-only modules like:
 * - @nozbe/watermelondb/adapters/sqlite (uses better-sqlite3)
 * - expo-haptics (has web stub, but should be tree-shaken)
 * - expo-screen-orientation (mobile-only)
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Resolver configuration to handle platform-specific modules
 *
 * For web builds, we mock out native-only modules to avoid bundling
 * their dependencies (like better-sqlite3).
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // On web platform, mock native-only modules
  if (platform === 'web') {
    // Mock WatermelonDB SQLite adapter for web
    // Web uses bundled questions from questionProvider.ts instead
    if (moduleName.includes('@nozbe/watermelondb/adapters/sqlite')) {
      return {
        type: 'empty',
      };
    }
  }

  // Default resolution for all other cases
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
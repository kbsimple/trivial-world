/**
 * Metro configuration for Expo web build
 *
 * Configures Metro bundler to handle platform-specific modules correctly.
 * For web builds, we mock out native-only modules:
 * - @nozbe/watermelondb (uses SQLite, not available on web)
 * - @nozbe/watermelondb/adapters/sqlite (native SQLite adapter)
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Resolver configuration to handle platform-specific modules
 *
 * For web platform, mock WatermelonDB completely since:
 * 1. Web uses bundled questions from questionProvider.ts
 * 2. WatermelonDB's native bridge causes "__fbBatchedBridgeConfig is not set" error
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // On web platform, mock WatermelonDB completely
  if (platform === 'web') {
    // Mock the main package and all its sub-paths
    if (moduleName === '@nozbe/watermelondb' || moduleName.startsWith('@nozbe/watermelondb/')) {
      return {
        type: 'empty',
      };
    }
  }

  // Default resolution for all other cases
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
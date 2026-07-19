/**
 * Metro configuration for Expo web build
 *
 * Native-only module mocking is no longer required: the native iOS/Android
 * build path and its dependencies (@nozbe/watermelondb,
 * @react-native-async-storage/async-storage) were removed in Phase 24.
 * The web/PWA target imports neither, so no resolver override is needed.
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
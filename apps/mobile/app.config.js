/**
 * Expo configuration for Trivial World mobile app
 *
 * Plugins configured for mobile-only features:
 * - expo-haptics: Mobile-only haptic feedback (no-op on web)
 * - expo-screen-orientation: Mobile-only orientation lock (ignored on web)
 */
module.exports = {
  name: 'Trivial World',
  slug: 'trivial-world',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.trivialworld.app',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#1a1a2e',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    package: 'com.trivialworld.app',
  },
  web: {
    favicon: './assets/favicon.png',
    output: 'single',
    bundler: 'metro',
  },
  plugins: [
    // Plugins only needed for native builds
    // expo-haptics: Has web stub, no-op on web
    // expo-screen-orientation: Not applicable to web browsers
    // Removed for web build compatibility with Node 25
    // 'expo-haptics',
    // 'expo-screen-orientation',
  ],
  scheme: 'trivialworld',
};
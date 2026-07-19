/**
 * Expo configuration for Trivial World web/PWA app
 * (web-only — native iOS/Android build path removed in Phase 24)
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
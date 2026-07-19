// Minimal react-native stub for Vitest.
// The real react-native/index.js uses Flow's `import typeof *` syntax which
// Rollup cannot parse. This stub provides only what the stores need.
// Platform.OS = 'web' so tests exercise the web (IDB + sessionStorage) path.
export const Platform = { OS: 'web' as const };
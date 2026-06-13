// Minimal react-native stub for Vitest.
// The real react-native/index.js uses Flow's `import typeof *` syntax which
// Rollup cannot parse. This stub provides only what the stores need.
// Platform.OS = 'ios' so tests exercise the native (WatermelonDB) code paths.
export const Platform = { OS: 'ios' as const };

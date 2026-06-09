module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for WatermelonDB decorators (must come before other plugins)
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      ['@babel/plugin-transform-class-properties', { loose: true }],
      // Tamagui compiler plugin MUST come before Reanimated
      '@tamagui/babel-plugin',
      // Reanimated plugin MUST be last
      'react-native-reanimated/plugin',
    ],
  };
};
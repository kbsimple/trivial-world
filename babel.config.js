module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Tamagui compiler plugin MUST come before Reanimated
      '@tamagui/babel-plugin',
      // Reanimated plugin MUST be last
      'react-native-reanimated/plugin',
    ],
  };
};
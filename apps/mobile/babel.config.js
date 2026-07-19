module.exports = function (api) {
  api.cache(true);
  const isWeb = process.env.EXPO_OS === 'web';

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Tamagui compiler plugin MUST come before Reanimated
      // Disable static extraction for web to avoid build issues with Node 25
      ['@tamagui/babel-plugin', {
        disableExtraction: isWeb,
      }],
      // Reanimated plugin MUST be last
      'react-native-reanimated/plugin',
    ],
  };
};
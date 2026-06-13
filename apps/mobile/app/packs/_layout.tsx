import { Stack } from 'expo-router';

/**
 * Pack screens navigation layout
 * Provides stack navigation for pack selection and details
 */
export default function PacksLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Select Pack',
        }}
      />
      <Stack.Screen
        name="combos"
        options={{
          title: 'Pack Combos',
        }}
      />
    </Stack>
  );
}
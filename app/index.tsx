import { useRouter } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';

/**
 * Home screen
 * Entry point for the app
 * - Displays "Trivial World" title
 * - Single "New Game" button leading to setup screen (D-01)
 */
export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background?.val as string }]}>
      {/* Title */}
      <Text style={[styles.title, { color: theme.color?.val as string }]}>
        Trivial World
      </Text>

      {/* New Game button (D-01: Quick start flow) */}
      <Pressable
        style={[styles.button, { backgroundColor: theme.color?.val as string }]}
        onPress={() => router.push('/game/setup')}
      >
        <Text style={[styles.buttonText, { color: theme.background?.val as string }]}>
          New Game
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  button: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
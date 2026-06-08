import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';

interface AddPlayerButtonProps {
  onPress: () => void;
  disabled: boolean;
}

/**
 * Add player button component
 * - Adds a new participant to the game
 * - Disabled when max players (6) reached (D-06)
 */
export function AddPlayerButton({ onPress, disabled }: AddPlayerButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      style={[
        styles.button,
        {
          backgroundColor: disabled
            ? (theme.color?.val as string) + '40' // 40 = 25% opacity
            : theme.color?.val as string,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, { color: theme.background?.val as string }]}>
        + Add Participant
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
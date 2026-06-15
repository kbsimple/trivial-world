import { Pressable, Text, StyleSheet, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from 'tamagui';

interface AddPlayerButtonProps {
  onPress: () => void;
  disabled: boolean;
  /** Optional style override — used to apply secondary/outlined appearance from call sites */
  style?: StyleProp<ViewStyle>;
  /** Optional text style override — used when button background changes (e.g. transparent outlined) */
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Add player button component
 * - Adds a new participant to the game
 * - Disabled when max players (6) reached (D-06)
 */
export function AddPlayerButton({ onPress, disabled, style, textStyle }: AddPlayerButtonProps) {
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
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, { color: theme.background?.val as string }, textStyle]}>
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
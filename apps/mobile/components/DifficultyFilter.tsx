import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { Difficulty } from '@trivial-world/types';

interface DifficultyFilterProps {
  enabledDifficulties: Difficulty[] | null; // null = all enabled
  onToggle: (difficulty: Difficulty) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: '#4caf50',
  medium: '#ff9800',
  hard: '#f44336',
};

/**
 * Difficulty filter component
 * Per D-06: Difficulty filtering as optional pre-game setting
 * Per UI-SPEC: Easy/Medium/Hard toggles, all selected by default
 */
export function DifficultyFilter({
  enabledDifficulties,
  onToggle,
  onSelectAll,
  onClearAll,
}: DifficultyFilterProps) {
  const theme = useTheme();

  const isDifficultyEnabled = (difficulty: Difficulty): boolean => {
    // null means all difficulties enabled
    if (enabledDifficulties === null) return true;
    return enabledDifficulties.includes(difficulty);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.color?.val as string }]}>
        Difficulty
      </Text>

      {/* Difficulty toggles */}
      <View style={styles.row}>
        {DIFFICULTIES.map((difficulty) => {
          const isEnabled = isDifficultyEnabled(difficulty);
          return (
            <Pressable
              key={difficulty}
              style={[
                styles.difficultyButton,
                {
                  backgroundColor: isEnabled ? DIFFICULTY_COLORS[difficulty] : 'rgba(255, 255, 255, 0.2)',
                  opacity: isEnabled ? 1 : 0.5,
                },
              ]}
              onPress={() => onToggle(difficulty)}
            >
              <Text style={[styles.difficultyText, { color: isEnabled ? '#fff' : theme.color?.val as string }]}>
                {isEnabled ? '●' : '○'}
              </Text>
              <Text style={[styles.difficultyName, { color: isEnabled ? '#fff' : theme.color?.val as string }]}>
                {DIFFICULTY_LABELS[difficulty]}
              </Text>
            </Pressable>
          );
        })}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  difficultyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
  },
  difficultyText: {
    fontSize: 16,
    marginRight: 6,
  },
  difficultyName: {
    fontSize: 14,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
  },
});
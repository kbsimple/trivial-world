import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';
import { Category, CategorySchema } from '@trivial-world/types';
import { CATEGORY_COLORS, CATEGORY_NAMES } from '../constants/categories';

// IN-03: Derive category list from schema to avoid type casting
const ALL_CATEGORIES = CategorySchema.options;

interface CategoryFilterProps {
  enabledCategories: Category[] | null; // null = all enabled
  onToggle: (category: Category) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

/**
 * Category filter component
 * Per D-05: Category filtering before game start
 * Per UI-SPEC: 6 toggles with color indicators
 */
export function CategoryFilter({
  enabledCategories,
  onToggle,
  onSelectAll,
  onClearAll,
}: CategoryFilterProps) {
  const theme = useTheme();

  const isCategoryEnabled = (category: Category): boolean => {
    // null means all categories enabled
    if (enabledCategories === null) return true;
    return enabledCategories.includes(category);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.color?.val as string }]}>
        Select Categories
      </Text>

      {/* Category toggles */}
      <View style={styles.row}>
        {ALL_CATEGORIES.map((category) => {
          const isEnabled = isCategoryEnabled(category);
          return (
            <Pressable
              key={category}
              style={[
                styles.categoryButton,
                {
                  backgroundColor: isEnabled
                    ? CATEGORY_COLORS[category]
                    : 'rgba(255, 255, 255, 0.2)',
                  opacity: isEnabled ? 1 : 0.5,
                },
              ]}
              onPress={() => onToggle(category)}
            >
              {/* Filled circle for enabled, empty for disabled */}
              <Text style={[styles.categoryText, { color: isEnabled ? '#fff' : theme.color?.val as string }]}>
                {isEnabled ? '●' : '○'}
              </Text>
              <Text style={[styles.categoryName, { color: isEnabled ? '#fff' : theme.color?.val as string }]}>
                {CATEGORY_NAMES[category]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Select/Clear all buttons */}
      <View style={styles.buttonRow}>
        <Pressable style={styles.textButton} onPress={onSelectAll}>
          <Text style={[styles.textButtonText, { color: '#228b22' }]}>
            Select All
          </Text>
        </Pressable>
        <Pressable style={styles.textButton} onPress={onClearAll}>
          <Text style={[styles.textButtonText, { color: theme.color?.val as string, opacity: 0.7 }]}>
            Clear All
          </Text>
        </Pressable>
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
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 140,
  },
  categoryText: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  textButton: {
    padding: 8,
  },
  textButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
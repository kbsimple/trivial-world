import { Platform } from 'react-native';
import { Modal, View, Pressable, Text, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Sheet, YStack, Button, Text as TText, H2 } from 'tamagui';

/**
 * PauseOverlay
 *
 * Web: dropdown menu anchored to the top-left header button (☰).
 * Native: bottom sheet with Resume/End Game options.
 *
 * Per D-03: Pause button in header shows overlay with Resume Game
 * and End Game options — explicit control for intentional breaks.
 */
interface PauseOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResume: () => void;
  onEndGame: () => void;
}

export function PauseOverlay({ open, onOpenChange, onResume, onEndGame }: PauseOverlayProps) {
  if (Platform.OS === 'web') {
    if (!open) return null;
    return (
      <Modal transparent visible={open} onRequestClose={() => onOpenChange(false)}>
        <TouchableWithoutFeedback onPress={() => onOpenChange(false)}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdown}>
                <Pressable
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                  onPress={() => { onOpenChange(false); onResume(); }}
                >
                  <Text style={styles.menuItemText}>Resume Game</Text>
                </Pressable>
                <View style={styles.separator} />
                <Pressable
                  style={({ pressed }) => [styles.menuItemDanger, pressed && styles.menuItemPressed]}
                  onPress={() => { onOpenChange(false); onEndGame(); }}
                >
                  <Text style={styles.menuItemTextDanger}>End Game</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[50]}
      dismissOnSnapToBottom
      modal
    >
      <Sheet.Overlay />
      <Sheet.Frame padding="$4" gap="$3">
        <Sheet.Handle />
        <YStack gap="$4" alignItems="center">
          <H2>Game Paused</H2>
          <TText color="$gray11">Choose an option to continue</TText>
          <YStack gap="$2" width="100%">
            <Button
              size="$4"
              theme="green"
              onPress={() => {
                onOpenChange(false);
                onResume();
              }}
            >
              Resume Game
            </Button>
            <Button
              size="$4"
              theme="red"
              onPress={() => {
                onOpenChange(false);
                onEndGame();
              }}
            >
              End Game
            </Button>
          </YStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  dropdown: {
    position: 'absolute',
    top: 58,
    left: 12,
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    width: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemDanger: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  menuItemText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  menuItemTextDanger: {
    color: '#ff453a',
    fontSize: 15,
    fontWeight: '500',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});

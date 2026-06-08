import { Sheet, YStack, Button, Text, H2 } from 'tamagui';

/**
 * PauseOverlay - Bottom sheet with Resume/End Game options
 *
 * Per D-03: Pause button in header shows overlay with Resume Game
 * and End Game options — explicit control for intentional breaks.
 *
 * Uses Tamagui Sheet for bottom-sheet modal with animations.
 */
interface PauseOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResume: () => void;
  onEndGame: () => void;
}

export function PauseOverlay({ open, onOpenChange, onResume, onEndGame }: PauseOverlayProps) {
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
          <Text color="$gray11">Choose an option to continue</Text>
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
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Platform-aware haptic impact
 * Calls expo-haptics on mobile, no-op on web (per D-10)
 *
 * @param style - The impact feedback style (Light, Medium, Heavy)
 */
export async function impactAsync(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium
): Promise<void> {
  if (Platform.OS === 'web') {
    return; // No haptics on web per D-10
  }
  await Haptics.impactAsync(style);
}

/**
 * Platform-aware haptic notification
 * Calls expo-haptics on mobile, no-op on web (per D-10)
 *
 * @param type - The notification feedback type (Success, Warning, Error)
 */
export async function notificationAsync(
  type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success
): Promise<void> {
  if (Platform.OS === 'web') {
    return; // No haptics on web per D-10
  }
  await Haptics.notificationAsync(type);
}
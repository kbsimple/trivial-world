/**
 * Haptics — web/PWA-only no-ops (Phase 24-02 collapse).
 *
 * expo-haptics has no effect on web (per D-10). The former web-only no-op
 * branches are inlined as the only path; the native expo-haptics calls were
 * removed when the native build path was deleted in 24-01.
 *
 * The exported function signatures are preserved so callers can stay unchanged.
 */
import * as Haptics from 'expo-haptics';

/**
 * No-op haptic impact (web has no haptics per D-10).
 *
 * @param _style - The impact feedback style (ignored on web)
 */
export async function impactAsync(
  _style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium
): Promise<void> {
  return;
}

/**
 * No-op haptic notification (web has no haptics per D-10).
 *
 * @param _type - The notification feedback type (ignored on web)
 */
export async function notificationAsync(
  _type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success
): Promise<void> {
  return;
}
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Platform-specific storage for React Native (mobile)
 * Uses AsyncStorage for persistent storage
 */
export const platformStorage = AsyncStorage;
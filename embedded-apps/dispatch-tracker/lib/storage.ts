/**
 * expo-secure-store has no web implementation, but the Expo web preview
 * (react-native-web) is a legitimate way to smoke-test this app in a
 * browser. Fall back to AsyncStorage (backed by localStorage on web) there;
 * use the more secure SecureStore on actual native builds.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isWeb = Platform.OS === 'web';

export function getItem(key: string): Promise<string | null> {
  return isWeb ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
}

export function setItem(key: string, value: string): Promise<void> {
  return isWeb ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value);
}

export function deleteItem(key: string): Promise<void> {
  return isWeb ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key);
}

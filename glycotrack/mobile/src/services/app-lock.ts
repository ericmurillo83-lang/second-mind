import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/** Optional device-level lock (Face ID / Touch ID / fingerprint / device passcode). */

export const appLockSupported = Platform.OS === 'ios' || Platform.OS === 'android';

export async function canUseAppLock(): Promise<{ ok: boolean; reason?: string }> {
  if (!appLockSupported) return { ok: false, reason: 'App lock is available in the iOS and Android apps.' };
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  if (level === LocalAuthentication.SecurityLevel.NONE) {
    return { ok: false, reason: 'Set up a passcode, Face ID or fingerprint on this device first.' };
  }
  return { ok: true };
}

export async function authenticate(reason = 'Unlock GlycoTrack'): Promise<boolean> {
  if (!appLockSupported) return true;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'Cancel',
    // Allow device passcode fallback so people without biometrics are not locked out.
    disableDeviceFallback: false,
  });
  return result.success;
}

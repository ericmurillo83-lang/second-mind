import { Alert, Platform, Share } from 'react-native';

/** Cross-platform confirm. React Native Web's Alert has no buttons, so use window.confirm there. */
export function confirmAsync(options: {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    const fn = (globalThis as { confirm?: (msg: string) => boolean }).confirm;
    return Promise.resolve(fn ? fn(`${options.title}\n\n${options.message}`) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(options.title, options.message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      {
        text: options.confirmLabel,
        style: options.destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

export function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    const fn = (globalThis as { alert?: (msg: string) => void }).alert;
    fn?.(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

/** Hand an export file to the user: the share sheet on devices, a download on web. */
export async function shareJson(filename: string, json: string): Promise<void> {
  if (Platform.OS === 'web') {
    const doc = (globalThis as { document?: Document }).document;
    if (!doc) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = doc.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ title: filename, message: json });
}

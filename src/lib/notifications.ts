import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Benachrichtigungen auch anzeigen, wenn die App gerade offen ist
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Fragt die Push-Berechtigung an und speichert das Expo-Push-Token
 * in der Datenbank. Läuft nur auf echten Geräten und setzt ein
 * verknüpftes EAS-Projekt voraus (einmalig: `npx eas init`).
 */
export async function registerPushToken(profileId: string) {
  try {
    if (!Device.isDevice) return; // Simulatoren bekommen keine Push-Tokens

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Standard',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('Push deaktiviert: kein EAS-Projekt verknüpft (npx eas init ausführen).');
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await supabase.from('push_tokens').upsert({
      token,
      profile_id: profileId,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    // Push ist nice-to-have — die App soll deswegen nie brechen
    console.warn('Push-Registrierung fehlgeschlagen:', error);
  }
}

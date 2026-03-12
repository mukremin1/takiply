import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export const NOTIFICATION_SETTINGS_KEY = "takiply-notification-settings-v1";

export const defaultNotificationSettings = {
  notificationsEnabled: true,
  criticalAlerts: true,
  soundEnabled: true,
  vibrationEnabled: true
};

export function readStoredNotificationSettings() {
  if (typeof window === "undefined") {
    return defaultNotificationSettings;
  }

  try {
    const saved = window.localStorage.getItem(NOTIFICATION_SETTINGS_KEY);

    if (!saved) {
      return defaultNotificationSettings;
    }

    return {
      ...defaultNotificationSettings,
      ...JSON.parse(saved)
    };
  } catch {
    window.localStorage.removeItem(NOTIFICATION_SETTINGS_KEY);
    return defaultNotificationSettings;
  }
}

export function writeStoredNotificationSettings(settings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
}

function normalizePermission(value) {
  if (value === "granted" || value === "denied") {
    return value;
  }

  return "default";
}

export async function getNotificationPermissionState() {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await LocalNotifications.checkPermissions();
      return normalizePermission(result.display);
    } catch {
      return "unsupported";
    }
  }

  if (typeof window !== "undefined" && "Notification" in window) {
    return normalizePermission(window.Notification.permission);
  }

  return "unsupported";
}

export async function requestNotificationPermission() {
  if (Capacitor.isNativePlatform()) {
    try {
      const current = await LocalNotifications.checkPermissions();

      if (normalizePermission(current.display) === "granted") {
        return { granted: true, permission: "granted" };
      }

      const result = await LocalNotifications.requestPermissions();
      const permission = normalizePermission(result.display);

      return { granted: permission === "granted", permission };
    } catch {
      return { granted: false, permission: "unsupported" };
    }
  }

  if (typeof window !== "undefined" && "Notification" in window) {
    const permission = normalizePermission(await window.Notification.requestPermission());
    return { granted: permission === "granted", permission };
  }

  return { granted: false, permission: "unsupported" };
}

export async function scheduleTestNotification(settings) {
  const permission = await getNotificationPermissionState();

  if (permission !== "granted") {
    return {
      ok: false,
      message: "Bildirim gönderilemedi. Cihaz izinlerini kontrol edin."
    };
  }

  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now(),
            title: "Takiply Test Bildirimi",
            body: settings.criticalAlerts
              ? "Kritik uyarılar açık. Hatırlatmalar öncelikli gösterilecek."
              : "Bildirim ayarlarınız aktif görünüyor.",
            schedule: { at: new Date(Date.now() + 1000) },
            sound: settings.soundEnabled ? undefined : null
          }
        ]
      });

      return {
        ok: true,
        message: "Test bildirimi gönderildi."
      };
    } catch {
      return {
        ok: false,
        message: "Test bildirimi gönderilemedi. Cihaz izinlerini kontrol edin."
      };
    }
  }

  if (typeof window !== "undefined" && "Notification" in window) {
    const notification = new window.Notification("Takiply Test Bildirimi", {
      body: settings.criticalAlerts
        ? "Kritik uyarılar açık. Hatırlatmalar öncelikli gösterilecek."
        : "Bildirim ayarlarınız aktif görünüyor.",
      silent: !settings.soundEnabled
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return {
      ok: true,
      message: "Test bildirimi gönderildi."
    };
  }

  return {
    ok: false,
    message: "Bu cihaz bildirimi desteklemiyor."
  };
}

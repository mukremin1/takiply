import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotificationPermissionState,
  readStoredNotificationSettings,
  requestNotificationPermission,
  scheduleTestNotification,
  writeStoredNotificationSettings
} from "../components/lib/notificationService";

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 17H9" />
      <path d="M18 17H6l1.2-1.6A4 4 0 0 0 8 13V10a4 4 0 1 1 8 0v3c0 .88.29 1.74.82 2.4L18 17z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function SoundIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function VibrationIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="4" width="10" height="16" rx="2" />
      <path d="M3 8v8" />
      <path d="M21 8v8" />
      <path d="M1 10v4" />
      <path d="M23 10v4" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v5" />
      <path d="M12 7h.01" />
    </svg>
  );
}

function ToggleRow({ icon, iconClassName = "", title, description, checked, onToggle }) {
  return (
    <div className="notification-row">
      <div className="notification-row-main">
        <span className={["notification-row-icon", iconClassName].join(" ")}>{icon}</span>
        <div>
          <p className="notification-row-title">{title}</p>
          {description ? <p className="notification-row-description">{description}</p> : null}
        </div>
      </div>
      <button
        type="button"
        className={["notification-switch", checked ? "is-on" : ""].join(" ")}
        aria-pressed={checked}
        onClick={onToggle}
      >
        <span />
      </button>
    </div>
  );
}

export default function NotificationSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(() => readStoredNotificationSettings());
  const [saveMessage, setSaveMessage] = useState("");
  const [permissionState, setPermissionState] = useState("default");

  useEffect(() => {
    writeStoredNotificationSettings(settings);
  }, [settings]);

  useEffect(() => {
    let cancelled = false;

    getNotificationPermissionState().then((state) => {
      if (!cancelled) {
        setPermissionState(state);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function updateSettings(updater, message) {
    setSettings((prev) => (typeof updater === "function" ? updater(prev) : updater));
    setSaveMessage(message);
  }

  async function handleNotificationsToggle() {
    if (settings.notificationsEnabled) {
      updateSettings(
        (prev) => ({
          ...prev,
          notificationsEnabled: false,
          criticalAlerts: false
        }),
        "Bildirimler kapatıldı."
      );
      return;
    }

    const permissionResult = await requestNotificationPermission();
    setPermissionState(permissionResult.permission);

    if (!permissionResult.granted) {
      updateSettings(
        (prev) => ({
          ...prev,
          notificationsEnabled: false,
          criticalAlerts: false
        }),
        permissionResult.permission === "denied"
          ? "Bildirim izni reddedildi."
          : "Bu cihazda bildirim izni kullanılamıyor."
      );
      return;
    }

    updateSettings(
      (prev) => ({
        ...prev,
        notificationsEnabled: true
      }),
      "Bildirimler açıldı."
    );
  }

  async function handleCriticalToggle() {
    if (!settings.criticalAlerts) {
      const permissionResult = await requestNotificationPermission();
      setPermissionState(permissionResult.permission);

      if (!permissionResult.granted) {
        setSaveMessage(
          permissionResult.permission === "denied"
            ? "Kritik uyarılar için bildirim izni vermelisin."
            : "Bu cihazda bildirim izni kullanılamıyor."
        );
        return;
      }
    }

    updateSettings(
      (prev) => ({
        ...prev,
        notificationsEnabled: prev.notificationsEnabled || !prev.criticalAlerts,
        criticalAlerts: !prev.criticalAlerts
      }),
      settings.criticalAlerts ? "Kritik uyarılar kapatıldı." : "Kritik uyarılar açıldı."
    );
  }

  function handleSoundToggle() {
    updateSettings(
      (prev) => ({
        ...prev,
        soundEnabled: !prev.soundEnabled
      }),
      settings.soundEnabled ? "Bildirim sesi kapatıldı." : "Bildirim sesi açıldı."
    );
  }

  function handleVibrationToggle() {
    updateSettings(
      (prev) => ({
        ...prev,
        vibrationEnabled: !prev.vibrationEnabled
      }),
      settings.vibrationEnabled ? "Titreşim kapatıldı." : "Titreşim açıldı."
    );
  }

  async function handleTestNotification() {
    if (settings.vibrationEnabled && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([120, 80, 120]);
    }

    if (settings.soundEnabled && typeof window !== "undefined" && "AudioContext" in window) {
      const audioContext = new window.AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.03;
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.18);
      oscillator.onended = () => {
        audioContext.close().catch(() => {});
      };
    }

    if (!settings.notificationsEnabled) {
      setSaveMessage("Test bildirimi için önce Bildirimler seçeneğini açın.");
      return;
    }

    let permission = await getNotificationPermissionState();

    if (permission === "default") {
      const result = await requestNotificationPermission();
      permission = result.permission;
      setPermissionState(result.permission);
    }

    if (permission !== "granted") {
      setSaveMessage("Test bildirimi gönderilemedi. Cihaz izinlerini kontrol edin.");
      return;
    }

    const result = await scheduleTestNotification(settings);
    setSaveMessage(result.message);
  }

  const permissionLabel =
    permissionState === "granted"
      ? "Cihaz bildirimi açık."
      : permissionState === "denied"
        ? "Cihaz bildirimi kapalı."
        : permissionState === "default"
          ? "Bildirim izni bekleniyor."
          : "Bu cihaz bildirim iznini desteklemiyor.";

  return (
    <section className="notification-settings-screen">
      <header className="edit-profile-header">
        <button type="button" className="edit-profile-back" aria-label="Geri" onClick={() => navigate("/profile")}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2>Bildirim Ayarları</h2>
        <span className="w-10" aria-hidden="true" />
      </header>

      <div className="notification-settings-body">
        <div className="notification-panel">
          <ToggleRow
            icon={<BellIcon />}
            iconClassName="is-mint"
            title="Bildirimler"
            checked={settings.notificationsEnabled}
            onToggle={handleNotificationsToggle}
          />
          <ToggleRow
            icon={<AlertIcon />}
            iconClassName="is-red"
            title="Kritik Uyarılar"
            description="Sessiz modda bile bildirim al"
            checked={settings.criticalAlerts}
            onToggle={handleCriticalToggle}
          />
        </div>

        <div className="notification-panel">
          <ToggleRow
            icon={<SoundIcon />}
            iconClassName="is-mint"
            title="Bildirim Sesi"
            checked={settings.soundEnabled}
            onToggle={handleSoundToggle}
          />
          <ToggleRow
            icon={<VibrationIcon />}
            iconClassName="is-purple"
            title="Titreşim"
            checked={settings.vibrationEnabled}
            onToggle={handleVibrationToggle}
          />
        </div>

        <article className="notification-info-card">
          <div className="notification-info-line">
            <span className="notification-info-icon">
              <InfoIcon />
            </span>
            <p>
              Kritik uyarılar, ilaç hatırlatmalarınızın zamanında ulaşmasını sağlar. Önerilen
              ayardır. {permissionLabel}
            </p>
          </div>
          <button type="button" className="notification-test-btn" onClick={handleTestNotification}>
            Test Bildirimi Gönder
          </button>
          {saveMessage ? <p className="notification-save-message">{saveMessage}</p> : null}
        </article>
      </div>
    </section>
  );
}

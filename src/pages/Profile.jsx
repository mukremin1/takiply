import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../components/theme-context";
import { useAuth } from "../lib/useAuth";
import { PROFILE_STORAGE_KEY, readStoredProfile } from "../lib/profile-storage";

function ProfileIcon({ children }) {
  return <span className="profile-icon-shell">{children}</span>;
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a7 7 0 1 0 9 9 9 9 0 1 1-9-9z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19a7 7 0 0 1 14 0" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-6.5-4.35-8.5-8A5.2 5.2 0 0 1 12 6a5.2 5.2 0 0 1 8.5 6c-2 3.65-8.5 8-8.5 8z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 17H9" />
      <path d="M18 17H6l1.2-1.6A4 4 0 0 0 8 13V10a4 4 0 1 1 8 0v3c0 .88.29 1.74.82 2.4L18 17z" />
    </svg>
  );
}

function FamilyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="2.5" />
      <circle cx="16.5" cy="9.5" r="2" />
      <path d="M4.5 18a4.5 4.5 0 0 1 9 0" />
      <path d="M13.5 18a3.5 3.5 0 0 1 7 0" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 14a3 3 0 0 1 0-4l2-2a3 3 0 1 1 4 4l-1 1" />
      <path d="M14 10a3 3 0 0 1 0 4l-2 2a3 3 0 0 1-4-4l1-1" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18" />
      <path d="M12 3a15 15 0 0 0 0 18" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4" />
      <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v5c0 5-3.4 8.8-7 10-3.6-1.2-7-5-7-10V6l7-3z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 1-4 0 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 1 0-4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6c.38-.11.72-.32 1-.6a1.7 1.7 0 0 1 4 0c.28.28.62.49 1 .6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.11.38.32.72.6 1a1.7 1.7 0 0 1 0 4c-.28.28-.49.62-.6 1z" />
    </svg>
  );
}

function SectionLink({ to, icon, label, trailing }) {
  return (
    <Link to={to} className="profile-list-item">
      <div className="flex items-center gap-3">
        <ProfileIcon>{icon}</ProfileIcon>
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-[#7891a5]">
        {trailing ? <span>{trailing}</span> : null}
        <ChevronIcon />
      </div>
    </Link>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { currentUser, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [storedProfile, setStoredProfile] = useState(() => readStoredProfile());

  useEffect(() => {
    const syncProfile = (event) => {
      if (event?.key && event.key !== PROFILE_STORAGE_KEY) {
        return;
      }

      setStoredProfile(readStoredProfile());
    };

    window.addEventListener("storage", syncProfile);
    window.addEventListener("focus", syncProfile);

    return () => {
      window.removeEventListener("storage", syncProfile);
      window.removeEventListener("focus", syncProfile);
    };
  }, []);

  const initials = useMemo(() => {
    const name = storedProfile.fullName?.trim() || currentUser?.name?.trim() || currentUser?.email || "Kullanıcı";

    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [currentUser?.email, currentUser?.name, storedProfile.fullName]);

  const displayName = storedProfile.fullName || currentUser?.name || "Kullanıcı";
  const email = currentUser?.email || "hesap@takiply.app";

  async function handleSignOut() {
    await signOut();
    navigate("/auth", { replace: true });
  }

  return (
    <section className="profile-screen">
      <div className="profile-topbar">
        <h2>Profil</h2>
        <button type="button" className="profile-ghost-btn" aria-label="Ayarlar" onClick={() => navigate("/edit-profile")}>
          <SettingsIcon />
        </button>
      </div>

      <article className="profile-hero-card">
        {storedProfile.avatarDataUrl ? (
          <img src={storedProfile.avatarDataUrl} alt={displayName} className="profile-avatar-image" />
        ) : (
          <div className="profile-avatar">{initials || "K"}</div>
        )}
        <div>
          <h3>{displayName}</h3>
          <p>{email}</p>
        </div>
      </article>

      <div className="profile-section">
        <p className="profile-section-title">Görünüm</p>
        <div className="profile-panel">
          <div className="profile-list-item profile-list-item-static">
            <div className="flex items-center gap-3">
              <ProfileIcon>
                <MoonIcon />
              </ProfileIcon>
              <span>Tema</span>
            </div>
            <label className="profile-theme-toggle">
              <span>{isDark ? "Karanlık" : "Aydınlık"}</span>
              <button type="button" className={["profile-switch", isDark ? "is-on" : ""].join(" ")} aria-pressed={isDark} onClick={toggleTheme}>
                <span />
              </button>
            </label>
          </div>
        </div>
      </div>

      <div className="profile-section">
        <p className="profile-section-title">Hesap</p>
        <div className="profile-panel">
          <SectionLink to="/edit-profile" icon={<UserIcon />} label="Profil Bilgileri" />
          <SectionLink to="/health-profile" icon={<HeartIcon />} label="Sağlık Profili" />
          <SectionLink to="/notification-settings" icon={<BellIcon />} label="Bildirim Ayarları" />
        </div>
      </div>

      <div className="profile-section">
        <p className="profile-section-title">Aile</p>
        <div className="profile-panel">
          <SectionLink to="/family" icon={<FamilyIcon />} label="Ailem" />
          <SectionLink to="/profile-setup" icon={<LinkIcon />} label="Bağlantı Kodu" />
        </div>
      </div>

      <div className="profile-section">
        <p className="profile-section-title">Entegrasyonlar</p>
        <div className="profile-panel">
          <SectionLink to="/e-nabiz-connect" icon={<GlobeIcon />} label="e-Nabız Bağlantısı" trailing="Bağlanmadı" />
        </div>
      </div>

      <div className="profile-section">
        <p className="profile-section-title">Destek</p>
        <div className="profile-panel">
          <SectionLink to="/help" icon={<HelpIcon />} label="Yardım & SSS" />
          <SectionLink to="/medical-disclaimer" icon={<FileIcon />} label="Tıbbi Feragatname" />
          <SectionLink to="/terms" icon={<FileIcon />} label="Kullanım Koşulları" />
          <SectionLink to="/privacy" icon={<ShieldIcon />} label="Gizlilik Politikası" />
        </div>
      </div>

      <button type="button" className="profile-logout-btn" onClick={handleSignOut}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
        Çıkış Yap
      </button>

      <p className="profile-version">Versiyon 1.0.0</p>
    </section>
  );
}

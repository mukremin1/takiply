import { useMemo } from "react";
import { Link } from "react-router-dom";
import { readStoredProfile } from "../lib/profile-storage";
import { useAuth } from "../lib/useAuth";

function QuickActionIcon({ type }) {
  if (type === "add") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }

  if (type === "scan") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M8 4H6a2 2 0 0 0-2 2v2" />
        <path d="M16 4h2a2 2 0 0 1 2 2v2" />
        <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
        <path d="M4 16v2a2 2 0 0 0 2 2h2" />
      </svg>
    );
  }

  if (type === "health") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.8 7.9a5.1 5.1 0 0 0-8-1.1 5.1 5.1 0 0 0-8 1.1c-1.7 3 0 6.4 2.4 8.5L12 21l4.8-4.6c2.4-2.1 4.1-5.5 2-8.5z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 20v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3" />
      <path d="M22 20v-2a4 4 0 0 0-3-3.9" />
      <path d="M16 3.1a3 3 0 0 1 0 5.8" />
    </svg>
  );
}

const quickActions = [
  { label: "İlaç Ekle", to: "/add-medication", icon: "add" },
  { label: "Reçete Tara", to: "/scan-prescription", icon: "scan" },
  { label: "Sağlık Verisi", to: "/add-vital", icon: "health" },
  { label: "Ailem", to: "/family", icon: "family" }
];

export default function Home() {
  const { currentUser } = useAuth();
  const todayLabel = useMemo(() => {
    const date = new Date();
    const day = new Intl.DateTimeFormat("tr-TR", { day: "numeric" }).format(date);
    const month = new Intl.DateTimeFormat("tr-TR", { month: "long" }).format(date);
    const weekdayRaw = new Intl.DateTimeFormat("tr-TR", { weekday: "long" }).format(date);
    const weekday = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1);
    return `${day} ${month}, ${weekday}`;
  }, []);
  const displayName = useMemo(() => {
    const storedProfile = readStoredProfile();
    return storedProfile.fullName?.trim() || currentUser?.name?.trim() || currentUser?.email || "Kullanıcı";
  }, [currentUser?.email, currentUser?.name]);

  return (
    <section className="home-screen">
      <p className="home-date">{todayLabel}</p>
      <h2 className="home-greeting">Merhaba, {displayName}!</h2>

      <div className="quick-grid">
        {quickActions.map((action) => (
          <Link key={action.label} to={action.to} className="quick-card">
            <span className="quick-icon">
              <QuickActionIcon type={action.icon} />
            </span>
            <span className="quick-label">{action.label}</span>
          </Link>
        ))}
      </div>

      <div className="reminder-head">
        <h3>Bugünkü Hatırlatıcılar</h3>
        <Link to="/medications" className="see-all-link">
          Tümünü Gör
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      <div className="empty-reminder-state">
        <div className="pill-hero-icon">
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.5 13.5L13.5 10.5" />
            <path d="M8.8 19.2a4.5 4.5 0 0 1 0-6.4l4-4a4.5 4.5 0 1 1 6.4 6.4l-4 4a4.5 4.5 0 0 1-6.4 0z" />
          </svg>
        </div>

        <h4>Henüz ilaç eklenmedi</h4>
        <p>İlaçlarınızı ekleyerek hatırlatıcı almaya başlayın</p>

        <Link to="/add-medication" className="add-first-btn">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          İlk ilacını Ekle
        </Link>
      </div>
    </section>
  );
}

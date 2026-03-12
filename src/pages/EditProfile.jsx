import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/useAuth";
import { defaultProfile, readStoredProfile, writeStoredProfile } from "../lib/profile-storage";

const GENDER_OPTIONS = ["Erkek", "Kadın", "Diğer"];

export default function EditProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { currentUser } = useAuth();
  const [form, setForm] = useState(() => {
    const saved = readStoredProfile();

    return {
      ...defaultProfile,
      ...saved,
      fullName: saved.fullName || currentUser?.name || ""
    };
  });
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    let active = true;

    if (!currentUser?.name) {
      return () => {
        active = false;
      };
    }

    Promise.resolve().then(() => {
      if (!active) {
        return;
      }

      setForm((prev) => ({
        ...prev,
        fullName: prev.fullName || currentUser.name
      }));
    });

    return () => {
      active = false;
    };
  }, [currentUser?.name]);

  const initials = useMemo(() => {
    const source = form.fullName?.trim() || currentUser?.email || "K";

    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [currentUser?.email, form.fullName]);

  function updateField(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value
    }));
    setSaveMessage("");
  }

  function handleImageSelect(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateField("avatarDataUrl", String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(event) {
    event.preventDefault();
    writeStoredProfile(form);
    setSaveMessage("Profil bilgileri kaydedildi.");
  }

  return (
    <section className="edit-profile-screen">
      <header className="edit-profile-header">
        <button type="button" className="edit-profile-back" aria-label="Geri" onClick={() => navigate("/profile")}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2>Profil Bilgileri</h2>
        <span className="w-10" aria-hidden="true" />
      </header>

      <form className="edit-profile-form" onSubmit={handleSubmit}>
        <div className="edit-profile-avatar-wrap">
          <div className="edit-profile-avatar-shell">
            {form.avatarDataUrl ? (
              <img src={form.avatarDataUrl} alt={form.fullName || "Profil"} className="edit-profile-avatar-image" />
            ) : (
              <div className="edit-profile-avatar-text">{initials || "K"}</div>
            )}
            <button
              type="button"
              className="edit-profile-camera-btn"
              aria-label="Profil fotoğrafı seç"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8h3l2-2h6l2 2h3v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          </div>
          <p className="edit-profile-email">{currentUser?.email || "hesap@takiply.app"}</p>
        </div>

        <label className="edit-profile-field">
          <span>Ad Soyad</span>
          <input
            type="text"
            value={form.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
            placeholder="Adınız ve soyadınız"
          />
        </label>

        <label className="edit-profile-field">
          <span>Doğum Tarihi</span>
          <input
            type="date"
            value={form.birthDate}
            onChange={(event) => updateField("birthDate", event.target.value)}
          />
        </label>

        <div className="edit-profile-field">
          <span>Cinsiyet</span>
          <div className="edit-profile-gender-row">
            {GENDER_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={["edit-profile-gender-btn", form.gender === option ? "is-active" : ""].join(" ")}
                onClick={() => updateField("gender", option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <label className="edit-profile-field">
          <span>Boy (cm)</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="300"
            value={form.heightCm}
            onChange={(event) => updateField("heightCm", event.target.value)}
            placeholder="165"
          />
        </label>

        {saveMessage ? <p className="edit-profile-save-message">{saveMessage}</p> : null}

        <button type="submit" className="edit-profile-save-btn">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Kaydet
        </button>
      </form>
    </section>
  );
}

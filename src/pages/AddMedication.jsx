import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addMedication } from "../api/integrations";

function PillIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 13.5L13.5 10.5" />
      <path d="M8.8 19.2a4.5 4.5 0 0 1 0-6.4l4-4a4.5 4.5 0 1 1 6.4 6.4l-4 4a4.5 4.5 0 0 1-6.4 0z" />
    </svg>
  );
}

export default function AddMedication() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await addMedication({ name, dosage });
      navigate("/medications");
    } catch (requestError) {
      setError(requestError?.message || "İlaç kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="add-medication-screen">
      <header className="edit-profile-header">
        <button type="button" className="edit-profile-back" aria-label="Geri" onClick={() => navigate("/medications")}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 className="add-medication-title">İlaç Ekle</h2>
        <span className="w-10" aria-hidden="true" />
      </header>

      <div className="add-medication-body">
        <article className="add-medication-hero">
          <div className="add-medication-hero-icon">
            <PillIcon />
          </div>
          <div>
            <h3>İlaç Bilgisi Ekle</h3>
            <p>İlaç adı ve doz bilgisini girerek ilaç listene hızlıca kaydet.</p>
          </div>
        </article>

        <form className="add-medication-form" aria-label="ilaç ekleme formu" onSubmit={handleSubmit}>
          <label className="add-medication-field">
            <span>İlaç Adı</span>
            <input
              className="add-medication-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Örn: Parol"
              disabled={saving}
            />
          </label>

          <label className="add-medication-field">
            <span>Doz</span>
            <input
              className="add-medication-input"
              value={dosage}
              onChange={(event) => setDosage(event.target.value)}
              placeholder="Örn: 500 mg"
              disabled={saving}
            />
          </label>

          {error ? <p className="add-medication-error">{error}</p> : null}

          <div className="add-medication-action-row">
            <button type="button" className="add-medication-cancel-btn" onClick={() => navigate("/medications")} disabled={saving}>
              Vazgeç
            </button>
            <button type="submit" className="add-medication-submit-btn" disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

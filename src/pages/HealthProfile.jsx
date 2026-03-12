import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { readStoredProfile, writeStoredProfile } from "../lib/profile-storage";

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-6.5-4.35-8.5-8A5.2 5.2 0 0 1 12 6a5.2 5.2 0 0 1 8.5 6c-2 3.65-8.5 8-8.5 8z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

function ListEditor({
  title,
  placeholder,
  items,
  draft,
  onDraftChange,
  onAdd,
  onRemove,
  accent = "green",
  icon
}) {
  return (
    <section className="health-profile-section">
      <div className="health-profile-label-row">
        <span className={["health-profile-label-icon", accent === "red" ? "is-red" : ""].join(" ")}>{icon}</span>
        <h3>{title}</h3>
      </div>

      <div className="health-profile-input-row">
        <input type="text" value={draft} onChange={(event) => onDraftChange(event.target.value)} placeholder={placeholder} />
        <button
          type="button"
          className={["health-profile-add-btn", accent === "red" ? "is-red" : ""].join(" ")}
          aria-label={`${title} ekle`}
          onClick={onAdd}
        >
          <PlusIcon />
        </button>
      </div>

      {items.length ? (
        <div className="health-profile-chip-list">
          {items.map((item) => (
            <div key={item} className={["health-profile-chip", accent === "red" ? "is-red" : ""].join(" ")}>
              <span>{item}</span>
              <button type="button" aria-label={`${item} sil`} onClick={() => onRemove(item)}>
                <RemoveIcon />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function HealthProfile() {
  const navigate = useNavigate();
  const storedProfile = readStoredProfile();
  const [chronicConditions, setChronicConditions] = useState(() => storedProfile.chronicConditions || []);
  const [medicationAllergies, setMedicationAllergies] = useState(() => storedProfile.medicationAllergies || []);
  const [conditionDraft, setConditionDraft] = useState("");
  const [allergyDraft, setAllergyDraft] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  function normalizeEntry(value) {
    return value.trim();
  }

  function addUniqueItem(list, value) {
    const normalized = normalizeEntry(value);

    if (!normalized) {
      return list;
    }

    if (list.some((item) => item.toLocaleLowerCase("tr-TR") === normalized.toLocaleLowerCase("tr-TR"))) {
      return list;
    }

    return [...list, normalized];
  }

  function handleAddCondition() {
    setChronicConditions((prev) => addUniqueItem(prev, conditionDraft));
    setConditionDraft("");
    setSaveMessage("");
  }

  function handleAddAllergy() {
    setMedicationAllergies((prev) => addUniqueItem(prev, allergyDraft));
    setAllergyDraft("");
    setSaveMessage("");
  }

  function handleRemoveCondition(value) {
    setChronicConditions((prev) => prev.filter((item) => item !== value));
    setSaveMessage("");
  }

  function handleRemoveAllergy(value) {
    setMedicationAllergies((prev) => prev.filter((item) => item !== value));
    setSaveMessage("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    writeStoredProfile({
      ...storedProfile,
      chronicConditions,
      medicationAllergies
    });
    setSaveMessage("Sağlık bilgileri kaydedildi.");
  }

  return (
    <section className="health-profile-screen">
      <header className="edit-profile-header">
        <button type="button" className="edit-profile-back" aria-label="Geri" onClick={() => navigate("/profile")}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2>Sağlık Profili</h2>
        <span className="w-10" aria-hidden="true" />
      </header>

      <form className="health-profile-form" onSubmit={handleSubmit}>
        <article className="health-profile-hero">
          <div className="health-profile-hero-icon">
            <HeartIcon />
          </div>
          <div>
            <h3>Sağlık Bilgileriniz</h3>
            <p>Kronik hastalıklarınızı ve alerjilerinizi güncel tutun</p>
          </div>
        </article>

        <ListEditor
          title="Kronik Hastalıklar"
          placeholder="Hastalık ekle..."
          items={chronicConditions}
          draft={conditionDraft}
          onDraftChange={setConditionDraft}
          onAdd={handleAddCondition}
          onRemove={handleRemoveCondition}
          icon={<HeartIcon />}
        />

        <ListEditor
          title="İlaç Alerjileri"
          placeholder="Alerji ekle..."
          items={medicationAllergies}
          draft={allergyDraft}
          onDraftChange={setAllergyDraft}
          onAdd={handleAddAllergy}
          onRemove={handleRemoveAllergy}
          accent="red"
          icon={<AlertIcon />}
        />

        {saveMessage ? <p className="edit-profile-save-message">{saveMessage}</p> : null}

        <button type="submit" className="edit-profile-save-btn">
          Kaydet
        </button>
      </form>
    </section>
  );
}

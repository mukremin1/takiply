import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { readStoredFamily, writeStoredFamily } from "../lib/family-storage";

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-6.5-4.35-8.5-8A5.2 5.2 0 0 1 12 6a5.2 5.2 0 0 1 8.5 6c-2 3.65-8.5 8-8.5 8z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 14a3 3 0 0 1 0-4l2-2a3 3 0 1 1 4 4l-1 1" />
      <path d="M14 10a3 3 0 0 1 0 4l-2 2a3 3 0 0 1-4-4l1-1" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="2.5" />
      <circle cx="16.5" cy="9.5" r="2" />
      <path d="M4.5 18a4.5 4.5 0 0 1 9 0" />
      <path d="M13.5 18a3.5 3.5 0 0 1 7 0" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="3" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </svg>
  );
}

export default function Family() {
  const navigate = useNavigate();
  const [familyData, setFamilyData] = useState(() => readStoredFamily());
  const [form, setForm] = useState({ name: "", relation: "", note: "" });
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  function updateFamily(next) {
    setFamilyData(next);
    writeStoredFamily(next);
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(familyData.familyCode);
      setMessage("Bağlantı kodu kopyalandı.");
    } catch {
      setMessage("Kod kopyalanamadı.");
    }
  }

  function handleAddMember(event) {
    event.preventDefault();

    const name = form.name.trim();
    const relation = form.relation.trim();
    const note = form.note.trim();

    if (!name || !relation) {
      setMessage("Ad soyad ve yakınlık alanlarını doldurun.");
      return;
    }

    const member = {
      id: `${Date.now()}`,
      name,
      relation,
      note,
      status: "Bağlı"
    };

    updateFamily({
      ...familyData,
      members: [...familyData.members, member]
    });
    setForm({ name: "", relation: "", note: "" });
    setShowForm(false);
    setMessage("Aile üyesi eklendi.");
  }

  function handleRemoveMember(id) {
    updateFamily({
      ...familyData,
      members: familyData.members.filter((member) => member.id !== id)
    });
    setMessage("Aile üyesi kaldırıldı.");
  }

  return (
    <section className="family-screen">
      <header className="edit-profile-header">
        <button type="button" className="edit-profile-back" aria-label="Geri" onClick={() => navigate("/profile")}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2>Ailem</h2>
        <span className="w-10" aria-hidden="true" />
      </header>

      <div className="family-body">
        <article className="family-hero-card">
          <span className="family-hero-icon">
            <HeartIcon />
          </span>
          <div>
            <h3>Aile Bakım Modu</h3>
            <p>Sevdiklerinizin ilaç takibini uzaktan izleyin. Kritik dozları kaçırdıklarında anında bildirim alın.</p>
          </div>
        </article>

        <article className="family-code-card">
          <div className="family-code-title">
            <span className="family-code-title-icon">
              <LinkIcon />
            </span>
            <h3>Bağlantı Kodunuz</h3>
          </div>

          <div className="family-code-row">
            <div className="family-code-box">{familyData.familyCode}</div>
            <button type="button" className="family-copy-btn" aria-label="Kodu kopyala" onClick={handleCopyCode}>
              <CopyIcon />
            </button>
          </div>

          <p className="family-code-help">Bu kodu aile üyelerinizle paylaşarak onları bağlayabilirsiniz.</p>
        </article>

        <div className="family-members-head">
          <h3>Aile Üyeleri</h3>
          <button type="button" className="family-add-chip" onClick={() => setShowForm((value) => !value)}>
            <PlusIcon />
            Ekle
          </button>
        </div>

        {showForm ? (
          <form className="family-form-card" onSubmit={handleAddMember}>
            <label className="edit-profile-field">
              <span>Ad Soyad</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Örn. Ayşe Yılmaz"
              />
            </label>

            <label className="edit-profile-field">
              <span>Yakınlık</span>
              <input
                type="text"
                value={form.relation}
                onChange={(event) => setForm((prev) => ({ ...prev, relation: event.target.value }))}
                placeholder="Anne, baba, kardeş..."
              />
            </label>

            <label className="edit-profile-field">
              <span>Not</span>
              <input
                type="text"
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="İsteğe bağlı kısa not"
              />
            </label>

            <button type="submit" className="edit-profile-save-btn">
              <UserPlusIcon />
              Aile Üyesi Ekle
            </button>
          </form>
        ) : null}

        {familyData.members.length ? (
          <div className="family-member-list">
            {familyData.members.map((member) => (
              <article key={member.id} className="family-member-card">
                <div className="family-member-avatar">{member.name.slice(0, 1).toUpperCase()}</div>
                <div className="family-member-content">
                  <div className="family-member-top">
                    <div>
                      <h4>{member.name}</h4>
                      <p>{member.relation}</p>
                    </div>
                    <span className="family-member-badge">{member.status}</span>
                  </div>
                  {member.note ? <p className="family-member-note">{member.note}</p> : null}
                </div>
                <button type="button" className="family-member-remove" onClick={() => handleRemoveMember(member.id)}>
                  Sil
                </button>
              </article>
            ))}
          </div>
        ) : (
          <article className="family-empty-card">
            <div className="family-empty-icon">
              <UsersIcon />
            </div>
            <h4>Henüz aile üyesi yok</h4>
            <p>Sevdiklerinizi ekleyerek takibinizi paylaşın</p>
            <button type="button" className="family-primary-btn" onClick={() => setShowForm(true)}>
              <UserPlusIcon />
              İlk Üyeyi Ekle
            </button>
          </article>
        )}

        {message ? <p className="family-message">{message}</p> : null}
      </div>
    </section>
  );
}

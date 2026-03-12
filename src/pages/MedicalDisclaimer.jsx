import { useNavigate } from "react-router-dom";

const DISCLAIMER_ITEMS = [
  {
    title: "Tıbbi Tavsiye Değildir",
    description:
      "Bu uygulama sağlık profesyonelinin yerini tutmaz. İlaç kullanımı, dozaj ve tedavi kararları mutlaka doktorunuz ile görüşülerek alınmalıdır.",
    tone: "teal"
  },
  {
    title: "Dozaj Tavsiyeleri Vermez",
    description:
      "Uygulama hiçbir şekilde otomatik dozaj önerisi üretmez. Tüm ilaç dozajları ve kullanım süreleri doktorunuz tarafından belirlenmelidir.",
    tone: "teal"
  },
  {
    title: "Teşhis Yapmaz",
    description:
      "Bu uygulama hastalık teşhisi koymaz ve tedavi önerisi sunmaz. Sağlık durumunuz hakkında herhangi bir endişeniz varsa mutlaka bir sağlık profesyoneline başvurun.",
    tone: "teal"
  },
  {
    title: "Hatırlatıcı Amaçlıdır",
    description:
      "İlaç hatırlatıcıları yalnızca size yardımcı olmak içindir. Uygulamanın teknik bir sorun nedeniyle hatırlatma gelememesi durumunda sorumluluk kabul edilmez.",
    tone: "teal"
  },
  {
    title: "Acil Durumlarda",
    description:
      "Acil bir tıbbi durum yaşıyorsanız, derhal 112 acil servisini arayın veya en yakın sağlık kuruluşuna başvurun. Bu uygulama acil tıbbi yardım sağlamaz.",
    tone: "teal"
  },
  {
    title: "Uygulamanın Amacı",
    description:
      "Bu uygulama, doktorunuz tarafından reçete edilen ilaçlarınızı hatırlamanıza, stok durumunuzu takip etmenize ve ilaç kullanım kaydınızı tutmanıza yardımcı olmak için tasarlanmıştır.",
    tone: "blue"
  }
];

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01" />
      <path d="M12 12v5" />
    </svg>
  );
}

export default function MedicalDisclaimer() {
  const navigate = useNavigate();

  return (
    <section className="medical-disclaimer-screen">
      <header className="edit-profile-header">
        <button type="button" className="edit-profile-back" aria-label="Geri" onClick={() => navigate("/profile")}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2>Tıbbi Feragatname</h2>
        <span className="w-10" aria-hidden="true" />
      </header>

      <div className="medical-disclaimer-body">
        <article className="medical-disclaimer-alert">
          <div className="medical-disclaimer-alert-badge">
            <ShieldIcon />
          </div>
          <div className="medical-disclaimer-alert-content">
            <h3>Önemli Uyarı</h3>
            <p>Bu uygulama yalnızca bilgi amaçlıdır ve kesinlikle tıbbi tavsiye, teşhis veya tedavi sağlamaz.</p>
          </div>
        </article>

        <div className="medical-disclaimer-list">
          {DISCLAIMER_ITEMS.map((item) => (
            <article key={item.title} className={["medical-disclaimer-card", item.tone === "blue" ? "is-blue" : ""].join(" ")}>
              <div className={["medical-disclaimer-card-icon", item.tone === "blue" ? "is-blue" : ""].join(" ")}>
                <InfoIcon />
              </div>
              <div className="medical-disclaimer-card-content">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>

        <article className="medical-disclaimer-legal">
          <p>
            <strong>Yasal Uyarı:</strong> Bu uygulamayı kullanarak, yukarıdaki koşulları kabul etmiş olursunuz.
            Uygulamanın doğrudan veya dolaylı olarak sebep olduğu herhangi bir zarar için uygulama geliştiricileri
            sorumluluk kabul etmez. İlaç kullanımı ile ilgili tüm kararlar sağlık profesyonelleriniz ile birlikte
            alınmalıdır.
          </p>
        </article>

        <button type="button" className="medical-disclaimer-confirm" onClick={() => navigate("/profile")}>
          Anladım
        </button>
      </div>
    </section>
  );
}

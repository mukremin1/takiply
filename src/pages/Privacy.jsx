import { useNavigate } from "react-router-dom";

const PRIVACY_SECTIONS = [
  {
    title: "Topladığımız Veriler",
    bullets: [
      "Kişisel bilgiler (ad, e-posta, doğum tarihi)",
      "Sağlık verileri (ilaçlar, hastalıklar, alerjiler)",
      "Kullanım verileri (uygulama etkileşimleri)",
      "Cihaz bilgileri (model, işletim sistemi)"
    ]
  },
  {
    title: "Veri Güvenliği",
    intro: "Tüm sağlık verileriniz:",
    bullets: [
      "Uçtan uca şifreleme ile korunur",
      "Güvenli sunucularda saklanır",
      "Düzenli güvenlik denetimleri yapılır",
      "Yetkisiz erişime karşı korunur"
    ]
  },
  {
    title: "Veri Kullanımı",
    intro: "Verilerinizi şunlar için kullanırız:",
    bullets: [
      "İlaç hatırlatıcıları göndermek",
      "Sağlık ilerlemesi takibi",
      "Uygulamayı geliştirmek",
      "Kişiselleştirilmiş öneriler sunmak"
    ]
  },
  {
    title: "Haklarınız",
    intro: "KVKK kapsamında şu haklara sahipsiniz:",
    bullets: [
      "Verilerinize erişim hakkı",
      "Veri düzeltme hakkı",
      "Veri silme hakkı",
      "Veri taşınabilirlik hakkı",
      "İtiraz etme hakkı"
    ]
  },
  {
    title: "Veri Paylaşımı",
    intro: "Verileriniz yalnızca şu durumlarda paylaşılır:",
    bullets: [
      "Açık onayınız ile",
      "Yasal zorunluluk durumunda",
      "Anonim istatistiksel analizler için"
    ],
    body: "Verileriniz asla üçüncü taraflara satılmaz."
  },
  {
    title: "Çerezler",
    body:
      "Uygulamayı iyileştirmek için çerezler kullanırız. Ayarlardan çerez tercihlerinizi yönetebilirsiniz."
  },
  {
    title: "İletişim",
    body: "Gizlilik ile ilgili sorularınız için:",
    footer: "gizlilik@takiply.com"
  }
];

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <section className="privacy-screen">
      <header className="edit-profile-header">
        <button type="button" className="edit-profile-back" aria-label="Geri" onClick={() => navigate("/profile")}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2>Gizlilik Politikası</h2>
        <span className="w-10" aria-hidden="true" />
      </header>

      <div className="privacy-body">
        <article className="privacy-hero-card">
          <div className="privacy-hero-icon">
            <ShieldIcon />
          </div>
          <div>
            <p className="privacy-hero-kicker">KVKK Uyumlu</p>
            <h3>Verileriniz güvende</h3>
          </div>
        </article>

        <div className="privacy-section-list">
          {PRIVACY_SECTIONS.map((section) => (
            <section key={section.title} className="privacy-section">
              <h3>{section.title}</h3>
              {section.intro ? <p>{section.intro}</p> : null}
              {section.body ? <p>{section.body}</p> : null}
              {section.bullets ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
              {section.footer ? <p className="privacy-contact">{section.footer}</p> : null}
            </section>
          ))}
        </div>

        <p className="privacy-updated">Son güncelleme: 31 Aralık 2025</p>
      </div>
    </section>
  );
}

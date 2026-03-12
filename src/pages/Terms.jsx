import { useNavigate } from "react-router-dom";

const TERM_SECTIONS = [
  {
    title: "1. Hizmet Tanımı",
    body:
      "Bu uygulama, ilaç hatırlatıcısı ve sağlık takibi hizmeti sunmaktadır. Uygulama, tıbbi tavsiye veya teşhis aracı değildir."
  },
  {
    title: "2. Kullanıcı Sorumlulukları",
    intro: "Kullanıcılar:",
    bullets: [
      "Doğru ve güncel bilgi sağlamakla yükümlüdür",
      "Hesap güvenliğinden sorumludur",
      "Uygulamayı yasal amaçlarla kullanacağını taahhüt eder"
    ]
  },
  {
    title: "3. Tıbbi Sorumluluk Reddi",
    body:
      "Uygulama profesyonel tıbbi tavsiye, teşhis veya tedavinin yerini tutmaz. Her zaman doktorunuza danışın."
  },
  {
    title: "4. Veri Kullanımı",
    body:
      "Sağlık verileriniz KVKK uyumlu şekilde işlenir ve saklanır. Detaylar için Gizlilik Politikası'na bakın."
  },
  {
    title: "5. Hizmet Değişiklikleri",
    body:
      "Uygulama özelliklerinde, fiyatlandırmada veya kullanılabilirlikte değişiklik yapma hakkımız saklıdır."
  },
  {
    title: "6. Hesap Sonlandırma",
    body:
      "Kullanıcılar hesaplarını istedikleri zaman silebilirler. Koşulları ihlal eden hesaplar sonlandırılabilir."
  },
  {
    title: "7. İletişim",
    body: "Sorularınız için: destek@takiply.com"
  }
];

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}

export default function Terms() {
  const navigate = useNavigate();

  return (
    <section className="terms-screen">
      <header className="edit-profile-header">
        <button type="button" className="edit-profile-back" aria-label="Geri" onClick={() => navigate("/profile")}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2>Kullanım Koşulları</h2>
        <span className="w-10" aria-hidden="true" />
      </header>

      <div className="terms-body">
        <article className="terms-update-card">
          <div className="terms-update-icon">
            <FileIcon />
          </div>
          <div>
            <h3>Son Güncelleme</h3>
            <p>31 Aralık 2024</p>
          </div>
        </article>

        <div className="terms-section-list">
          {TERM_SECTIONS.map((section) => (
            <section key={section.title} className="terms-section">
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
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

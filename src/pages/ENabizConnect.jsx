import { useState } from "react";
import { useNavigate } from "react-router-dom";

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export default function ENabizConnect() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");

  function handleClose() {
    navigate("/profile");
  }

  function handlePremium() {
    setMessage("Premium geçiş ekranı henüz hazır değil.");
    window.setTimeout(() => {
      navigate("/profile");
    }, 900);
  }

  return (
    <section className="enabiz-screen">
      <div className="enabiz-overlay" />

      <div className="enabiz-dialog-wrap">
        <article className="enabiz-dialog" role="dialog" aria-modal="true" aria-labelledby="enabiz-title">
          <button type="button" className="enabiz-close-btn" aria-label="Kapat" onClick={handleClose}>
            <CloseIcon />
          </button>

          <h2 id="enabiz-title">Bilgilendirme</h2>
          <p>Bu özellik şu anda geliştiriliyor. Hazır olduğunda yalnızca Premium sürümde kullanılabilir.</p>

          <div className="enabiz-actions">
            <button type="button" className="enabiz-secondary-btn" onClick={handleClose}>
              Tamam
            </button>
            <button type="button" className="enabiz-primary-btn" onClick={handlePremium}>
              Premium&apos;a Geç
            </button>
          </div>

          {message ? <p className="enabiz-message">{message}</p> : null}
        </article>
      </div>
    </section>
  );
}

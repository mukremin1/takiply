import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FAQ_ITEMS } from "../data/supportContent";
const SUPPORT_WHATSAPP_NUMBER = String(import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER || "905395263293").replace(/\D/g, "");
const SUPPORT_WHATSAPP_TEXT = encodeURIComponent("Merhaba, Takiply canlı destek için yazıyorum.");
const SUPPORT_WHATSAPP_LINK = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${SUPPORT_WHATSAPP_TEXT}`;

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v16H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={["help-faq-chevron", open ? "is-open" : ""].join(" ")}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function Help() {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState(-1);

  return (
    <section className="help-screen">
      <header className="edit-profile-header">
        <button type="button" className="edit-profile-back" aria-label="Geri" onClick={() => navigate("/profile")}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2>Yardım &amp; SSS</h2>
        <span className="w-10" aria-hidden="true" />
      </header>

      <div className="help-body">
        <article className="help-hero-card">
          <div>
            <h3>Yardıma mı ihtiyacınız var?</h3>
            <p>Sık sorulan sorulara göz atın veya WhatsApp canlı destekle görüşün.</p>
          </div>

          <div className="help-action-row">
            <a href={SUPPORT_WHATSAPP_LINK} target="_blank" rel="noreferrer" className="help-action-btn">
              <MessageIcon />
              Canlı Destek (WhatsApp)
            </a>
            <a href="mailto:destek@takiply.com" className="help-action-btn" aria-label="destek@takiply.com adresine e-posta gönder">
              <MailIcon />
              destek@takiply.com
            </a>
          </div>
        </article>

        <section className="help-faq-section" aria-label="Sık Sorulan Sorular">
          <h3>Sık Sorulan Sorular</h3>

          <div className="help-faq-list">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openIndex === index;

              return (
                <article key={item.question} className={["help-faq-item", isOpen ? "is-open" : ""].join(" ")}>
                  <button
                    type="button"
                    className="help-faq-trigger"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  >
                    <span>{item.question}</span>
                    <ChevronIcon open={isOpen} />
                  </button>

                  {isOpen ? <p className="help-faq-answer">{item.answer}</p> : null}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}

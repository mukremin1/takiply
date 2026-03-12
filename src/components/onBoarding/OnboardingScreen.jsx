import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/useAuth";
import {
  readStoredNotificationSettings,
  requestNotificationPermission,
  writeStoredNotificationSettings
} from "../lib/notificationService";

const ONBOARDING_STORAGE_KEY = "takiply-onboarding-seen";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="currentColor"
        d="M21.81 12.23c0-.72-.06-1.25-.19-1.81H12.2v3.56h5.53a4.72 4.72 0 0 1-2.05 3.1l2.98 2.31c1.78-1.64 3.15-4.05 3.15-7.16Z"
      />
      <path
        fill="currentColor"
        d="M12.2 22c2.7 0 4.96-.9 6.61-2.45l-2.98-2.31c-.83.56-1.89.95-3.63.95-2.6 0-4.81-1.76-5.6-4.13H3.53v2.38A9.98 9.98 0 0 0 12.2 22Z"
      />
      <path
        fill="currentColor"
        d="M6.6 14.06a5.99 5.99 0 0 1 0-4.12V7.56H3.53a9.98 9.98 0 0 0 0 8.88l3.07-2.38Z"
      />
      <path
        fill="currentColor"
        d="M12.2 5.81c1.97 0 3.33.85 4.09 1.56l2.98-2.91C17.15 2.49 14.9 1.56 12.2 1.56a9.98 9.98 0 0 0-8.67 5l3.07 2.38c.79-2.37 3-4.13 5.6-4.13Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current text-white">
      <path d="M16.37 12.54c.02 2.43 2.13 3.24 2.15 3.25-.02.06-.33 1.13-1.08 2.24-.65.95-1.32 1.89-2.38 1.91-1.04.02-1.38-.62-2.57-.62-1.2 0-1.57.6-2.55.64-1 .04-1.77-1-2.42-1.94C6.2 16.08 5.19 12.6 6.58 10.2c.69-1.19 1.92-1.94 3.26-1.96 1.02-.02 1.99.69 2.57.69.58 0 1.67-.85 2.82-.72.48.02 1.84.2 2.71 1.47-.07.04-1.62.95-1.57 2.86Zm-2.08-5.65c.54-.66.91-1.57.81-2.48-.78.03-1.72.52-2.28 1.18-.5.58-.93 1.51-.81 2.41.87.07 1.76-.44 2.28-1.11Z" />
    </svg>
  );
}

function LeafIcon({ className = "h-12 w-12 text-emerald-300" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M6.75 14.25C6.75 8.94 11.18 5 16.86 5c.13 3.28-.55 5.72-1.93 7.34-1.5 1.76-3.82 2.66-6.96 2.66-.38 0-.78-.01-1.22-.04Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M7 18.5c.48-2.85 2.31-5.14 5.49-6.88"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M14.5 6.5 9 12l5.5 5.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path
        d="M12 3.75c1.79 1.4 4.15 2.25 6.75 2.25v5.65c0 4.19-2.73 7.52-6.75 8.6-4.02-1.08-6.75-4.41-6.75-8.6V6c2.6 0 4.96-.85 6.75-2.25Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8">
      <path d="M9.25 18.25h5.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" />
      <path d="M10.25 20a1.75 1.75 0 0 0 3.5 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" />
      <path
        d="M18 16.5H6c.9-.95 1.5-2.49 1.5-4.25V10.5a4.5 4.5 0 1 1 9 0v1.75c0 1.76.6 3.3 1.5 4.25Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4.25l2.75 1.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function CheckListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path d="m7 8 1.5 1.5L11 7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m7 13 1.5 1.5L11 12" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M13.5 8H17" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M13.5 13H17" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path
        d="M8 4.75h5.5L17.25 8.5V18a2 2 0 0 1-2 2h-7.5a2 2 0 0 1-2-2V6.75a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path d="M13.5 4.75V8.5h3.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M9 12h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <rect x="5.5" y="10.5" width="13" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 10.5v-2a3.5 3.5 0 1 1 7 0v2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function TermsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path d="M7 6.5h10" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      <path d="M7 11.5h6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      <path d="M7 16.5h8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      <path
        d="M5.75 5.75a2 2 0 0 1 2-2h8.5l3 3V18.25a2 2 0 0 1-2 2h-9.5a2 2 0 0 1-2-2V5.75Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function IntroStep({ error, loadingProvider, showAppleButton, onGoogle, onApple, onEmail }) {
  return (
    <section className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#02171d] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(20,179,150,0.28),transparent_20%),radial-gradient(circle_at_50%_42%,rgba(9,112,104,0.18),transparent_34%),linear-gradient(180deg,#021820_0%,#041720_48%,#031018_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-[18%] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[rgba(16,148,129,0.14)] blur-3xl" />

      <div className="relative z-10 flex min-h-[100dvh] flex-col px-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pt-0.5 text-center text-[14px] font-medium tracking-[-0.01em] text-[#d7edf1]">
          Adım 1 / 4
        </div>

        <div className="flex flex-1 flex-col items-center justify-center pb-20 pt-8 text-center">
          <div className="relative flex h-[192px] w-[192px] items-center justify-center">
            <div className="absolute h-[172px] w-[172px] rounded-full bg-[#0e6d66]/24" />
            <div className="absolute h-[122px] w-[122px] rounded-full bg-[#0fa596]/48 shadow-[0_0_34px_rgba(16,185,166,0.12)]" />
            <div className="absolute h-[76px] w-[76px] rounded-full bg-[#10b39f]/82" />
            <div className="absolute flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#0fae9a]">
              <LeafIcon className="h-[22px] w-[22px] text-[#22f3d6]" />
            </div>
          </div>

          <h1 className="mt-9 max-w-[280px] text-[31px] font-bold leading-[1.17] tracking-[-0.04em] !text-white sm:text-[38px]">
            Gün Gün
            <br />
            Vücudunu Anla
          </h1>
          <p className="mt-5 max-w-[290px] text-[16px] leading-7 text-[#c7d8dd] sm:text-[17px]">
            İlaçlarını takip et, sağlığını yönet.
          </p>

          {error ? <p className="mt-6 max-w-sm text-sm font-medium text-rose-300">{error}</p> : null}
        </div>

        <div className="relative z-10 space-y-3.5">
          <button
            type="button"
            onClick={onGoogle}
            disabled={Boolean(loadingProvider)}
            className="flex h-[52px] w-full items-center justify-center gap-3 rounded-[16px] border !border-white/80 !bg-white px-5 text-[18px] font-semibold tracking-[-0.02em] !text-[#03252d] shadow-[0_16px_36px_rgba(255,255,255,0.14)] transition active:scale-[0.99] disabled:opacity-70"
          >
            <GoogleIcon />
            {loadingProvider === "google" ? "İşleniyor..." : "Google ile Devam Et"}
          </button>

          {showAppleButton ? (
            <button
              type="button"
              onClick={onApple}
              disabled={Boolean(loadingProvider)}
              className="flex h-[52px] w-full items-center justify-center gap-3 rounded-[16px] border border-white/16 bg-[#020202] px-5 text-[18px] font-semibold tracking-[-0.02em] !text-white shadow-[0_16px_36px_rgba(0,0,0,0.18)] transition active:scale-[0.99] disabled:opacity-70"
            >
              <AppleIcon />
              <span className="text-white">
                {loadingProvider === "apple" ? "İşleniyor..." : "Apple ile Devam Et"}
              </span>
            </button>
          ) : null}

          <div className="flex items-center gap-3 px-0 pt-1 text-[12px] text-[#6f8b92]">
            <div className="h-px flex-1 bg-white/16" />
            <span>veya</span>
            <div className="h-px flex-1 bg-white/16" />
          </div>

          <button
            type="button"
            onClick={onEmail}
            className="h-[52px] w-full rounded-[16px] bg-[#15d5b6] px-5 text-[18px] font-semibold tracking-[-0.02em] text-[#03252d] shadow-[0_18px_38px_rgba(16,217,188,0.24)] transition active:scale-[0.99]"
          >
            E-posta ile Başla
          </button>

          <p className="px-2 pt-2 text-center text-xs leading-5 text-slate-400">
            Devam ederek{" "}
            <Link to="/terms" className="underline underline-offset-2">
              Kullanım Koşulları
            </Link>{" "}
            ve{" "}
            <Link to="/privacy" className="underline underline-offset-2">
              Gizlilik
            </Link>{" "}
            metinlerini kabul edersin.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function OnboardingScreen({ isAuthenticated = false }) {
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithApple, configError } = useAuth();
  const [error, setError] = useState("");
  const [loadingProvider, setLoadingProvider] = useState("");
  const [step, setStep] = useState(() => (isAuthenticated ? 2 : 1));
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [trustAccepted, setTrustAccepted] = useState(false);
  const showAppleButton = true;
  const canReturnToIntro = !isAuthenticated;

  const markSeen = () => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  };

  const completeOnboarding = () => {
    markSeen();
    navigate(isAuthenticated ? "/home" : "/profile-setup", { replace: true });
  };

  const handleEmailStart = () => {
    setError("");
    setStep(2);
  };

  const handleProviderSignIn = async (provider) => {
    setError("");

    if (configError) {
      setError(configError);
      return;
    }

    setLoadingProvider(provider);

    try {
      markSeen();

      if (provider === "google") {
        await signInWithGoogle();
        return;
      }

      await signInWithApple();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Giriş başarısız.");
    } finally {
      setLoadingProvider("");
    }
  };

  const handleEnableCriticalAlerts = async () => {
    setError("");
    setNotificationLoading(true);

    const result = await requestNotificationPermission();
    const settings = readStoredNotificationSettings();

    writeStoredNotificationSettings({
      ...settings,
      notificationsEnabled: result.granted,
      criticalAlerts: result.granted
    });

    if (!result.granted && result.permission === "denied") {
      setError("Bildirim izni reddedildi. İstersen daha sonra ayarlardan açabilirsin.");
    }

    setNotificationLoading(false);
    setStep(4);
  };

  if (step === 1) {
    return (
      <IntroStep
        error={error}
        loadingProvider={loadingProvider}
        showAppleButton={showAppleButton}
        onGoogle={() => handleProviderSignIn("google")}
        onApple={() => handleProviderSignIn("apple")}
        onEmail={handleEmailStart}
      />
    );
  }

  return (
    <section className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#02171d] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(20,179,150,0.28),transparent_20%),radial-gradient(circle_at_50%_42%,rgba(9,112,104,0.18),transparent_34%),linear-gradient(180deg,#021820_0%,#041720_48%,#031018_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-[18%] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[rgba(16,148,129,0.14)] blur-3xl" />

      <div className="relative flex min-h-[100dvh] flex-col px-5 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))] pt-[max(1.25rem,calc(env(safe-area-inset-top)+0.75rem))]">
        {step === 1 ? (
          <>
            <div className="pt-0.5 text-center text-[14px] font-medium tracking-[-0.01em] text-[#d7edf1]">
              Adım 1 / 4
            </div>

            <div className="flex flex-1 flex-col items-center justify-center pb-12 pt-8 text-center">
              <div className="relative flex h-48 w-48 items-center justify-center">
                <div className="absolute h-48 w-48 rounded-full bg-emerald-400/15" />
                <div className="absolute h-36 w-36 rounded-full bg-emerald-400/20" />
                <div className="absolute h-24 w-24 rounded-full bg-emerald-400/20" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/18 shadow-[0_0_80px_rgba(16,185,129,0.18)]">
                  <LeafIcon />
                </div>
              </div>

              <h1 className="mt-12 max-w-[10ch] text-4xl font-bold leading-tight tracking-[-0.03em] !text-white">
                Gün Gün
                <br />
                Vücudunu Anla
              </h1>
              <p className="mt-5 max-w-xs text-base leading-7 text-slate-300">
                İlaçlarını takip et, sağlığını yönet.
              </p>

              {error ? <p className="mt-6 max-w-sm text-sm font-medium text-rose-300">{error}</p> : null}
            </div>

            <div className="relative z-10 space-y-3">
              <button
                type="button"
                onClick={() => handleProviderSignIn("google")}
                disabled={Boolean(loadingProvider)}
                className="flex min-h-[58px] w-full items-center justify-center gap-3 rounded-[18px] !border-white/80 !bg-white px-5 text-lg font-semibold !text-[#03252d] shadow-[0_16px_36px_rgba(255,255,255,0.14)] transition active:scale-[0.99] disabled:opacity-70"
              >
                <GoogleIcon />
                {loadingProvider === "google" ? "İşleniyor..." : "Google ile Devam Et"}
              </button>

              {showAppleButton ? (
                <button
                  type="button"
                  onClick={() => handleProviderSignIn("apple")}
                  disabled={Boolean(loadingProvider)}
                  className="flex min-h-[58px] w-full items-center justify-center gap-3 rounded-[18px] border border-white/10 bg-black px-5 text-lg font-semibold !text-white transition active:scale-[0.99] disabled:opacity-70"
                >
                  <AppleIcon />
                  <span className="text-white">
                    {loadingProvider === "apple" ? "İşleniyor..." : "Apple ile Devam Et"}
                  </span>
                </button>
              ) : null}

              <div className="flex items-center gap-4 py-2 text-sm text-slate-500">
                <div className="h-px flex-1 bg-white/10" />
                <span>veya</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <button
                type="button"
                onClick={handleEmailStart}
                className="min-h-[58px] w-full rounded-[18px] bg-[#18d7b1] px-5 text-lg font-semibold text-[#03252d] transition active:scale-[0.99]"
              >
                E-posta ile Başla
              </button>

              <p className="px-2 pt-2 text-center text-xs leading-5 text-slate-400">
                Devam ederek{" "}
                <Link to="/terms" className="underline underline-offset-2">
                  Kullanım Koşulları
                </Link>{" "}
                ve{" "}
                <Link to="/privacy" className="underline underline-offset-2">
                  Gizlilik
                </Link>{" "}
                metinlerini kabul edersin.
              </p>
            </div>
          </>
        ) : step === 2 ? (
          <>
            <div className="grid grid-cols-[48px_1fr_48px] items-center">
              {canReturnToIntro ? (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-slate-300 transition active:scale-[0.98]"
                  aria-label="Geri dön"
                >
                  <BackIcon />
                </button>
              ) : (
                <div />
              )}
              <div className="text-center text-sm font-medium tracking-[0.08em] text-slate-300/90">
                Adım 2 / 4
              </div>
              <div />
            </div>

            <div className="flex flex-1 flex-col pt-14">
              <div className="max-w-xl">
                <h1 className="max-w-[10ch] text-4xl font-bold leading-tight tracking-[-0.03em] text-white">
                  Gizliliğin Bizim
                  <br />
                  İçin Önemli
                </h1>

                <div className="mt-12 space-y-10">
                  <div>
                    <div className="flex items-center gap-3 text-[#14e1bf]">
                      <ShieldIcon />
                      <h2 className="text-2xl font-semibold tracking-[-0.02em]">Gizliliğini Koruyoruz</h2>
                    </div>
                    <p className="mt-3 max-w-4xl text-lg leading-8 text-slate-300">
                      Uygulamanın tam olarak çalışması için kişisel ve sağlıkla ilgili verilerinizi
                      işlememize onay vermeniz gerekmektedir.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-3 text-[#14e1bf]">
                      <LeafIcon />
                      <h2 className="text-2xl font-semibold tracking-[-0.02em]">Uygulamayı Geliştiriyoruz</h2>
                    </div>
                    <p className="mt-3 max-w-4xl text-lg leading-8 text-slate-300">
                      Gizlilik Politikamızda belirtildiği gibi, uygulamayı geliştirmek ve diğer
                      kullanıcılara sunmak için analiz araçları kullanıyoruz.
                    </p>
                  </div>
                </div>

                <div className="mt-12 rounded-[18px] border border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm">
                  <p className="m-0">
                    "Tümünü Kabul Et" butonuna tıklayarak veya devam ederek{" "}
                    <Link to="/terms" className="text-[#14e1bf] underline underline-offset-2">
                      Kullanım Koşulları
                    </Link>
                    'nı kabul etmiş ve{" "}
                    <Link to="/privacy" className="text-[#14e1bf] underline underline-offset-2">
                      Gizlilik Politikası
                    </Link>
                    'nı okuduğunuzu onaylamış olursunuz. Daha fazla bilgi için "Ayarları Aç"
                    seçeneğine tıklayın.
                  </p>
                  <p className="mt-3 mb-0 text-slate-500">
                    Verdiğim onayı uygulama ayarlarında istediğim zaman geri çekebilirim.
                  </p>
                </div>
              </div>

              <div className="mt-auto pt-10">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="min-h-[58px] w-full rounded-[18px] bg-[#18d7b1] px-5 text-lg font-semibold text-[#03252d] transition active:scale-[0.99]"
                >
                  Tümünü Kabul Et
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/privacy")}
                  className="mt-4 block w-full text-center text-lg font-medium text-[#14e1bf]"
                >
                  Ayarları Aç
                </button>
              </div>
            </div>
          </>
        ) : step === 3 ? (
          <>
            <div className="grid grid-cols-[48px_1fr_48px] items-center">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-slate-300 transition active:scale-[0.98]"
                aria-label="Geri dön"
              >
                <BackIcon />
              </button>
              <div className="text-center text-sm font-medium tracking-[0.08em] text-slate-300/90">
                Adım 3 / 4
              </div>
              <div />
            </div>

            <div className="flex flex-1 flex-col pt-14">
              <div className="max-w-5xl">
                <h1 className="max-w-[8ch] text-4xl font-bold leading-tight tracking-[-0.03em] text-white">
                  Hiçbir Dozu
                  <br />
                  Kaçırma
                </h1>
                <p className="mt-8 max-w-4xl text-lg leading-8 text-slate-300">
                  Sağlığını takipte tutmak için, telefonun sessizde olsa bile güvenilir
                  hatırlatıcılar göndermemiz için izin verilmelisin.
                </p>

                <div className="mt-10 rounded-[26px] bg-[linear-gradient(90deg,rgba(1,49,58,0.72),rgba(6,77,71,0.5),rgba(1,49,58,0.72))] px-6 py-8">
                  <div className="flex justify-center">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-400/15 text-[#14e1bf] shadow-[0_0_80px_rgba(20,225,191,0.14)]">
                      <BellIcon />
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-4 rounded-[18px] border border-white/5 bg-white/[0.05] px-4 py-5 backdrop-blur-sm">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-[#14e1bf]">
                      <BellIcon />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-[-0.02em] text-white">Kritik Uyarılar</h2>
                      <p className="mt-2 text-base leading-7 text-slate-300">
                        "Rahatsız Etmeyin" modunu geçerek acil ilaç hatırlatıcılarını anında
                        duyarsın.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 rounded-[18px] border border-white/5 bg-white/[0.05] px-4 py-5 backdrop-blur-sm">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-[#14e1bf]">
                      <ClockIcon />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-[-0.02em] text-white">Akıllı Erteleme</h2>
                      <p className="mt-2 text-base leading-7 text-slate-300">
                        Bir anlık mola mı lazım? Tek dokunuşla hatırlatıcıları 15 veya 30 dakika
                        ertele.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 rounded-[18px] border border-white/5 bg-white/[0.05] px-4 py-5 backdrop-blur-sm">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-[#14e1bf]">
                      <CheckListIcon />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-[-0.02em] text-white">Kaydet ve Takip Et</h2>
                      <p className="mt-2 text-base leading-7 text-slate-300">
                        Bildirimleri kaydırarak ilaçları alındı, atlandı veya ertelendi olarak
                        anında kaydet.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-10">
                <button
                  type="button"
                  onClick={handleEnableCriticalAlerts}
                  disabled={notificationLoading}
                  className="min-h-[58px] w-full rounded-[18px] bg-[#18d7b1] px-5 text-lg font-semibold text-[#03252d] transition active:scale-[0.99] disabled:opacity-70"
                >
                  {notificationLoading ? "İzin İsteniyor..." : "Kritik Uyarıları Etkinleştir"}
                </button>

                <button
                  type="button"
                  onClick={completeOnboarding}
                  className="mt-4 block w-full text-center text-lg font-medium text-slate-400"
                >
                  Belki Daha Sonra
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-[48px_1fr_48px] items-center">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-slate-300 transition active:scale-[0.98]"
                aria-label="Geri dön"
              >
                <BackIcon />
              </button>
              <div className="text-center text-sm font-medium tracking-[0.08em] text-slate-300/90">
                Adım 4 / 4
              </div>
              <div />
            </div>

            <div className="flex flex-1 flex-col pt-14">
              <div className="max-w-5xl">
                <h1 className="max-w-[9ch] text-4xl font-bold leading-tight tracking-[-0.03em] text-white">
                  Güvenin,
                  <br />
                  Taahhüdümüz
                </h1>

                <div className="mt-10 space-y-5">
                  <div className="flex items-start gap-4 rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-5 backdrop-blur-sm">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-[#14e1bf]">
                      <DocumentIcon />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-[-0.02em] text-white">Uyumluluk Kabulü</h2>
                      <p className="mt-2 text-base leading-7 text-slate-300">
                        Uygulamanın kullanım kurallarını ve tıbbi feragatnameyi kabul ediyorum.{" "}
                        <Link to="/medical-disclaimer" className="text-[#14e1bf]">
                          Daha Fazla Oku
                        </Link>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-5 backdrop-blur-sm">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-[#14e1bf]">
                      <LockIcon />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-[-0.02em] text-white">Veri Kullanım Onayı</h2>
                      <p className="mt-2 text-base leading-7 text-slate-300">
                        Deneyimimi kişiselleştirmek için verilerimin kullanılmasına onay veriyorum.{" "}
                        <Link to="/privacy" className="text-[#14e1bf]">
                          Gizlilik Politikasını Görüntüle
                        </Link>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-5 backdrop-blur-sm">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-[#14e1bf]">
                      <TermsIcon />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-[-0.02em] text-white">Şartlar ve Koşullar</h2>
                      <p className="mt-2 text-base leading-7 text-slate-300">
                        Uygulamanın kullanım şartlarını ve koşullarını kabul ediyorum.{" "}
                        <Link to="/terms" className="text-[#14e1bf]">
                          Tam Detayları Görüntüle
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>

                <label className="mt-10 flex items-center gap-3 text-base text-slate-300">
                  <input
                    type="checkbox"
                    checked={trustAccepted}
                    onChange={(event) => setTrustAccepted(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="flex h-6 w-6 items-center justify-center rounded-md border border-white/30 bg-white/[0.02] transition peer-checked:border-[#18d7b1] peer-checked:bg-[#18d7b1]">
                    <svg
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      className="h-4 w-4 scale-75 text-[#03252d] opacity-0 transition peer-checked:scale-100 peer-checked:opacity-100"
                    >
                      <path
                        d="m5 10 3 3 7-7"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.2"
                      />
                    </svg>
                  </span>
                  <span>Tüm politikaları okudum ve kabul ediyorum</span>
                </label>
              </div>

              <div className="mt-auto pt-10">
                <button
                  type="button"
                  onClick={completeOnboarding}
                  disabled={!trustAccepted}
                  className="min-h-[58px] w-full rounded-[18px] bg-[#18d7b1] px-5 text-lg font-semibold text-[#03252d] transition active:scale-[0.99] disabled:opacity-50"
                >
                  Devam Et
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

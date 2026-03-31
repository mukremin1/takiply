import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/useAuth";
import { readInitialSetupComplete } from "../lib/profile-storage";

const initialForm = {
  name: "",
  email: "",
  password: ""
};

const ONBOARDING_STORAGE_KEY = "takiply-onboarding-seen";
const REAUTH_NOTICE_STORAGE_KEY = "takiply-security-reauth-notice";

function getPostAuthRoute() {
  const hasSeenOnboarding = window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
  const hasCompletedInitialSetup = readInitialSetupComplete();

  if (!hasSeenOnboarding) {
    return "/onboarding";
  }

  if (!hasCompletedInitialSetup) {
    return "/profile-setup";
  }

  return "/home";
}

function validateEmail(value) {
  return /\S+@\S+\.\S+/.test(value);
}

function LeafMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M19 5c-4.8-.4-8.35.9-10.67 3.23C5.68 10.88 5 14.47 5 19c4.53 0 8.12-.68 10.77-3.33C18.1 13.35 19.4 9.8 19 5Z" />
      <path d="M8 14c1.4-1.2 3.38-2.12 5.95-2.75" strokeLinecap="round" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.8 12.23c0-.72-.06-1.25-.2-1.8H12v3.41h5.64c-.11.85-.73 2.14-2.09 3l-.02.11 3.02 2.34.21.02c1.96-1.81 3.04-4.47 3.04-7.08Z"
      />
      <path
        fill="currentColor"
        d="M12 22c2.76 0 5.08-.91 6.77-2.48l-3.23-2.5c-.86.6-2.01 1.02-3.54 1.02-2.7 0-4.99-1.78-5.81-4.24l-.1.01-3.14 2.43-.03.1C4.6 19.76 8 22 12 22Z"
      />
      <path
        fill="currentColor"
        d="M6.19 13.8A5.98 5.98 0 0 1 5.85 12c0-.62.11-1.22.31-1.8l-.01-.12-3.18-2.47-.1.05A10 10 0 0 0 2 12c0 1.6.38 3.1 1.05 4.44l3.14-2.64Z"
      />
      <path
        fill="currentColor"
        d="M12 5.96c1.93 0 3.23.84 3.97 1.54l2.9-2.82C17.07 3 14.76 2 12 2 8 2 4.6 4.24 2.87 7.56l3.29 2.54C7.01 7.74 9.3 5.96 12 5.96Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 !text-white" fill="currentColor" aria-hidden="true">
      <path d="M15.18 3.5c.07.83-.24 1.63-.77 2.2-.63.68-1.67 1.2-2.54 1.13-.1-.81.27-1.67.8-2.22.58-.62 1.59-1.08 2.51-1.11Z" />
      <path d="M19.74 17.47c-.46 1.03-.68 1.49-1.27 2.42-.82 1.31-1.98 2.93-3.42 2.94-1.28.02-1.61-.84-3.35-.83-1.74 0-2.1.85-3.38.82-1.43-.02-2.53-1.48-3.36-2.79-2.34-3.57-2.58-7.76-1.14-9.97 1.03-1.58 2.65-2.51 4.18-2.51 1.56 0 2.54.86 3.83.86 1.25 0 2.01-.87 3.81-.87 1.36 0 2.8.74 3.83 2.02-3.37 1.85-2.82 6.69.27 7.91Z" />
    </svg>
  );
}

function InputField({ label, compact = false, ...props }) {
  return (
    <label className="block text-left">
      <span className={["block font-medium text-[#f2fffd]", compact ? "mb-1.5 text-[13px]" : "mb-2 text-sm"].join(" ")}>
        {label}
      </span>
      <input
        {...props}
        className={[
          "w-full rounded-[18px] border border-white/20 bg-white/[0.14] px-4 text-[15px] text-white outline-none placeholder:text-white/80 focus:border-[#14d7bf] focus:bg-white/[0.18]",
          compact ? "h-12" : "h-14"
        ].join(" ")}
      />
    </label>
  );
}

function SocialButton({ children, dark = false, icon, ...props }) {
  return (
    <button
      {...props}
      className={[
        "flex h-[51px] w-full items-center justify-center gap-3 rounded-[16px] border px-4 text-[17px] font-semibold leading-none tracking-[-0.02em] transition disabled:cursor-not-allowed disabled:opacity-50",
        dark
          ? "border-white/80 bg-black !text-white"
          : "!border-white/80 !bg-white !text-[#03252d] shadow-[0_12px_30px_rgba(255,255,255,0.12)]"
      ].join(" ")}
    >
      <span className={["inline-flex w-4 shrink-0 items-center justify-center", dark ? "!text-white" : ""].join(" ")}>
        {icon}
      </span>
      <span className={["truncate", dark ? "!text-white" : ""].join(" ")}>{children}</span>
    </button>
  );
}

export default function Auth() {
  const { isAuthenticated, signIn, signUp, signInWithGoogle, signInWithApple, configError } =
    useAuth();
  const postAuthRoute = getPostAuthRoute();
  const [activeTab, setActiveTab] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const showAppleButton = true;
  const isCompactEmailView = showEmailForm && activeTab === "register";

  useEffect(() => {
    const mustReauth = window.localStorage.getItem(REAUTH_NOTICE_STORAGE_KEY) === "1";
    if (!mustReauth) {
      return;
    }

    window.localStorage.removeItem(REAUTH_NOTICE_STORAGE_KEY);
    setShowEmailForm(true);
    setActiveTab("login");
    setError("Güvenlik amacıyla lütfen tekrar giriş yapın.");
  }, []);

  if (isAuthenticated) {
    return <Navigate to={postAuthRoute} replace />;
  }

  const updateField = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const clearMessage = () => setError("");

  const switchTab = (tab) => {
    setActiveTab(tab);
    setShowEmailForm(false);
    clearMessage();
  };

  const submit = async (event) => {
    event.preventDefault();
    clearMessage();

    if (configError) {
      setError(configError);
      return;
    }

    if (!validateEmail(form.email)) {
      setError("Geçerli bir e-posta girin.");
      return;
    }

    if (form.password.length < 6) {
      setError("Şifre en az 6 karakter olmalı.");
      return;
    }

    if (activeTab === "register" && form.name.trim().length < 2) {
      setError("Ad soyad en az 2 karakter olmalı.");
      return;
    }

    setLoading(true);
    try {
      if (activeTab === "login") {
        await signIn({ email: form.email, password: form.password });
      } else {
        await signUp({ name: form.name, email: form.email, password: form.password });
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Giriş işlemi başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const socialSignIn = async (provider) => {
    clearMessage();

    if (configError) {
      setError(configError);
      return;
    }

    setLoading(true);
    try {
      if (provider === "google") {
        await signInWithGoogle();
      } else {
        await signInWithApple();
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Sosyal giriş başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative isolate min-h-screen min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#02171d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(20,179,150,0.25),transparent_18%),linear-gradient(180deg,#021820_0%,#041720_46%,#031018_100%)]" />
      <div className="absolute left-1/2 top-[18%] h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-[rgba(16,148,129,0.12)] blur-3xl" />

      <div
        className={[
          "relative z-10 flex min-h-[100dvh] flex-col px-[14px] pt-[max(0.25rem,env(safe-area-inset-top))]",
          showEmailForm
            ? "justify-start pb-[max(12px,calc(env(safe-area-inset-bottom)+12px))]"
            : "pb-[max(14px,env(safe-area-inset-bottom))]"
        ].join(" ")}
      >
        <div className="text-center text-[14px] font-medium text-[#d7edf1]">Adım 1 / 4</div>

        <div
          className={[
            "flex flex-1 flex-col items-center text-center",
            showEmailForm ? "justify-start pb-4 pt-4" : "justify-center pb-[136px] pt-[54px]"
          ].join(" ")}
        >
          <div
            className={[
              "relative flex items-center justify-center transition-all",
              isCompactEmailView ? "h-[88px] w-[88px]" : showEmailForm ? "h-[112px] w-[112px]" : "h-[182px] w-[182px]"
            ].join(" ")}
          >
            <div
              className={[
                "absolute rounded-full bg-[#0e6d66]/24",
                isCompactEmailView ? "h-[88px] w-[88px]" : showEmailForm ? "h-[112px] w-[112px]" : "h-[172px] w-[172px]"
              ].join(" ")}
            />
            <div
              className={[
                "absolute rounded-full bg-[#0fa596]/48 shadow-[0_0_34px_rgba(16,185,166,0.12)]",
                isCompactEmailView ? "h-[60px] w-[60px]" : showEmailForm ? "h-[78px] w-[78px]" : "h-[122px] w-[122px]"
              ].join(" ")}
            />
            <div
              className={[
                "absolute rounded-full bg-[#10b39f]/82",
                isCompactEmailView ? "h-[40px] w-[40px]" : showEmailForm ? "h-[52px] w-[52px]" : "h-[76px] w-[76px]"
              ].join(" ")}
            />
            <div
              className={[
                "absolute flex items-center justify-center rounded-full bg-[#0fae9a]",
                isCompactEmailView ? "h-[28px] w-[28px]" : showEmailForm ? "h-[36px] w-[36px]" : "h-[54px] w-[54px]"
              ].join(" ")}
            >
              <div
                className={[
                  "flex items-center justify-center text-[#22f3d6]",
                  isCompactEmailView ? "h-[14px] w-[14px]" : showEmailForm ? "h-[17px] w-[17px]" : "h-[22px] w-[22px]"
                ].join(" ")}
              >
                <LeafMark />
              </div>
            </div>
          </div>

          <h1
            className={[
              "max-w-[280px] font-bold leading-[1.16] tracking-[-0.03em] !text-white",
              isCompactEmailView ? "mt-3 text-[21px]" : showEmailForm ? "mt-5 text-[24px]" : "mt-[50px] text-[31px]"
            ].join(" ")}
          >
            Gün Gün
            <br />
            Vücudunu Anla
          </h1>
          <p
            className={[
              "max-w-[290px] text-[#c6d8dc]",
              isCompactEmailView ? "mt-2 text-[13px] leading-5" : showEmailForm ? "mt-3 text-[14px] leading-6" : "mt-[18px] text-[16px] leading-7"
            ].join(" ")}
          >
            İlaçlarını takip et, sağlığını yönet.
          </p>
        </div>

        <div
          className={[
            isCompactEmailView ? "space-y-2.5" : showEmailForm ? "space-y-[10px]" : "space-y-[12px]",
            showEmailForm ? "pb-[max(8px,env(safe-area-inset-bottom))]" : ""
          ].join(" ")}
        >
          {showEmailForm ? (
            <form
              onSubmit={submit}
              className={[
                "max-h-[calc(100dvh-180px)] overflow-y-auto rounded-[26px] border border-white/18 bg-white/[0.11] backdrop-blur-sm",
                isCompactEmailView ? "mb-2 p-3" : "mb-3 p-3.5"
              ].join(" ")}
            >
              <div className={["flex rounded-full border border-white/14 bg-black/30 p-1", isCompactEmailView ? "mb-2.5" : "mb-3"].join(" ")}>
                <button
                  type="button"
                  onClick={() => switchTab("login")}
                  className={[
                    "flex-1 rounded-full font-semibold transition",
                    isCompactEmailView ? "h-9 text-[13px]" : "h-10 text-sm",
                    activeTab === "login"
                      ? "bg-[linear-gradient(180deg,#22ebc8_0%,#13d9bc_100%)] text-[#04262f]"
                      : "text-[#e4f7f7] hover:bg-white/8"
                  ].join(" ")}
                >
                  Giriş Yap
                </button>
                <button
                  type="button"
                  onClick={() => switchTab("register")}
                  className={[
                    "flex-1 rounded-full font-semibold transition",
                    isCompactEmailView ? "h-9 text-[13px]" : "h-10 text-sm",
                    activeTab === "register"
                      ? "bg-[linear-gradient(180deg,#22ebc8_0%,#13d9bc_100%)] text-[#04262f]"
                      : "text-[#e4f7f7] hover:bg-white/8"
                  ].join(" ")}
                >
                  Kayıt Ol
                </button>
              </div>

              <div className={isCompactEmailView ? "space-y-2" : "space-y-2.5"}>
                {activeTab === "register" ? (
                  <InputField
                    label="Ad Soyad"
                    compact={isCompactEmailView}
                    value={form.name}
                    onChange={updateField("name")}
                    type="text"
                    placeholder="Ad Soyad"
                    autoComplete="name"
                  />
                ) : null}

                <InputField
                  label="E-posta"
                  compact={isCompactEmailView}
                  value={form.email}
                  onChange={updateField("email")}
                  type="email"
                  placeholder="ornek@mail.com"
                  autoComplete="email"
                />

                <InputField
                  label="Şifre"
                  compact={isCompactEmailView}
                  value={form.password}
                  onChange={updateField("password")}
                  type="password"
                  placeholder="******"
                  autoComplete={activeTab === "login" ? "current-password" : "new-password"}
                />

                {error ? (
                  <p className={isCompactEmailView ? "text-[13px] font-medium text-[#ff8c8c]" : "text-sm font-medium text-[#ff8c8c]"}>
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading || Boolean(configError)}
                  className={[
                    "w-full rounded-[18px] bg-[#15d5b6] font-bold text-[#03262f] disabled:opacity-50",
                    isCompactEmailView ? "h-11 text-[15px]" : "h-12 text-[16px]"
                  ].join(" ")}
                >
                  {loading ? "İşleniyor..." : activeTab === "login" ? "E-posta ile Giriş Yap" : "Hesap Oluştur"}
                </button>
              </div>
            </form>
          ) : null}

          <SocialButton
            type="button"
            onClick={() => socialSignIn("google")}
            disabled={loading || Boolean(configError)}
            icon={<GoogleIcon />}
          >
            Google ile Devam Et
          </SocialButton>

          {showAppleButton ? (
            <SocialButton
              type="button"
              onClick={() => socialSignIn("apple")}
              disabled={loading || Boolean(configError)}
              dark
              icon={<AppleIcon />}
            >
              Apple ile Devam Et
            </SocialButton>
          ) : null}

          <div className="flex items-center gap-3 pt-[8px] text-[12px] text-[#6f8b92]">
            <span className="h-px flex-1 bg-white/16" />
            <span>veya</span>
            <span className="h-px flex-1 bg-white/16" />
          </div>

          <button
            type="button"
            onClick={() => {
              setShowEmailForm((previous) => !previous);
              clearMessage();
            }}
            disabled={loading}
            className="min-h-[52px] w-full rounded-[16px] bg-[#15d5b6] text-[18px] font-semibold tracking-[-0.02em] text-[#03252d] disabled:opacity-50"
          >
            E-posta ile Başla
          </button>

          {configError ? <p className="px-1 text-sm text-[#ff8c8c]">{configError}</p> : null}

          {showEmailForm ? (
            <>
              <div className={isCompactEmailView ? "pt-0.5 text-center text-[13px] text-[#d8e8eb]" : "pt-1 text-center text-[14px] text-[#d8e8eb]"}>
                {activeTab === "login" ? "Hesabın yok mu?" : "Zaten hesabın var mı?"}{" "}
                <button
                  type="button"
                  onClick={() => switchTab(activeTab === "login" ? "register" : "login")}
                  className="font-semibold text-[#d7fffa]"
                >
                  {activeTab === "login" ? "Kayıt Ol" : "Giriş Yap"}
                </button>
              </div>

              <p className={isCompactEmailView ? "px-2 pb-0.5 text-center text-[11px] leading-4 text-[#cfe1e5]" : "px-3 pb-1 text-center text-[12px] leading-5 text-[#cfe1e5]"}>
                Devam ederek{" "}
                <Link to="/terms" className="text-[#e5fffb] underline underline-offset-2">
                  Kullanım Koşulları
                </Link>{" "}
                ve{" "}
                <Link to="/privacy" className="text-[#e5fffb] underline underline-offset-2">
                  Gizlilik
                </Link>{" "}
                metinlerini kabul edersin.
              </p>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}


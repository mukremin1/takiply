import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  updateProfile
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { AuthContext } from "./auth-context";
import { auth, firebaseConfigError } from "./firebase";

const REAUTH_AT_STORAGE_KEY = "takiply-security-reauth-at";
const REAUTH_NOTICE_STORAGE_KEY = "takiply-security-reauth-notice";
const REAUTH_MIN_DAYS = 5;
const REAUTH_MAX_DAYS = 12;

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function getRandomReauthTimestamp(now = Date.now()) {
  const dayCount = Math.floor(Math.random() * (REAUTH_MAX_DAYS - REAUTH_MIN_DAYS + 1)) + REAUTH_MIN_DAYS;
  const jitterHours = Math.floor(Math.random() * 24);
  return now + (dayCount * 24 + jitterHours) * 60 * 60 * 1000;
}

function scheduleNextReauth() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(REAUTH_AT_STORAGE_KEY, String(getRandomReauthTimestamp()));
}

function markPeriodicReauthNotice() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(REAUTH_NOTICE_STORAGE_KEY, "1");
}

function shouldRequirePeriodicReauth(now = Date.now()) {
  if (typeof window === "undefined") {
    return false;
  }

  const rawTimestamp = window.localStorage.getItem(REAUTH_AT_STORAGE_KEY);
  if (!rawTimestamp) {
    scheduleNextReauth();
    return false;
  }

  const targetTimestamp = Number(rawTimestamp);
  if (!Number.isFinite(targetTimestamp)) {
    scheduleNextReauth();
    return false;
  }

  return now >= targetTimestamp;
}

function mapFirebaseError(error) {
  const errorCode = error?.code ?? "";
  const errorMessage = String(error?.message ?? "");

  switch (errorCode) {
    case "auth/email-already-in-use":
      return "Bu e-posta zaten kayıtlı.";
    case "auth/invalid-email":
      return "E-posta formatı geçersiz.";
    case "auth/weak-password":
      return "Şifre çok zayıf. Daha güçlü bir şifre girin.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "E-posta veya şifre hatalı.";
    case "auth/network-request-failed":
      return "Bağlantı hatası. İnternet bağlantınızı ve Firebase ayarlarınızı kontrol edin.";
    case "auth/popup-closed-by-user":
      return "Giriş penceresi kapatıldı.";
    case "auth/cancelled-popup-request":
      return "Birden fazla popup isteği gönderildi. Tekrar deneyin.";
    case "auth/operation-not-allowed":
      return "Bu giriş yöntemi Firebase Console'da aktif değil.";
    case "auth/unauthorized-domain":
      return "Bu domain Firebase Authentication için yetkili değil.";
    case "auth/operation-not-supported-in-this-environment":
      return "Bu platformda web tabanlı sosyal giriş desteklenmiyor. Native giriş ayarları kontrol edilmeli.";
    default:
      if (errorMessage.includes("DEVELOPER_ERROR") || errorMessage.includes("12500")) {
        return "Google girişi ayarları eksik. Firebase'e Android SHA-1/SHA-256 imzalarını ekleyin.";
      }
      return errorMessage || "Kimlik doğrulama işlemi başarısız.";
  }
}

function formatUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.uid,
    name: user.displayName || "Kullanıcı",
    email: user.email || "",
    provider: user.providerData?.[0]?.providerId || "password"
  };
}

function getAuthOrThrow() {
  if (firebaseConfigError || !auth) {
    throw new Error(firebaseConfigError || "Firebase başlatılamadı.");
  }

  return auth;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(() => !firebaseConfigError && Boolean(auth));

  useEffect(() => {
    if (!auth || firebaseConfigError) {
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && shouldRequirePeriodicReauth()) {
        markPeriodicReauthNotice();
        await firebaseSignOut(auth).catch(() => null);
        if (Capacitor.isNativePlatform()) {
          await FirebaseAuthentication.signOut().catch(() => null);
        }
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      setCurrentUser(formatUser(user));
      setLoading(false);
    });

    getRedirectResult(auth).catch(() => null);

    return unsubscribe;
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const normalizedEmail = normalizeEmail(email);
    try {
      const authInstance = getAuthOrThrow();
      const result = await signInWithEmailAndPassword(authInstance, normalizedEmail, password);
      scheduleNextReauth();
      return formatUser(result.user);
    } catch (error) {
      throw new Error(mapFirebaseError(error));
    }
  }, []);

  const signUp = useCallback(async ({ name, email, password }) => {
    const normalizedEmail = normalizeEmail(email);
    try {
      const authInstance = getAuthOrThrow();
      const credential = await createUserWithEmailAndPassword(authInstance, normalizedEmail, password);

      if (name.trim()) {
        await updateProfile(credential.user, { displayName: name.trim() });
      }

      scheduleNextReauth();
      return formatUser({
        ...credential.user,
        displayName: name.trim() || credential.user.displayName
      });
    } catch (error) {
      throw new Error(mapFirebaseError(error));
    }
  }, []);

  const signInWithProvider = useCallback(async (provider) => {
    try {
      const authInstance = getAuthOrThrow();

      if (provider === "google" && Capacitor.isNativePlatform()) {
        // Clear any cached Google session first so the account chooser can show all device accounts.
        await FirebaseAuthentication.signOut().catch(() => null);
        const nativeResult = await FirebaseAuthentication.signInWithGoogle({
          skipNativeAuth: true,
          useCredentialManager: true
        });
        const credential = nativeResult?.credential;
        const idToken = credential?.idToken;
        const accessToken = credential?.accessToken;

        if (!idToken && !accessToken) {
          throw new Error("Google kimlik bilgisi alınamadı.");
        }

        const firebaseCredential = GoogleAuthProvider.credential(idToken || null, accessToken || null);
        const result = await signInWithCredential(authInstance, firebaseCredential);
        scheduleNextReauth();
        return formatUser(result.user);
      }

      const providerInstance =
        provider === "google" ? new GoogleAuthProvider() : new OAuthProvider("apple.com");

      if (provider === "google") {
        providerInstance.setCustomParameters({
          prompt: "select_account"
        });
      }

      if (provider === "apple") {
        providerInstance.addScope("email");
        providerInstance.addScope("name");
      }

      if (Capacitor.isNativePlatform()) {
        await signInWithRedirect(authInstance, providerInstance);
        return null;
      }

      const result = await signInWithPopup(authInstance, providerInstance);
      scheduleNextReauth();
      return formatUser(result.user);
    } catch (error) {
      throw new Error(mapFirebaseError(error));
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!auth || firebaseConfigError) {
      setCurrentUser(null);
      if (Capacitor.isNativePlatform()) {
        await FirebaseAuthentication.signOut().catch(() => null);
      }
      return;
    }

    await firebaseSignOut(auth);

    if (Capacitor.isNativePlatform()) {
      await FirebaseAuthentication.signOut().catch(() => null);
    }
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      loading,
      configError: firebaseConfigError,
      isAuthenticated: Boolean(currentUser),
      signIn,
      signUp,
      signInWithGoogle: () => signInWithProvider("google"),
      signInWithApple: () => signInWithProvider("apple"),
      signOut
    }),
    [currentUser, loading, signIn, signOut, signInWithProvider, signUp]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  initializeAuth
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"];
const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);

export const firebaseConfigError =
  missingKeys.length > 0
    ? `Firebase ayarları eksik: ${missingKeys.join(", ")}. .env dosyasına VITE_FIREBASE_* değerlerini ekleyin.`
    : "";

const app = firebaseConfigError ? null : initializeApp(firebaseConfig);

export const auth = app
  ? initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
      popupRedirectResolver: typeof window === "undefined" ? undefined : browserPopupRedirectResolver
    })
  : null;

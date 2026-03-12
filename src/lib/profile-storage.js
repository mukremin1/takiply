export const PROFILE_STORAGE_KEY = "takiply-user-profile-v1";
export const INITIAL_SETUP_STORAGE_KEY = "takiply-initial-setup-complete";

export const defaultProfile = {
  fullName: "",
  birthDate: "",
  gender: "",
  heightCm: "",
  weightKg: "",
  avatarDataUrl: "",
  chronicConditions: [],
  medicationAllergies: []
};

export function readStoredProfile() {
  if (typeof window === "undefined") {
    return defaultProfile;
  }

  const saved = window.localStorage.getItem(PROFILE_STORAGE_KEY);

  if (!saved) {
    return defaultProfile;
  }

  try {
    const parsed = JSON.parse(saved);

    if (!parsed || typeof parsed !== "object") {
      return defaultProfile;
    }

    return {
      ...defaultProfile,
      ...parsed
    };
  } catch {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    return defaultProfile;
  }
}

export function writeStoredProfile(profile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    PROFILE_STORAGE_KEY,
    JSON.stringify({
      ...defaultProfile,
      ...profile
    })
  );
}

export function readInitialSetupComplete() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(INITIAL_SETUP_STORAGE_KEY) === "true";
}

export function writeInitialSetupComplete(value) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(INITIAL_SETUP_STORAGE_KEY, value ? "true" : "false");
}

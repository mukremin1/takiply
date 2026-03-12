export const FAMILY_STORAGE_KEY = "takiply-family-data-v1";

export function generateFamilyCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 8; index += 1) {
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    code += alphabet[randomIndex];
  }

  return code;
}

export const defaultFamilyData = {
  familyCode: generateFamilyCode(),
  careModeEnabled: true,
  members: []
};

export function readStoredFamily() {
  if (typeof window === "undefined") {
    return defaultFamilyData;
  }

  try {
    const saved = window.localStorage.getItem(FAMILY_STORAGE_KEY);

    if (!saved) {
      const seeded = {
        ...defaultFamilyData,
        familyCode: generateFamilyCode()
      };
      writeStoredFamily(seeded);
      return seeded;
    }

    const parsed = JSON.parse(saved);
    const next = {
      ...defaultFamilyData,
      ...parsed,
      familyCode: parsed?.familyCode || generateFamilyCode(),
      members: Array.isArray(parsed?.members) ? parsed.members : []
    };

    writeStoredFamily(next);
    return next;
  } catch {
    const seeded = {
      ...defaultFamilyData,
      familyCode: generateFamilyCode()
    };
    window.localStorage.removeItem(FAMILY_STORAGE_KEY);
    writeStoredFamily(seeded);
    return seeded;
  }
}

export function writeStoredFamily(data) {
  window.localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(data));
}

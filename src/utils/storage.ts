import type { UserData } from "../types/auth";
import { getCookie, removeCookie, setCookie } from "./cookies";

/** Cookie keys (client-readable). Session login cookie is HttpOnly from backend. */
export const StorageKeys = {
  USER_DATA: "idunrx_userData",
  /** Chat / MD Integrations token only — NOT panel login_token */
  AUTH_TOKEN: "idunrx_authToken",
  PRODUCT_CATEGORY: "idunrx_productCategory",
  PATIENTID: "idunrx_patientId",
} as const;

/** Legacy localStorage keys to migrate / clear */
const LEGACY_KEYS = [
  "userData",
  "authToken",
  "login_token",
  "productCategory",
  "patientId",
  StorageKeys.USER_DATA,
  StorageKeys.AUTH_TOKEN,
  StorageKeys.PRODUCT_CATEGORY,
  StorageKeys.PATIENTID,
] as const;

function migrateFromLocalStorage(cookieKey: string, legacyKey: string): string | null {
  const existing = getCookie(cookieKey);
  if (existing) return existing;
  try {
    const legacy = localStorage.getItem(legacyKey);
    if (legacy) {
      setCookie(cookieKey, legacy);
      localStorage.removeItem(legacyKey);
      return legacy;
    }
  } catch {
    // ignore
  }
  return null;
}

export const storage = {
  setUserData: (data: UserData) => {
    const value = JSON.stringify(data);
    setCookie(StorageKeys.USER_DATA, value);
    try {
      localStorage.setItem(StorageKeys.USER_DATA, value);
    } catch {
      // iOS private mode can block localStorage
    }
  },

  getUserData: (): UserData | null => {
    let data = getCookie(StorageKeys.USER_DATA);
    if (!data) {
      try {
        data = localStorage.getItem(StorageKeys.USER_DATA);
      } catch {
        data = null;
      }
    }
    if (!data) {
      data = migrateFromLocalStorage(StorageKeys.USER_DATA, "userData");
    }
    if (!data) return null;
    try {
      return JSON.parse(data) as UserData;
    } catch {
      return null;
    }
  },

  /** Chat token for MD Integrations Bearer — not panel session login_token */
  setAuthToken: (token: string) => {
    setCookie(StorageKeys.AUTH_TOKEN, token);
  },

  getAuthToken: () => {
    return (
      getCookie(StorageKeys.AUTH_TOKEN) ??
      migrateFromLocalStorage(StorageKeys.AUTH_TOKEN, "authToken")
    );
  },

  setPatientId: (patientId: string) => {
    setCookie(StorageKeys.PATIENTID, patientId);
  },

  getPatientId: () => {
    return (
      getCookie(StorageKeys.PATIENTID) ??
      migrateFromLocalStorage(StorageKeys.PATIENTID, "patientId")
    );
  },

  setProductCategory: (category: string) => {
    setCookie(StorageKeys.PRODUCT_CATEGORY, category);
  },

  getProductCategory: () => {
    return (
      getCookie(StorageKeys.PRODUCT_CATEGORY) ??
      migrateFromLocalStorage(StorageKeys.PRODUCT_CATEGORY, "productCategory")
    );
  },

  clearAuth: () => {
    removeCookie(StorageKeys.USER_DATA);
    removeCookie(StorageKeys.AUTH_TOKEN);
    removeCookie(StorageKeys.PRODUCT_CATEGORY);
    removeCookie(StorageKeys.PATIENTID);
    removeCookie("XSRF-TOKEN");
    removeCookie("idunrx_session");
    removeCookie("login_token");

    try {
      for (const key of LEGACY_KEYS) {
        localStorage.removeItem(key);
      }
      sessionStorage.removeItem("login_token");
      sessionStorage.removeItem("authToken");
    } catch {
      // ignore
    }
  },
};

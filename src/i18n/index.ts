import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { ru } from "./ru";

export const LANGUAGES = [
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
] as const;

export type Language = (typeof LANGUAGES)[number]["code"];

export function systemLanguage(): Language {
  return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
}

/** Applies a saved preference; `null` follows the system language. */
export function applyLanguage(preference: string | null | undefined) {
  const lang = LANGUAGES.some((l) => l.code === preference)
    ? (preference as Language)
    : systemLanguage();
  if (i18n.language !== lang) i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ru: { translation: ru } },
  lng: systemLanguage(),
  fallbackLng: "en",
  returnObjects: true,
  interpolation: { escapeValue: false },
});

export default i18n;

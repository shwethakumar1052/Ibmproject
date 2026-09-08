/**
 * GovMatch AI — i18n index
 * Loads JSON locale files and wires the dynamic backend translation proxy.
 * Additive: replaces the inline resources in src/i18n.js with file-based ones.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import axios from "axios";

import en from "./locales/en.json";
import hi from "./locales/hi.json";
import kn from "./locales/kn.json";
import mr from "./locales/mr.json";
import ta from "./locales/ta.json";
import te from "./locales/te.json";

// ── Language → BCP-47 speech locale map ──────────────────────
export const SPEECH_LOCALES = {
  en: "en-IN",
  hi: "hi-IN",
  kn: "kn-IN",
  ta: "ta-IN",
  te: "te-IN",
  mr: "mr-IN",
};

// ── Dynamic scheme text translation ──────────────────────────
const _translationCache = new Map();

export async function translateSchemeField(text, targetLang) {
  if (!text || targetLang === "en") return text;
  const key = `${targetLang}::${text.slice(0, 100)}`;
  if (_translationCache.has(key)) return _translationCache.get(key);
  try {
    const res = await axios.post("/api/translate", { text, targetLang });
    const translated = res.data.translated || text;
    _translationCache.set(key, translated);
    return translated;
  } catch {
    return text;  // graceful fallback
  }
}

/**
 * Translate a full scheme object's key fields for display.
 * Returns a new object with translated strings.
 */
export async function translateScheme(scheme, targetLang) {
  if (!scheme || targetLang === "en") return scheme;
  const [name, brief, benefits, eligibility] = await Promise.all([
    translateSchemeField(scheme.name,              targetLang),
    translateSchemeField(scheme.brief_description, targetLang),
    translateSchemeField(scheme.benefits,          targetLang),
    translateSchemeField(scheme.eligibility,       targetLang),
  ]);
  return { ...scheme, name, brief_description: brief, benefits, eligibility };
}

// ── i18next setup ─────────────────────────────────────────────
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        hi: { translation: hi },
        kn: { translation: kn },
        mr: { translation: mr },
        ta: { translation: ta },
        te: { translation: te },
      },
      fallbackLng: "en",
      supportedLngs: ["en", "hi", "kn", "mr", "ta", "te"],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "govmatch_lang"
      }
    });
}

export default i18n;

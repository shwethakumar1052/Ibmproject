/**
 * src/i18n.js — re-exports the modular i18n instance from src/i18n/index.js
 * Kept as a passthrough so existing imports (`import "./i18n"`) keep working.
 */
export { default, translateSchemeField, translateScheme, SPEECH_LOCALES } from "./i18n/index.js";

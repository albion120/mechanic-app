import { useSyncExternalStore } from "react";
import translations from "./locales/translations.json";
import marketplace from "./locales/marketplace.json";

export const languages = { sq: "Shqip", en: "English", de: "Deutsch" };
const listeners = new Set();
export function getLanguage() {
  try {
    const saved = localStorage.getItem("language");
    if (languages[saved]) return saved;
  } catch { /* Storage may be disabled. */ }
  const browser = globalThis.navigator?.language?.split("-")[0];
  return languages[browser] ? browser : "sq";
}
let memoryLanguage;
export const currentLanguage = () => memoryLanguage || getLanguage();
export function setLanguage(language) {
  if (!languages[language]) return;
  memoryLanguage = language;
  try { localStorage.setItem("language", language); } catch { /* Session override still works. */ }
  if (typeof document !== "undefined") document.documentElement.lang = language;
  listeners.forEach(listener => listener());
}
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export const useLanguage = () => useSyncExternalStore(subscribe, currentLanguage, () => "sq");
// Natural Albanian keys preserve existing copy while resources hold every locale.
export function t(key, values = {}) {
  const text = marketplace[key]?.[currentLanguage()] ?? translations[key]?.[currentLanguage()] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
}
export const dateLocale = () => ({ sq: "sq-AL", en: "en-GB", de: "de-DE" })[currentLanguage()];

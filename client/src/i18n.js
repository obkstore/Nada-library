import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar.json';
import en from './locales/en.json';

// Arabic is the default. No browser-language detection:
// the URL prefix (/:lang) is the source of truth (change #4).
// localStorage ('lang') is ONLY read when redirecting "/" (saved language, else 'ar').
i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: 'ar',
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
});

export function syncDocumentLang(lang) {
  const safe = lang === 'en' ? 'en' : 'ar';
  document.documentElement.lang = safe;
  document.documentElement.dir = safe === 'ar' ? 'rtl' : 'ltr';
}

export default i18n;

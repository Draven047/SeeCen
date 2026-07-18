// SeeCen i18n — English strings ARE the keys. Components wrap user-facing
// text in t('…'); languages are flat English→translation dictionaries in
// ./locales. Missing entries fall back to the English key, so partial
// dictionaries degrade gracefully.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import hi from './locales/hi';
import ta from './locales/ta';
import te from './locales/te';
import bn from './locales/bn';
import mr from './locales/mr';

export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'mr', label: 'मराठी' },
];

function storedLanguage(): string {
  try { return localStorage.getItem('seecen-lang') || 'en'; } catch { return 'en'; }
}

i18n.use(initReactI18next).init({
  resources: {
    hi: { translation: hi },
    ta: { translation: ta },
    te: { translation: te },
    bn: { translation: bn },
    mr: { translation: mr },
  },
  lng: storedLanguage(),
  fallbackLng: 'en',
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
});

export function setLanguage(code: string) {
  i18n.changeLanguage(code);
  try { localStorage.setItem('seecen-lang', code); } catch { /* storage unavailable */ }
}

export default i18n;

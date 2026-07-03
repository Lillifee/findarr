import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import en from './locales/en.json';

export { default } from 'i18next';

const [browserLanguage] = navigator.language.split('-');
const defaultLanguage = browserLanguage === 'de' ? 'de' : 'en';

// oxlint-disable-next-line import/no-named-as-default-member
await i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
  },
  lng: defaultLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

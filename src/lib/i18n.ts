import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import en from "../locales/en/common.json";
import fr from "../locales/fr/common.json";

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? "en";
const supportedLocales = ["en", "fr"];
const lng = supportedLocales.includes(deviceLocale) ? deviceLocale : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { common: en },
    fr: { common: fr },
  },
  lng,
  fallbackLng: "en",
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

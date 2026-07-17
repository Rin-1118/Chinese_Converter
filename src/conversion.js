import * as OpenCC from "opencc-js";
import { pinyin } from "pinyin-pro";

export const CHINESE_TARGET_LANGUAGES = [
  { code: "ja", label: "日本語", detail: "Japanese" },
  { code: "en", label: "English", detail: "英語" },
  { code: "ko", label: "한국어", detail: "韓国語" },
  { code: "fr", label: "Français", detail: "フランス語" },
  { code: "es", label: "Español", detail: "スペイン語" },
  { code: "de", label: "Deutsch", detail: "ドイツ語" }
];

const converters = [
  OpenCC.Converter({ from: "jp", to: "cn" }),
  OpenCC.Converter({ from: "tw", to: "cn" }),
  OpenCC.Converter({ from: "hk", to: "cn" })
];

export function toSimplified(text) {
  return converters.reduce((current, converter) => converter(current), text);
}

export function toPinyin(text, toneType) {
  return pinyin(text, {
    toneType,
    type: "array",
    nonZh: "consecutive"
  }).join(" ");
}

export function getTargetLanguage(languageCode = "ja") {
  return CHINESE_TARGET_LANGUAGES.find((language) => language.code === languageCode) || CHINESE_TARGET_LANGUAGES[0];
}

export function getSpeechLanguage(languageCode) {
  const speechLanguages = {
    ja: "ja-JP",
    en: "en-US",
    ko: "ko-KR",
    fr: "fr-FR",
    es: "es-ES",
    de: "de-DE"
  };
  return speechLanguages[languageCode] || "zh-CN";
}

export function formatHanziHistoryDetail(result) {
  if (result.meaning) {
    return `${result.meaning} / ${result.pinyin}`;
  }
  return result.pinyin;
}

export function shouldRunShortcut(event, isRunning) {
  return Boolean(event.shiftKey && event.key === "Enter" && !event.isComposing && !isRunning);
}

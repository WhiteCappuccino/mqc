import type { MediaType } from "../types/domain";

export interface CheckTemplate {
  id: string;
  appliesTo: MediaType[];
  criteriaCodes: string[];
}

export type CheckTemplateLanguage = "en" | "ru";

export const DEFAULT_TEMPLATE_STORAGE_KEY = "mq-default-check-template";
export const FAVORITE_TEMPLATES_STORAGE_KEY = "mq-favorite-check-templates";

const copy = {
  en: {
    basic: { name: "Basic template", description: "Core technical, metadata and publication checks." },
    publication: { name: "Publication template", description: "Focus on metadata, forbidden words and duplicates." },
    image_quality: { name: "Image quality", description: "Full image review with resolution, sharpness and integrity." },
    video_quality: { name: "Video quality", description: "Video duration, bitrate, frame integrity and black frames." },
    audio_quality: { name: "Audio quality", description: "Audio duration, loudness, noise and intelligibility checks." },
    text_quality: { name: "Text quality", description: "Text structure, readability, lexicon and template checks." },
  },
  ru: {
    basic: { name: "Базовый шаблон", description: "Основные технические, метаданные и публикационные проверки." },
    publication: { name: "Публикационный шаблон", description: "Фокус на метаданных, запрещенных словах и дублях." },
    image_quality: { name: "Проверка изображения", description: "Полная проверка изображения: разрешение, резкость и целостность." },
    video_quality: { name: "Проверка видео", description: "Длительность, битрейт, целостность кадров и черные фрагменты." },
    audio_quality: { name: "Проверка аудио", description: "Длительность, громкость, шум и разборчивость аудио." },
    text_quality: { name: "Проверка текста", description: "Структура текста, читаемость, лексика и шаблонность." },
  },
} as const;

export function getCheckTemplateMeta(templateId: string, language: CheckTemplateLanguage) {
  const localized = copy[language][templateId as keyof (typeof copy)["en"]];
  return localized ?? { name: templateId, description: templateId };
}

export function getCheckTemplateUiCopy(language: CheckTemplateLanguage) {
  return language === "ru"
    ? {
        close: "Закрыть",
        criteriaCount: (count: number) =>
          `${count} ${count % 10 === 1 && count % 100 !== 11 ? "критерий" : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? "критерия" : "критериев"}`,
      }
    : {
        close: "Close",
        criteriaCount: (count: number) => `${count} criteria`,
      };
}

export function getDefaultTemplateId() {
  return localStorage.getItem(DEFAULT_TEMPLATE_STORAGE_KEY);
}

export function setDefaultTemplateId(templateId: string) {
  localStorage.setItem(DEFAULT_TEMPLATE_STORAGE_KEY, templateId);
}

export function getFavoriteTemplateIds() {
  try {
    const raw = localStorage.getItem(FAVORITE_TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function setFavoriteTemplateIds(templateIds: string[]) {
  localStorage.setItem(FAVORITE_TEMPLATES_STORAGE_KEY, JSON.stringify(templateIds));
}

import type { MediaType } from "../types/domain";

export interface TechnicalRequirementsConfig {
  imageMinResolution?: string;
  videoMinDuration?: string;
  videoMaxDuration?: string;
  videoMinResolution?: string;
  videoMinBitrateKbps?: string;
  audioMinDuration?: string;
  audioMaxDuration?: string;
  audioMinBitrateKbps?: string;
}

export interface TemplateProfileRequirements {
  maxFileSizeMb?: string;
  allowedContainers?: string[];
  allowedVideoCodecs?: string[];
  allowedAudioCodecs?: string[];
  expectedFps?: string;
  expectedMinBitrateKbps?: string;
  expectedMaxBitrateKbps?: string;
  requireAudio?: boolean;
}

export interface TemplateRenderRule {
  id: string;
  name: string;
  fileNamePattern: string;
  mediaType: MediaType;
  expectedContainer?: string;
  expectedVideoCodec?: string;
  expectedAudioCodec?: string;
  expectedWidth?: string;
  expectedHeight?: string;
  expectedFps?: string;
  expectedBitrateKbps?: string;
  expectedMinDurationSec?: string;
  expectedMaxDurationSec?: string;
}

export interface CheckTemplate {
  id: string;
  appliesTo: MediaType[];
  criteriaCodes: string[];
  name?: string;
  description?: string;
  source?: "system" | "custom";
  technicalRequirements?: TechnicalRequirementsConfig;
  profileRequirements?: TemplateProfileRequirements;
  renderRules?: TemplateRenderRule[];
}

export type CheckTemplateLanguage = "en" | "ru";

export const DEFAULT_TEMPLATE_STORAGE_KEY = "mq-default-check-template";
export const FAVORITE_TEMPLATES_STORAGE_KEY = "mq-favorite-check-templates";
export const CUSTOM_TEMPLATES_STORAGE_KEY = "mq-custom-check-templates";

const copy = {
  en: {
    basic: { name: "Basic template", description: "Core technical, metadata and duplicate checks." },
    image_quality: { name: "Image quality", description: "Full image review with resolution, sharpness and integrity." },
    video_quality: { name: "Video quality", description: "Video duration, resolution, bitrate, frame integrity and black frames." },
    audio_quality: { name: "Audio quality", description: "Audio duration, loudness, noise and intelligibility checks." },
  },
  ru: {
    basic: { name: "Базовый шаблон", description: "Основные технические проверки, метаданные и дубликаты." },
    image_quality: { name: "Проверка изображения", description: "Полная проверка изображения: разрешение, резкость и целостность." },
    video_quality: { name: "Проверка видео", description: "Длительность, разрешение, битрейт, целостность кадров и черные фрагменты." },
    audio_quality: { name: "Проверка аудио", description: "Длительность, громкость, шум и разборчивость аудио." },
  },
} as const;

interface StoredCustomTemplate {
  id: string;
  name: string;
  description: string;
  appliesTo: MediaType[];
  criteriaCodes: string[];
  technicalRequirements?: TechnicalRequirementsConfig;
  profileRequirements?: TemplateProfileRequirements;
  renderRules?: TemplateRenderRule[];
  createdAt: string;
  updatedAt: string;
}

function isMediaType(value: unknown): value is MediaType {
  return typeof value === "string" && ["IMAGE", "VIDEO", "AUDIO", "TEXT", "MIXED"].includes(value);
}

function isTechnicalRequirementsConfig(value: unknown): value is TechnicalRequirementsConfig {
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).every(
    (entry) => entry === undefined || typeof entry === "string",
  );
}

function isTemplateProfileRequirements(value: unknown): value is TemplateProfileRequirements {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<TemplateProfileRequirements>;
  const stringArrayOrUndefined = (entry: unknown) =>
    entry === undefined || (Array.isArray(entry) && entry.every((item) => typeof item === "string"));

  return (
    (profile.maxFileSizeMb === undefined || typeof profile.maxFileSizeMb === "string") &&
    stringArrayOrUndefined(profile.allowedContainers) &&
    stringArrayOrUndefined(profile.allowedVideoCodecs) &&
    stringArrayOrUndefined(profile.allowedAudioCodecs) &&
    (profile.expectedFps === undefined || typeof profile.expectedFps === "string") &&
    (profile.expectedMinBitrateKbps === undefined || typeof profile.expectedMinBitrateKbps === "string") &&
    (profile.expectedMaxBitrateKbps === undefined || typeof profile.expectedMaxBitrateKbps === "string") &&
    (profile.requireAudio === undefined || typeof profile.requireAudio === "boolean")
  );
}

function isTemplateRenderRule(value: unknown): value is TemplateRenderRule {
  if (!value || typeof value !== "object") return false;
  const rule = value as Partial<TemplateRenderRule>;
  return (
    typeof rule.id === "string" &&
    typeof rule.name === "string" &&
    typeof rule.fileNamePattern === "string" &&
    isMediaType(rule.mediaType)
  );
}

function isStoredCustomTemplate(value: unknown): value is StoredCustomTemplate {
  if (!value || typeof value !== "object") return false;
  const template = value as Partial<StoredCustomTemplate>;
  return (
    typeof template.id === "string" &&
    typeof template.name === "string" &&
    typeof template.description === "string" &&
    Array.isArray(template.appliesTo) &&
    template.appliesTo.every(isMediaType) &&
    Array.isArray(template.criteriaCodes) &&
    template.criteriaCodes.every((code) => typeof code === "string") &&
    (template.technicalRequirements === undefined ||
      isTechnicalRequirementsConfig(template.technicalRequirements)) &&
    (template.profileRequirements === undefined ||
      isTemplateProfileRequirements(template.profileRequirements)) &&
    (template.renderRules === undefined ||
      (Array.isArray(template.renderRules) && template.renderRules.every(isTemplateRenderRule))) &&
    typeof template.createdAt === "string" &&
    typeof template.updatedAt === "string"
  );
}

export function getCheckTemplateMeta(
  templateOrId: string | Pick<CheckTemplate, "id" | "name" | "description">,
  language: CheckTemplateLanguage,
) {
  if (typeof templateOrId !== "string" && templateOrId.name && templateOrId.description) {
    return {
      name: templateOrId.name,
      description: templateOrId.description,
    };
  }

  const templateId = typeof templateOrId === "string" ? templateOrId : templateOrId.id;
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

export function getCustomCheckTemplates(): CheckTemplate[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isStoredCustomTemplate).map((template) => ({
      ...template,
      source: "custom" as const,
    }));
  } catch {
    return [];
  }
}

export function saveCustomCheckTemplates(templates: CheckTemplate[]) {
  const sanitized = templates.map((template) => ({
    id: template.id,
    name: template.name ?? template.id,
    description: template.description ?? "",
    appliesTo: template.appliesTo,
    criteriaCodes: template.criteriaCodes,
    technicalRequirements: template.technicalRequirements,
    profileRequirements: template.profileRequirements,
    renderRules: template.renderRules,
    createdAt: "createdAt" in template && typeof (template as StoredCustomTemplate).createdAt === "string"
      ? (template as StoredCustomTemplate).createdAt
      : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(sanitized));
}

export function upsertCustomCheckTemplate(
  template: Omit<CheckTemplate, "source"> & { name: string; description: string },
) {
  const existing = getCustomCheckTemplates();
  const now = new Date().toISOString();
  const current = existing.find((entry) => entry.id === template.id) as StoredCustomTemplate | undefined;
  const next: StoredCustomTemplate = {
    id: template.id,
    name: template.name,
    description: template.description,
    appliesTo: template.appliesTo,
    criteriaCodes: template.criteriaCodes,
    technicalRequirements: template.technicalRequirements,
    profileRequirements: template.profileRequirements,
    renderRules: template.renderRules,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  };
  const updated = current
    ? existing.map((entry) => (entry.id === template.id ? next : entry))
    : [...existing, next];
  saveCustomCheckTemplates(updated);
}

export function deleteCustomCheckTemplate(templateId: string) {
  const next = getCustomCheckTemplates().filter((template) => template.id !== templateId);
  saveCustomCheckTemplates(next);
}

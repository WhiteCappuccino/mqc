import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import {
  deleteCustomCheckTemplate,
  getCheckTemplateMeta,
  getCustomCheckTemplates,
  upsertCustomCheckTemplate,
  type CheckTemplate,
  type TemplateProfileRequirements,
  type TemplateRenderRule,
} from "../check/check-templates";
import { formatCriterionCode, formatMediaType, normalizeAppError } from "../i18n/ui-text";
import type { MediaType } from "../types/domain";

interface AdminCheckTemplatesPageProps {
  language: "en" | "ru";
}

interface CriterionSummary {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

const mediaTypes: MediaType[] = ["IMAGE", "VIDEO", "AUDIO"];
const commonCriteriaPrefixes = [
  "TECHNICAL_REQUIREMENTS",
  "METADATA_QUALITY",
  "DUPLICATION",
] as const;
const criteriaPrefixesByMediaType: Record<MediaType, string[]> = {
  IMAGE: ["IMAGE_"],
  VIDEO: ["VIDEO_"],
  AUDIO: ["AUDIO_"],
  TEXT: ["TEXT_"],
  MIXED: ["IMAGE_", "VIDEO_", "AUDIO_", "TEXT_"],
};
const hiddenCriteriaCodes = new Set([
  "PUBLICATION_RULES",
  "VIDEO_SHARPNESS",
  "TEXT_SPELLING_PROXY",
  "TEXT_FORBIDDEN_LEXICON",
  "TEXT_LENGTH",
  "TEXT_TEMPLATE",
  "TEXT_READABILITY",
]);

const copy = {
  en: {
    title: "Check templates",
    back: "Back to admin",
    loadError: "Failed to load template data",
    saveError: "Failed to save template",
    deleteError: "Failed to delete template",
    saved: "Template saved",
    deleted: "Template deleted",
    existing: "Available templates",
    system: "System",
    custom: "Custom",
    create: "Create template",
    edit: "Edit template",
    name: "Name",
    description: "Description",
    appliesTo: "Media types",
    criteria: "Criteria",
    profileRequirements: "Profile requirements",
    profileRequirementsHint: "Common rules for the whole profile: formats, codecs, FPS, bitrate range, audio and max file size.",
    renderRules: "Render rules",
    renderRulesHint: "Each render is a separate file inside the profile with its own name and exact technical parameters.",
    addRenderRule: "Add render rule",
    renderName: "Render name",
    fileNamePattern: "File name pattern",
    fileNamePatternHelp: "Exact file name or mask with *. Extension is optional.",
    mediaType: "Media type",
    container: "Container",
    videoCodec: "Video codec",
    audioCodec: "Audio codec",
    width: "Width",
    height: "Height",
    fps: "FPS",
    bitrate: "Bitrate, kbps",
    minDuration: "Min duration, sec",
    maxDuration: "Max duration, sec",
    maxFileSize: "Max file size, MB",
    allowedFormats: "Allowed formats",
    allowedCodecs: "Allowed video codecs",
    allowedAudioCodecs: "Allowed audio codecs",
    minBitrate: "Min bitrate, kbps",
    maxBitrate: "Max bitrate, kbps",
    audioRequired: "Audio track required",
    renderRulesCount: "Render rules count",
    save: "Save template",
    reset: "Reset form",
    delete: "Delete",
    noTemplates: "No templates yet",
    noCriteria: "No criteria available",
    validationName: "Specify template name",
    validationMedia: "Choose at least one media type",
    validationCriteria: "Choose at least one criterion",
  },
  ru: {
    title: "Шаблоны проверки",
    back: "Назад в админку",
    loadError: "Не удалось загрузить данные для шаблонов",
    saveError: "Не удалось сохранить шаблон",
    deleteError: "Не удалось удалить шаблон",
    saved: "Шаблон сохранен",
    deleted: "Шаблон удален",
    existing: "Доступные шаблоны",
    system: "Системный",
    custom: "Кастомный",
    create: "Создать шаблон",
    edit: "Редактировать шаблон",
    name: "Название",
    description: "Описание",
    appliesTo: "Типы медиа",
    criteria: "Критерии",
    profileRequirements: "Требования профиля",
    profileRequirementsHint: "Общие правила для всего профиля: форматы, кодеки, FPS, диапазон битрейта, аудио и максимальный размер файла.",
    renderRules: "Рендеры шаблона",
    renderRulesHint: "Каждый рендер это отдельный файл внутри профиля со своим именем и точными техническими параметрами.",
    addRenderRule: "Добавить рендер",
    renderName: "Название рендера",
    fileNamePattern: "Имя файла или маска",
    fileNamePatternHelp: "Можно указать точное имя файла или маску с *. Расширение можно не писать.",
    mediaType: "Тип медиа",
    container: "Контейнер",
    videoCodec: "Видеокодек",
    audioCodec: "Аудиокодек",
    width: "Ширина",
    height: "Высота",
    fps: "FPS",
    bitrate: "Битрейт, кбит/с",
    minDuration: "Мин. длительность, сек",
    maxDuration: "Макс. длительность, сек",
    maxFileSize: "Макс. размер файла, МБ",
    allowedFormats: "Разрешенные форматы",
    allowedCodecs: "Разрешенные видеокодеки",
    allowedAudioCodecs: "Разрешенные аудиокодеки",
    minBitrate: "Мин. битрейт, кбит/с",
    maxBitrate: "Макс. битрейт, кбит/с",
    audioRequired: "Наличие аудио",
    renderRulesCount: "Количество рендеров",
    save: "Сохранить шаблон",
    reset: "Сбросить форму",
    delete: "Удалить",
    noTemplates: "Шаблонов пока нет",
    noCriteria: "Критерии пока недоступны",
    validationName: "Укажи название шаблона",
    validationMedia: "Выбери хотя бы один тип медиа",
    validationCriteria: "Выбери хотя бы один критерий",
  },
} as const;

function createTemplateId(name: string) {
  return `custom-${name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}-${Date.now()}`;
}

function createRenderRule(): TemplateRenderRule {
  return {
    id: `render-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    fileNamePattern: "",
    mediaType: "VIDEO",
  };
}

function isCriterionAllowedForTypes(code: string, types: MediaType[]) {
  if (commonCriteriaPrefixes.includes(code as (typeof commonCriteriaPrefixes)[number])) {
    return true;
  }

  if (!types.length) {
    return false;
  }

  return types.some((type) =>
    criteriaPrefixesByMediaType[type].some((prefix) => code.startsWith(prefix)),
  );
}

export function AdminCheckTemplatesPage({ language }: AdminCheckTemplatesPageProps) {
  const { token } = useAuth();
  const t = copy[language];
  const [criteria, setCriteria] = useState<CriterionSummary[]>([]);
  const [systemTemplates, setSystemTemplates] = useState<CheckTemplate[]>([]);
  const [customTemplates, setCustomTemplates] = useState<CheckTemplate[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [appliesTo, setAppliesTo] = useState<MediaType[]>([]);
  const [criteriaCodes, setCriteriaCodes] = useState<string[]>([]);
  const [profileRequirements, setProfileRequirements] = useState<TemplateProfileRequirements>({});
  const [renderRules, setRenderRules] = useState<TemplateRenderRule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setError(null);
    try {
      const [criteriaData, templatesData] = await Promise.all([
        api.adminCriteria(token),
        api.listCheckTemplates(token),
      ]);
      setCriteria(
        (criteriaData as CriterionSummary[]).filter(
          (item) => item.isActive && !hiddenCriteriaCodes.has(item.code),
        ),
      );
      setSystemTemplates((templatesData as CheckTemplate[]).map((template) => ({ ...template, source: "system" })));
      setCustomTemplates(getCustomCheckTemplates());
    } catch (loadError) {
      setError(normalizeAppError(loadError, language, t.loadError));
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  const filteredCriteria = criteria.filter((criterion) =>
    isCriterionAllowedForTypes(criterion.code, appliesTo),
  );

  useEffect(() => {
    setCriteriaCodes((current) =>
      current.filter((code) => isCriterionAllowedForTypes(code, appliesTo)),
    );
  }, [appliesTo]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setAppliesTo([]);
    setCriteriaCodes([]);
    setProfileRequirements({});
    setRenderRules([]);
  }

  function startEdit(template: CheckTemplate) {
    setEditingId(template.id);
    setName(template.name ?? template.id);
    setDescription(template.description ?? "");
    setAppliesTo(template.appliesTo);
    setCriteriaCodes(template.criteriaCodes);
    setProfileRequirements(template.profileRequirements ?? {});
    setRenderRules(template.renderRules ?? []);
    setError(null);
    setSuccess(null);
  }

  function saveTemplate() {
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError(t.validationName);
      return;
    }
    if (!appliesTo.length) {
      setError(t.validationMedia);
      return;
    }
    if (!criteriaCodes.length) {
      setError(t.validationCriteria);
      return;
    }

    try {
      upsertCustomCheckTemplate({
        id: editingId ?? createTemplateId(name),
        name: name.trim(),
        description: description.trim(),
        appliesTo,
        criteriaCodes,
        profileRequirements,
        renderRules,
      });
      setCustomTemplates(getCustomCheckTemplates());
      resetForm();
      setSuccess(t.saved);
    } catch (saveError) {
      setError(normalizeAppError(saveError, language, t.saveError));
    }
  }

  function removeTemplate(templateId: string) {
    setError(null);
    setSuccess(null);
    try {
      deleteCustomCheckTemplate(templateId);
      setCustomTemplates(getCustomCheckTemplates());
      if (editingId === templateId) {
        resetForm();
      }
      setSuccess(t.deleted);
    } catch (deleteError) {
      setError(normalizeAppError(deleteError, language, t.deleteError));
    }
  }

  const templates = [...systemTemplates, ...customTemplates];

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ justifyContent: "space-between" }}>
        <Stack spacing={0.5}>
          <Typography variant="h2">{t.title}</Typography>
        </Stack>
        <Button component={RouterLink} to="/admin" variant="outlined">
          {t.back}
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {editingId ? t.edit : t.create}
          </Typography>
          <Stack spacing={2}>
            <TextField label={t.name} value={name} onChange={(event) => setName(event.target.value)} />
            <TextField
              label={t.description}
              value={description}
              multiline
              minRows={2}
              onChange={(event) => setDescription(event.target.value)}
            />
            <TextField
              select
              slotProps={{ select: { multiple: true } }}
              label={t.appliesTo}
              value={appliesTo}
              onChange={(event) => setAppliesTo(event.target.value as unknown as MediaType[])}
              helperText={appliesTo.map((item) => formatMediaType(item, language)).join(", ")}
            >
              {mediaTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {formatMediaType(type, language)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              slotProps={{ select: { multiple: true } }}
              label={t.criteria}
              value={criteriaCodes}
              onChange={(event) => setCriteriaCodes(event.target.value as unknown as string[])}
              helperText={
                filteredCriteria.length
                  ? filteredCriteria
                      .filter((item) => criteriaCodes.includes(item.code))
                      .map((item) => formatCriterionCode(item.code, language))
                      .join(", ")
                  : t.noCriteria
              }
            >
              {filteredCriteria.map((criterion) => (
                <MenuItem key={criterion.id} value={criterion.code}>
                  {formatCriterionCode(criterion.code, language)}
                </MenuItem>
              ))}
            </TextField>
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="subtitle2">{t.profileRequirements}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t.profileRequirementsHint}
                  </Typography>
                  <Stack
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                      gap: 1.5,
                    }}
                  >
                    <TextField
                      size="small"
                      label={t.maxFileSize}
                      value={profileRequirements.maxFileSizeMb ?? ""}
                      onChange={(event) =>
                        setProfileRequirements((current) => ({
                          ...current,
                          maxFileSizeMb: event.target.value,
                        }))
                      }
                    />
                    <TextField
                      size="small"
                      label={t.allowedFormats}
                      value={(profileRequirements.allowedContainers ?? []).join(", ")}
                      onChange={(event) =>
                        setProfileRequirements((current) => ({
                          ...current,
                          allowedContainers: event.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        }))
                      }
                    />
                    <TextField
                      size="small"
                      label={t.allowedCodecs}
                      value={(profileRequirements.allowedVideoCodecs ?? []).join(", ")}
                      onChange={(event) =>
                        setProfileRequirements((current) => ({
                          ...current,
                          allowedVideoCodecs: event.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        }))
                      }
                    />
                    <TextField
                      size="small"
                      label={t.allowedAudioCodecs}
                      value={(profileRequirements.allowedAudioCodecs ?? []).join(", ")}
                      onChange={(event) =>
                        setProfileRequirements((current) => ({
                          ...current,
                          allowedAudioCodecs: event.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        }))
                      }
                    />
                    <TextField
                      size="small"
                      label={t.fps}
                      value={profileRequirements.expectedFps ?? ""}
                      onChange={(event) =>
                        setProfileRequirements((current) => ({
                          ...current,
                          expectedFps: event.target.value,
                        }))
                      }
                    />
                    <TextField
                      size="small"
                      label={t.minBitrate}
                      value={profileRequirements.expectedMinBitrateKbps ?? ""}
                      onChange={(event) =>
                        setProfileRequirements((current) => ({
                          ...current,
                          expectedMinBitrateKbps: event.target.value,
                        }))
                      }
                    />
                    <TextField
                      size="small"
                      label={t.maxBitrate}
                      value={profileRequirements.expectedMaxBitrateKbps ?? ""}
                      onChange={(event) =>
                        setProfileRequirements((current) => ({
                          ...current,
                          expectedMaxBitrateKbps: event.target.value,
                        }))
                      }
                    />
                  </Stack>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={profileRequirements.requireAudio ?? false}
                        onChange={(event) =>
                          setProfileRequirements((current) => ({
                            ...current,
                            requireAudio: event.target.checked,
                          }))
                        }
                      />
                    }
                    label={t.audioRequired}
                  />
                </Stack>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}>
                    <Typography variant="subtitle2">{t.renderRules}</Typography>
                    <Button variant="outlined" onClick={() => setRenderRules((current) => [...current, createRenderRule()])}>
                      {t.addRenderRule}
                    </Button>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {t.renderRulesHint}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t.renderRulesCount}: {renderRules.length}
                  </Typography>
                  <Stack spacing={2}>
                    {renderRules.map((rule) => (
                      <Card key={rule.id} variant="outlined">
                        <CardContent>
                          <Stack
                            sx={{
                              display: "grid",
                              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                              gap: 1.5,
                            }}
                          >
                            <TextField
                              size="small"
                              label={t.renderName}
                              value={rule.name}
                              onChange={(event) =>
                                setRenderRules((current) =>
                                  current.map((entry) =>
                                    entry.id === rule.id ? { ...entry, name: event.target.value } : entry,
                                  ),
                                )
                              }
                            />
                            <TextField
                              size="small"
                              label={t.fileNamePattern}
                              value={rule.fileNamePattern}
                              helperText={t.fileNamePatternHelp}
                              onChange={(event) =>
                                setRenderRules((current) =>
                                  current.map((entry) =>
                                    entry.id === rule.id ? { ...entry, fileNamePattern: event.target.value } : entry,
                                  ),
                                )
                              }
                            />
                            <TextField
                              select
                              size="small"
                              label={t.mediaType}
                              value={rule.mediaType}
                              onChange={(event) =>
                                setRenderRules((current) =>
                                  current.map((entry) =>
                                    entry.id === rule.id
                                      ? { ...entry, mediaType: event.target.value as MediaType }
                                      : entry,
                                  ),
                                )
                              }
                            >
                              {mediaTypes.map((type) => (
                                <MenuItem key={type} value={type}>
                                  {formatMediaType(type, language)}
                                </MenuItem>
                              ))}
                            </TextField>
                            <TextField
                              size="small"
                              label={t.container}
                              value={rule.expectedContainer ?? ""}
                              onChange={(event) =>
                                setRenderRules((current) =>
                                  current.map((entry) =>
                                    entry.id === rule.id ? { ...entry, expectedContainer: event.target.value } : entry,
                                  ),
                                )
                              }
                            />
                            <TextField
                              size="small"
                              label={t.videoCodec}
                              value={rule.expectedVideoCodec ?? ""}
                              onChange={(event) =>
                                setRenderRules((current) =>
                                  current.map((entry) =>
                                    entry.id === rule.id ? { ...entry, expectedVideoCodec: event.target.value } : entry,
                                  ),
                                )
                              }
                            />
                            <TextField
                              size="small"
                              label={t.audioCodec}
                              value={rule.expectedAudioCodec ?? ""}
                              onChange={(event) =>
                                setRenderRules((current) =>
                                  current.map((entry) =>
                                    entry.id === rule.id ? { ...entry, expectedAudioCodec: event.target.value } : entry,
                                  ),
                                )
                              }
                            />
                            <TextField
                              size="small"
                              label={t.width}
                              value={rule.expectedWidth ?? ""}
                              onChange={(event) =>
                                setRenderRules((current) =>
                                  current.map((entry) =>
                                    entry.id === rule.id ? { ...entry, expectedWidth: event.target.value } : entry,
                                  ),
                                )
                              }
                            />
                            <TextField
                              size="small"
                              label={t.height}
                              value={rule.expectedHeight ?? ""}
                              onChange={(event) =>
                                setRenderRules((current) =>
                                  current.map((entry) =>
                                    entry.id === rule.id ? { ...entry, expectedHeight: event.target.value } : entry,
                                  ),
                                )
                              }
                            />
                            <TextField
                              size="small"
                              label={t.fps}
                              value={rule.expectedFps ?? ""}
                              onChange={(event) =>
                                setRenderRules((current) =>
                                  current.map((entry) =>
                                    entry.id === rule.id ? { ...entry, expectedFps: event.target.value } : entry,
                                  ),
                                )
                              }
                            />
                            <TextField
                              size="small"
                              label={t.bitrate}
                              value={rule.expectedBitrateKbps ?? ""}
                              onChange={(event) =>
                                setRenderRules((current) =>
                                  current.map((entry) =>
                                    entry.id === rule.id ? { ...entry, expectedBitrateKbps: event.target.value } : entry,
                                  ),
                                )
                              }
                            />
                            <TextField
                              size="small"
                              label={t.minDuration}
                              value={rule.expectedMinDurationSec ?? ""}
                              onChange={(event) =>
                                setRenderRules((current) =>
                                  current.map((entry) =>
                                    entry.id === rule.id ? { ...entry, expectedMinDurationSec: event.target.value } : entry,
                                  ),
                                )
                              }
                            />
                            <TextField
                              size="small"
                              label={t.maxDuration}
                              value={rule.expectedMaxDurationSec ?? ""}
                              onChange={(event) =>
                                setRenderRules((current) =>
                                  current.map((entry) =>
                                    entry.id === rule.id ? { ...entry, expectedMaxDurationSec: event.target.value } : entry,
                                  ),
                                )
                              }
                            />
                          </Stack>
                          <Button
                            color="error"
                            onClick={() => setRenderRules((current) => current.filter((entry) => entry.id !== rule.id))}
                            sx={{ mt: 1.5, px: 0 }}
                          >
                            {t.delete}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <Button variant="contained" onClick={saveTemplate}>
                {t.save}
              </Button>
              <Button variant="outlined" onClick={resetForm}>
                {t.reset}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t.existing}
          </Typography>
          <Stack spacing={1.5}>
            {templates.map((template) => {
              const meta = getCheckTemplateMeta(template, language);
              const isCustom = template.source === "custom";
              return (
                <Card key={template.id} variant="outlined">
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ justifyContent: "space-between" }}>
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle1">{meta.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {meta.description}
                          </Typography>
                        </Stack>
                        <Chip
                          size="small"
                          color={isCustom ? "primary" : "default"}
                          label={isCustom ? t.custom : t.system}
                        />
                      </Stack>
                      <Typography variant="body2">
                        {t.appliesTo}: {template.appliesTo.map((item) => formatMediaType(item, language)).join(", ")}
                      </Typography>
                      <Typography variant="body2">
                        {t.criteria}: {template.criteriaCodes.map((code) => formatCriterionCode(code, language)).join(", ")}
                      </Typography>
                      {!!template.profileRequirements && Object.values(template.profileRequirements).some((value) =>
                        Array.isArray(value) ? value.length > 0 : Boolean(value),
                      ) && (
                        <Typography variant="body2">
                          {t.profileRequirements}
                        </Typography>
                      )}
                      {!!template.renderRules?.length && (
                        <Typography variant="body2">
                          {t.renderRulesCount}: {template.renderRules.length}
                        </Typography>
                      )}
                      {isCustom && (
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                          <Button variant="outlined" onClick={() => startEdit(template)}>
                            {t.edit}
                          </Button>
                          <Button color="error" variant="outlined" onClick={() => removeTemplate(template.id)}>
                            {t.delete}
                          </Button>
                        </Stack>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
            {!templates.length && <Typography color="text.secondary">{t.noTemplates}</Typography>}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

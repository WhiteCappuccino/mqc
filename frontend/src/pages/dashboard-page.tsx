import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import {
  formatDate,
  formatMediaStatus,
  formatMediaType,
  formatSeverity,
  normalizeAppError,
} from "../i18n/ui-text";
import {
  getCustomCheckTemplates,
  getCheckTemplateMeta,
  getCheckTemplateUiCopy,
  getDefaultTemplateId,
  getFavoriteTemplateIds,
  setDefaultTemplateId,
  setFavoriteTemplateIds,
  type CheckTemplate,
} from "../check/check-templates";
import type { MediaItem, MediaStatus, MediaType, ViolationSeverity } from "../types/domain";

const mediaTypes: Array<MediaType | ""> = ["", "IMAGE", "VIDEO", "AUDIO"];
const mediaStatuses: Array<MediaStatus | ""> = [
  "",
  "UPLOADED",
  "IN_PROCESS",
  "AUTO_CHECKED",
  "NEEDS_MANUAL_MODERATION",
  "ON_REVISION",
  "APPROVED",
  "REJECTED",
  "PUBLISHED",
  "ARCHIVED",
];
const severities: Array<ViolationSeverity | ""> = ["", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
interface DashboardPageProps {
  language: "en" | "ru";
  hideHero: boolean;
}

const copy = {
  en: {
    title: "Dashboard",
    workspace: "workspace",
    headline: "Review flows,\ndefects,\nand approvals.",
    subhead:
      "Scan uploads, sort by quality or status, trigger automated checks, and move quickly between review states.",
    upload: "Upload file",
    filtersHint: "Active filters apply to your accessible media pool.",
    search: "Search",
    type: "Type",
    status: "Status",
    severity: "Severity",
    authorId: "Author ID",
    dateFrom: "Date from",
    dateTo: "Date to",
    sortBy: "Sort by",
    date: "Date",
    quality: "Quality",
    popularity: "Popularity",
    apply: "Apply",
    open: "Open",
    runCheck: "Run check",
    runBaseCheck: "Run base template",
    chooseTemplate: "Choose template",
    saved: "Saved",
    favorite: "Favorite",
    templatesTitle: "Check templates",
    templateSearch: "Search template",
    favoriteTemplates: "Favorites only",
    applicableTemplates: "Suitable for this media",
    makeDefault: "Set default",
    defaultTemplate: "Default",
    startSelectedCheck: "Run selected template",
    noTemplates: "No templates found",
    previewUnavailable: "Preview unavailable",
    owner: "owner",
    created: "created",
    score: "score",
    noChecks: "No checks yet",
    noMedia: "No media matched the current filters.",
    unknown: "Unknown",
    loadError: "Failed to load",
    analyzeError: "Analyze failed",
    favoriteError: "Failed to update favorite",
    all: "ALL",
    untitled: "Untitled file",
  },
  ru: {
    title: "Дашборд",
    workspace: "рабочая зона",
    headline: "Потоки проверки,\nдефекты\nи апрувы.",
    subhead:
      "Просматривайте загрузки, сортируйте по качеству и статусу, запускайте автопроверки и быстро переходите между этапами ревью.",
    upload: "Загрузить файл",
    filtersHint: "Фильтры применяются ко всем доступным вам материалам.",
    search: "Поиск",
    type: "Тип",
    status: "Статус",
    severity: "Критичность",
    authorId: "ID автора",
    dateFrom: "Дата от",
    dateTo: "Дата до",
    sortBy: "Сортировка",
    date: "Дата",
    quality: "Качество",
    popularity: "Популярность",
    apply: "Применить",
    open: "Открыть",
    runCheck: "Запустить",
    runBaseCheck: "Базовая проверка",
    chooseTemplate: "Выбрать шаблон",
    saved: "Сохранено",
    favorite: "В избранное",
    templatesTitle: "Шаблоны проверки",
    templateSearch: "Поиск шаблона",
    favoriteTemplates: "Только избранные",
    applicableTemplates: "Подходящие для этого медиа",
    makeDefault: "Сделать по умолчанию",
    defaultTemplate: "По умолчанию",
    startSelectedCheck: "Запустить выбранный шаблон",
    noTemplates: "Подходящих шаблонов нет",
    previewUnavailable: "Превью недоступно",
    owner: "автор",
    created: "создано",
    score: "оценка",
    noChecks: "Проверок пока нет",
    noMedia: "По текущим фильтрам ничего не найдено.",
    unknown: "Неизвестно",
    loadError: "Не удалось загрузить данные",
    analyzeError: "Не удалось запустить проверку",
    favoriteError: "Не удалось обновить избранное",
    all: "ВСЕ",
    untitled: "Файл без названия",
  },
} as const;

export function DashboardPage({ language, hideHero }: DashboardPageProps) {
  const { token } = useAuth();
  const t = copy[language];
  const templateUi = getCheckTemplateUiCopy(language);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState<MediaType | "">("");
  const [status, setStatus] = useState<MediaStatus | "">("");
  const [severity, setSeverity] = useState<ViolationSeverity | "">("");
  const [authorId, setAuthorId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "quality" | "popularity" | "status">(
    "createdAt",
  );
  const [showNoMediaMessage, setShowNoMediaMessage] = useState(false);
  const [templates, setTemplates] = useState<CheckTemplate[]>([]);
  const [templateDialogMedia, setTemplateDialogMedia] = useState<MediaItem | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [favoriteTemplateIds, setFavoriteTemplateIdsState] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : getFavoriteTemplateIds(),
  );
  const [defaultTemplateId, setDefaultTemplateIdState] = useState<string | null>(() =>
    typeof window === "undefined" ? null : getDefaultTemplateId(),
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [applicableOnly, setApplicableOnly] = useState(true);

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [media, favorites] = await Promise.all([
        api.listMedia(token, {
          q: q || undefined,
          type: type || undefined,
          status: status || undefined,
          severity: severity || undefined,
          authorId: authorId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          sortBy,
        }),
        api.listFavorites(token),
      ]);
      setItems(media);
      setFavoriteIds(favorites.map((entry) => entry.mediaItem.id));
    } catch (loadError) {
      setError(normalizeAppError(loadError, language, t.loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  useEffect(() => {
    async function loadTemplates() {
      if (!token) return;
      try {
        const response = await api.listCheckTemplates(token);
        setTemplates([
          ...(response as CheckTemplate[]).map((template) => ({ ...template, source: "system" as const })),
          ...getCustomCheckTemplates(),
        ]);
      } catch {
        setTemplates(getCustomCheckTemplates());
      }
    }

    void loadTemplates();
  }, [token]);

  async function runAnalysis(
    id: string,
    options?: {
      templateId?: string;
      criteriaCodes?: string[];
      profileRequirements?: CheckTemplate["profileRequirements"];
      renderRules?: CheckTemplate["renderRules"];
    },
  ) {
    if (!token) return;
    setBusyId(id);
    setError(null);
    try {
      await api.sendForCheck(id, token, options);
      await load();
    } catch (actionError) {
      setError(normalizeAppError(actionError, language, t.analyzeError));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleFavorite(mediaId: string) {
    if (!token) return;
    setError(null);
    try {
      if (favoriteIds.includes(mediaId)) {
        await api.removeFavorite(mediaId, token);
      } else {
        await api.addFavorite(mediaId, token);
      }
      await load();
    } catch (favoriteError) {
      setError(normalizeAppError(favoriteError, language, t.favoriteError));
    }
  }

  async function applyFilters() {
    setShowNoMediaMessage(true);
    await load();
  }

  function openTemplateDialog(item: MediaItem) {
    setTemplateDialogMedia(item);
    const preferredTemplateId =
      defaultTemplateId &&
      templates.some(
        (template) => template.id === defaultTemplateId && template.appliesTo.includes(item.type),
      )
        ? defaultTemplateId
        : templates.find((template) => template.appliesTo.includes(item.type))?.id ?? null;
    setSelectedTemplateId(preferredTemplateId);
    setFavoriteOnly(false);
    setApplicableOnly(true);
    setTemplateSearch("");
  }

  function closeTemplateDialog() {
    setTemplateDialogMedia(null);
  }

  function toggleFavoriteTemplate(templateId: string) {
    const next = favoriteTemplateIds.includes(templateId)
      ? favoriteTemplateIds.filter((id) => id !== templateId)
      : [...favoriteTemplateIds, templateId];
    setFavoriteTemplateIdsState(next);
    setFavoriteTemplateIds(next);
  }

  function saveDefaultTemplate(templateId: string) {
    setDefaultTemplateIdState(templateId);
    setDefaultTemplateId(templateId);
  }

  async function runSelectedTemplate() {
    if (!templateDialogMedia || !selectedTemplateId) return;
    const template = templates.find((entry) => entry.id === selectedTemplateId);
    if (!template) return;
    closeTemplateDialog();
    await runAnalysis(templateDialogMedia.id, {
      templateId: template.id,
      criteriaCodes: template.criteriaCodes,
      profileRequirements: template.profileRequirements,
      renderRules: template.renderRules,
    });
  }

  const visibleTemplates = templates.filter((template) => {
    const matchesSearch = (() => {
      const meta = getCheckTemplateMeta(template, language);
      const haystack = `${meta.name} ${meta.description}`.toLowerCase();
      return haystack.includes(templateSearch.trim().toLowerCase());
    })();
    const matchesFavorite = !favoriteOnly || favoriteTemplateIds.includes(template.id);
    const matchesMedia =
      !applicableOnly ||
      !templateDialogMedia ||
      template.appliesTo.includes(templateDialogMedia.type);
    return matchesSearch && matchesFavorite && matchesMedia;
  });

  function getDisplayTitle(item: MediaItem) {
    return item.title?.trim() || item.fileName?.trim() || t.untitled;
  }

  function renderMediaPreview(item: MediaItem) {
    if (item.type === "IMAGE" && item.previewUrl) {
      return (
        <Box
          sx={{
            minHeight: 320,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.default",
            p: 0,
          }}
        >
          <Box
            component="img"
            src={item.previewUrl}
            alt={getDisplayTitle(item)}
            sx={{
              width: "100%",
              height: "auto",
              maxHeight: 320,
              objectFit: "contain",
              display: "block",
            }}
          />
        </Box>
      );
    }

    if (item.type === "VIDEO" && item.previewUrl) {
      return (
        <Box
          sx={{
            minHeight: 320,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.default",
          }}
        >
          <Box
            component="video"
            src={item.previewUrl}
            controls
            muted
            sx={{
              width: "100%",
              height: "auto",
              maxHeight: 320,
              display: "block",
              backgroundColor: "background.default",
            }}
          />
        </Box>
      );
    }

    if (item.type === "AUDIO" && item.previewUrl) {
      return (
        <Stack
          sx={{
            minHeight: 140,
            justifyContent: "center",
            p: 2,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.default",
          }}
        >
          <audio controls src={item.previewUrl} style={{ width: "100%" }} />
        </Stack>
      );
    }

    if (item.type === "TEXT") {
      return (
        <Stack
          spacing={1}
          sx={{
            minHeight: 160,
            p: 2,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.default",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {item.description || item.fileName || t.previewUnavailable}
          </Typography>
        </Stack>
      );
    }

    return (
      <Stack
        sx={{
          minHeight: 160,
          p: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.default",
          justifyContent: "center",
        }}
      >
        <Typography color="text.secondary">{t.previewUnavailable}</Typography>
      </Stack>
    );
  }

  if (loading) {
    return (
      <Stack sx={{ alignItems: "center", mt: 4 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {hideHero ? (
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ alignItems: { xs: "flex-start", md: "center" }, justifyContent: "space-between" }}
        >
          <Typography variant="h2">{t.title}</Typography>
          <Button
            variant="contained"
            component={RouterLink}
            to="/upload"
            sx={{ minWidth: 220 }}
          >
            {t.upload}
          </Button>
        </Stack>
      ) : (
        <Paper sx={{ p: { xs: 2, md: 3 }, backgroundColor: "background.paper" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1.2fr 0.8fr" },
              gap: 2,
              alignItems: "start",
            }}
          >
            <Stack spacing={2}>
              <Chip label={t.workspace} size="small" sx={{ alignSelf: "flex-start" }} />
              <Typography variant="h2" sx={{ whiteSpace: "pre-line", maxWidth: 720 }}>
                {t.headline}
              </Typography>
              <Typography sx={{ maxWidth: 720 }}>
                {t.subhead}
              </Typography>
              <Button
                variant="contained"
                component={RouterLink}
                to="/upload"
                sx={{ alignSelf: "flex-start", minWidth: 220 }}
              >
                {t.upload}
              </Button>
            </Stack>
            <Stack spacing={1} sx={{ alignItems: { xs: "stretch", lg: "flex-start" } }} />
          </Box>
        </Paper>
      )}

      <Paper sx={{ p: { xs: 2, md: 2.5 }, backgroundColor: "background.paper" }}>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {t.filtersHint}
        </Typography>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          useFlexGap
          sx={{ flexWrap: "wrap" }}
        >
          <TextField
            label={t.search}
            value={q}
            onChange={(event) => setQ(event.target.value)}
            sx={{ minWidth: 220, flex: 1 }}
          />
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel id="type-filter-label">{t.type}</InputLabel>
            <Select
              labelId="type-filter-label"
              label={t.type}
              value={type}
              onChange={(event: SelectChangeEvent) => setType(event.target.value as MediaType | "")}
            >
              {mediaTypes.map((option) => (
                <MenuItem key={option || "all"} value={option}>
                  {option ? formatMediaType(option, language) : t.all}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel id="status-filter-label">{t.status}</InputLabel>
            <Select
              labelId="status-filter-label"
              label={t.status}
              value={status}
              onChange={(event: SelectChangeEvent) =>
                setStatus(event.target.value as MediaStatus | "")
              }
            >
              {mediaStatuses.map((option) => (
                <MenuItem key={option || "all"} value={option}>
                  {option ? formatMediaStatus(option, language) : t.all}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="severity-filter-label">{t.severity}</InputLabel>
            <Select
              labelId="severity-filter-label"
              label={t.severity}
              value={severity}
              onChange={(event: SelectChangeEvent) =>
                setSeverity(event.target.value as ViolationSeverity | "")
              }
            >
                  {severities.map((option) => (
                <MenuItem key={option || "all"} value={option}>
                  {option ? formatSeverity(option, language) : t.all}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={t.authorId}
            value={authorId}
            onChange={(event) => setAuthorId(event.target.value)}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label={t.dateFrom}
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 170 }}
          />
          <TextField
            label={t.dateTo}
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 170 }}
          />
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel id="sort-by-label">{t.sortBy}</InputLabel>
            <Select
              labelId="sort-by-label"
              label={t.sortBy}
              value={sortBy}
              onChange={(event: SelectChangeEvent) =>
                setSortBy(event.target.value as "createdAt" | "quality" | "popularity" | "status")
              }
            >
              <MenuItem value="createdAt">{t.date}</MenuItem>
              <MenuItem value="quality">{t.quality}</MenuItem>
              <MenuItem value="popularity">{t.popularity}</MenuItem>
              <MenuItem value="status">{t.status}</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" onClick={() => void applyFilters()}>
            {t.apply}
          </Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}
      {showNoMediaMessage && !items.length && (
        <Typography color="text.secondary">{t.noMedia}</Typography>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" },
          gap: 2,
        }}
      >
        {items.map((item) => {
          const latestCheck = item.qualityChecks?.[0];

          return (
            <Card
              key={item.id}
              sx={{
                backgroundColor: "background.paper",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <CardContent
                sx={{
                  p: 2.5,
                  display: "flex",
                  flexDirection: "column",
                  flexGrow: 1,
                }}
              >
                <Stack spacing={2} sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                    <Chip label={formatMediaStatus(item.status, language)} size="small" />
                    <Chip
                      label={formatMediaType(item.type, language)}
                      size="small"
                      sx={{ backgroundColor: (theme) => theme.palette.secondary.main }}
                    />
                  </Stack>

                  <Stack spacing={0.75}>
                    <Typography variant="h4">{getDisplayTitle(item)}</Typography>
                    <Typography color="text.secondary">{item.fileName}</Typography>
                  </Stack>

                  <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    {renderMediaPreview(item)}
                  </Box>

                  <Divider sx={{ borderColor: "#111111", borderBottomWidth: 2 }} />

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: "0.1em" }}>
                        {t.owner}
                      </Typography>
                      <Typography color="text.secondary">
                        {item.owner?.fullName ?? item.owner?.username ?? t.unknown}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: "0.1em" }}>
                        {t.created}
                      </Typography>
                      <Typography color="text.secondary">
                        {formatDate(item.createdAt, language)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: "0.1em" }}>
                        {t.score}
                      </Typography>
                      <Typography color="text.secondary">
                        {latestCheck ? latestCheck.finalScore : t.noChecks}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
              <CardActions sx={{ px: 2.5, pb: 2.5, pt: 0, gap: 1, flexWrap: "wrap" }}>
                <Button component={RouterLink} to={`/media/${item.id}`} variant="outlined">
                  {t.open}
                </Button>
                <Button
                  onClick={() => {
                    const basicTemplate = templates.find((template) => template.id === "basic");
                    void runAnalysis(item.id, {
                      templateId: basicTemplate?.id ?? "basic",
                      criteriaCodes: basicTemplate?.criteriaCodes,
                    });
                  }}
                  disabled={busyId === item.id}
                >
                  {t.runBaseCheck}
                </Button>
                <Button onClick={() => openTemplateDialog(item)} disabled={busyId === item.id}>
                  {t.chooseTemplate}
                </Button>
                <Button
                  onClick={() => toggleFavorite(item.id)}
                  color={favoriteIds.includes(item.id) ? "success" : "primary"}
                >
                  {favoriteIds.includes(item.id) ? t.saved : t.favorite}
                </Button>
              </CardActions>
            </Card>
          );
        })}
      </Box>

      <Dialog
        open={Boolean(templateDialogMedia)}
        onClose={closeTemplateDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{t.templatesTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label={t.templateSearch}
              value={templateSearch}
              onChange={(event) => setTemplateSearch(event.target.value)}
            />
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              <Chip
                label={t.favoriteTemplates}
                color={favoriteOnly ? "primary" : "default"}
                onClick={() => setFavoriteOnly((current) => !current)}
              />
              <Chip
                label={t.applicableTemplates}
                color={applicableOnly ? "primary" : "default"}
                onClick={() => setApplicableOnly((current) => !current)}
              />
            </Stack>
            <Stack spacing={1.5}>
              {visibleTemplates.map((template) => {
                const meta = getCheckTemplateMeta(template, language);
                const isFavorite = favoriteTemplateIds.includes(template.id);
                const isDefault = defaultTemplateId === template.id;
                const isSelected = selectedTemplateId === template.id;

                return (
                  <Paper
                    key={template.id}
                    sx={{
                      p: 2,
                      borderColor: isSelected ? "primary.main" : "divider",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    <Stack spacing={1.25}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1}
                        sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}
                      >
                        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                          <Typography variant="h6">{meta.name}</Typography>
                          {isDefault && <Chip label={t.defaultTemplate} size="small" />}
                          {isFavorite && <Chip label={t.favorite} size="small" color="success" />}
                        </Stack>
                        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFavoriteTemplate(template.id);
                            }}
                          >
                            {isFavorite ? t.saved : t.favorite}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(event) => {
                              event.stopPropagation();
                              saveDefaultTemplate(template.id);
                            }}
                          >
                            {t.makeDefault}
                          </Button>
                        </Stack>
                      </Stack>
                      <Typography color="text.secondary">{meta.description}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {templateUi.criteriaCount(template.criteriaCodes.length)}
                      </Typography>
                    </Stack>
                  </Paper>
                );
              })}
              {!visibleTemplates.length && (
                <Typography color="text.secondary">{t.noTemplates}</Typography>
              )}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTemplateDialog}>{templateUi.close}</Button>
          <Button
            variant="contained"
            onClick={() => void runSelectedTemplate()}
            disabled={!selectedTemplateId || !templateDialogMedia}
          >
            {t.startSelectedCheck}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

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
import type { MediaItem, MediaStatus, MediaType, ViolationSeverity } from "../types/domain";

const mediaTypes: Array<MediaType | ""> = ["", "IMAGE", "VIDEO", "AUDIO", "TEXT", "MIXED"];
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
    saved: "Saved",
    favorite: "Favorite",
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
    saved: "Сохранено",
    favorite: "В избранное",
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
  },
} as const;

export function DashboardPage({ language, hideHero }: DashboardPageProps) {
  const { token } = useAuth();
  const t = copy[language];
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
      setError(loadError instanceof Error ? loadError.message : t.loadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function runAnalysis(id: string) {
    if (!token) return;
    setBusyId(id);
    setError(null);
    try {
      await api.sendForCheck(id, token);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : t.analyzeError);
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
      setError(favoriteError instanceof Error ? favoriteError.message : t.favoriteError);
    }
  }

  async function applyFilters() {
    setShowNoMediaMessage(true);
    await load();
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
                  {option || t.all}
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
                  {option || t.all}
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
                  {option || t.all}
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
            <Card key={item.id} sx={{ backgroundColor: "background.paper" }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                    <Chip label={item.status} size="small" />
                    <Chip
                      label={item.type}
                      size="small"
                      sx={{ backgroundColor: (theme) => theme.palette.secondary.main }}
                    />
                  </Stack>

                  <Stack spacing={0.75}>
                    <Typography variant="h4">{item.title}</Typography>
                    <Typography color="text.secondary">{item.fileName}</Typography>
                  </Stack>

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
                        {new Date(item.createdAt).toLocaleDateString()}
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
                <Button onClick={() => runAnalysis(item.id)} disabled={busyId === item.id}>
                  {t.runCheck}
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

    </Stack>
  );
}

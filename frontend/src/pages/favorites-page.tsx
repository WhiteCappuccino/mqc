import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import { formatMediaStatus, formatMediaType, normalizeAppError } from "../i18n/ui-text";
import type { MediaItem } from "../types/domain";

interface FavoritesPageProps {
  language: "en" | "ru";
}

const copy = {
  en: {
    title: "Favorites",
    open: "Open",
    remove: "Remove",
    empty: "No favorites yet",
    loadError: "Failed to load favorites",
    removeError: "Failed to remove",
    previewUnavailable: "Preview unavailable",
    untitled: "Untitled file",
  },
  ru: {
    title: "Избранное",
    open: "Открыть",
    remove: "Убрать",
    empty: "Пока нет избранного",
    loadError: "Не удалось загрузить избранное",
    removeError: "Не удалось удалить",
    previewUnavailable: "Превью недоступно",
    untitled: "Файл без названия",
  },
} as const;

function renderMediaPreview(
  item: MediaItem,
  t: (typeof copy)["en"] | (typeof copy)["ru"],
) {
  const displayTitle = item.title?.trim() || item.fileName?.trim() || t.untitled;

  if (item.type === "IMAGE" && item.previewUrl) {
    return (
      <Box
        sx={{
          minHeight: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.default",
        }}
      >
        <Box
          component="img"
          src={item.previewUrl}
          alt={displayTitle}
          sx={{
            width: "100%",
            height: "auto",
            maxHeight: 180,
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
          minHeight: 180,
          display: "flex",
          alignItems: "center",
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
            maxHeight: 180,
            display: "block",
            backgroundColor: "background.default",
          }}
        />
      </Box>
    );
  }

  if (item.type === "AUDIO" && item.previewUrl) {
    return (
      <Box
        sx={{
          minHeight: 120,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.default",
          p: 2,
        }}
      >
        <audio controls src={item.previewUrl} style={{ width: "100%" }} />
      </Box>
    );
  }

  if (item.type === "TEXT") {
    return (
      <Box
        sx={{
          minHeight: 140,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.default",
          p: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {item.description || item.fileName || t.previewUnavailable}
        </Typography>
      </Box>
    );
  }

  return (
      <Box
        sx={{
        minHeight: 140,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.default",
        p: 2,
        display: "flex",
        alignItems: "center",
      }}
    >
      <Typography color="text.secondary">{t.previewUnavailable}</Typography>
    </Box>
  );
}

export function FavoritesPage({ language }: FavoritesPageProps) {
  const { token } = useAuth();
  const t = copy[language];
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const favorites = await api.listFavorites(token);
      setItems(favorites.map((entry) => entry.mediaItem));
    } catch (loadError) {
      setError(normalizeAppError(loadError, language, t.loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function remove(mediaId: string) {
    if (!token) return;
    setError(null);
    try {
      await api.removeFavorite(mediaId, token);
      await load();
    } catch (actionError) {
      setError(normalizeAppError(actionError, language, t.removeError));
    }
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
      <Typography variant="h2">{t.title}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 280px" },
                gap: 2,
                alignItems: "stretch",
              }}
            >
              <Stack
                spacing={1.5}
                sx={{
                  minHeight: { md: 180 },
                  justifyContent: "space-between",
                }}
              >
                <Stack spacing={1.5}>
                  <Typography variant="h6">{item.title?.trim() || item.fileName?.trim() || t.untitled}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {formatMediaType(item.type, language)} | {item.fileName}
                  </Typography>
                  <Chip
                    size="small"
                    label={formatMediaStatus(item.status, language)}
                    sx={{ alignSelf: "flex-start" }}
                  />
                </Stack>
                <CardActions sx={{ px: 0, pb: 0, pt: 0, gap: 1, flexWrap: "wrap" }}>
                  <Button component={RouterLink} to={`/media/${item.id}`}>
                    {t.open}
                  </Button>
                  <Button color="error" onClick={() => remove(item.id)}>
                    {t.remove}
                  </Button>
                </CardActions>
              </Stack>
              <Box sx={{ width: "100%" }}>{renderMediaPreview(item, t)}</Box>
            </Box>
          </CardContent>
        </Card>
      ))}
      {!items.length && <Typography color="text.secondary">{t.empty}</Typography>}
    </Stack>
  );
}

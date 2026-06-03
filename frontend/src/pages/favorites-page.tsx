import {
  Alert,
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
  },
  ru: {
    title: "Избранное",
    open: "Открыть",
    remove: "Убрать",
    empty: "Пока нет избранного",
    loadError: "Не удалось загрузить избранное",
    removeError: "Не удалось удалить",
  },
} as const;

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
      setError(loadError instanceof Error ? loadError.message : t.loadError);
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
      setError(actionError instanceof Error ? actionError.message : t.removeError);
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
            <Typography variant="h6">{item.title}</Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
              {item.type} | {item.fileName}
            </Typography>
            <Chip size="small" label={item.status} />
          </CardContent>
          <CardActions>
            <Button component={RouterLink} to={`/media/${item.id}`}>
              {t.open}
            </Button>
            <Button color="error" onClick={() => remove(item.id)}>
              {t.remove}
            </Button>
          </CardActions>
        </Card>
      ))}
      {!items.length && <Typography color="text.secondary">{t.empty}</Typography>}
    </Stack>
  );
}

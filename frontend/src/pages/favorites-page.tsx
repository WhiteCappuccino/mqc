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

export function FavoritesPage() {
  const { token } = useAuth();
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
      setError(loadError instanceof Error ? loadError.message : "Failed to load favorites");
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
      setError(actionError instanceof Error ? actionError.message : "Failed to remove");
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
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Favorites
      </Typography>
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
              Open
            </Button>
            <Button color="error" onClick={() => remove(item.id)}>
              Remove
            </Button>
          </CardActions>
        </Card>
      ))}
      {!items.length && <Typography color="text.secondary">No favorites yet</Typography>}
    </Stack>
  );
}


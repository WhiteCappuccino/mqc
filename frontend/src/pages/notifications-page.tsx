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
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import type { NotificationItem } from "../types/domain";

export function NotificationsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await api.listNotifications(token));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function markAsRead(id: string) {
    if (!token) return;
    try {
      await api.markNotificationRead(id, token);
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to update notification");
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
        Notifications
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Chip size="small" label={item.channel} />
              <Chip
                size="small"
                color={item.isRead ? "default" : "primary"}
                label={item.isRead ? "Read" : "New"}
              />
            </Stack>
            <Typography variant="h6">{item.title}</Typography>
            <Typography color="text.secondary">{item.message}</Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(item.createdAt).toLocaleString()}
            </Typography>
          </CardContent>
          {!item.isRead && (
            <CardActions>
              <Button onClick={() => markAsRead(item.id)}>Mark as read</Button>
            </CardActions>
          )}
        </Card>
      ))}
      {!items.length && <Typography color="text.secondary">No notifications</Typography>}
    </Stack>
  );
}


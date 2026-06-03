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

interface NotificationsPageProps {
  language: "en" | "ru";
}

const copy = {
  en: {
    title: "Notifications",
    read: "Read",
    new: "New",
    markAsRead: "Mark as read",
    empty: "No notifications",
    loadError: "Failed to load notifications",
    updateError: "Failed to update notification",
  },
  ru: {
    title: "Уведомления",
    read: "Прочитано",
    new: "Новое",
    markAsRead: "Отметить прочитанным",
    empty: "Уведомлений пока нет",
    loadError: "Не удалось загрузить уведомления",
    updateError: "Не удалось обновить уведомление",
  },
} as const;

export function NotificationsPage({ language }: NotificationsPageProps) {
  const { token } = useAuth();
  const t = copy[language];
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
      setError(loadError instanceof Error ? loadError.message : t.loadError);
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
      setError(actionError instanceof Error ? actionError.message : t.updateError);
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
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Chip size="small" label={item.channel} />
              <Chip
                size="small"
                label={item.isRead ? t.read : t.new}
                sx={
                  item.isRead
                    ? undefined
                    : {
                        backgroundColor: "success.main",
                        color: "success.contrastText",
                        borderColor: "success.contrastText",
                      }
                }
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
              <Button onClick={() => markAsRead(item.id)}>{t.markAsRead}</Button>
            </CardActions>
          )}
        </Card>
      ))}
      {!items.length && <Typography color="text.secondary">{t.empty}</Typography>}
    </Stack>
  );
}

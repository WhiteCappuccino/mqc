import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { normalizeAppError } from "../i18n/ui-text";

interface ResetPasswordPageProps {
  language: "en" | "ru";
}

const copy = {
  en: {
    title: "Set New Password",
    description: "Use token from reset email",
    token: "Reset token",
    password: "New password",
    submit: "Update password",
    back: "Back to login",
    success: "Password updated",
    failed: "Reset failed",
  },
  ru: {
    title: "Новый пароль",
    description: "Используйте токен из письма для сброса",
    token: "Токен сброса",
    password: "Новый пароль",
    submit: "Обновить пароль",
    back: "Назад ко входу",
    success: "Пароль обновлен",
    failed: "Не удалось сбросить пароль",
  },
} as const;

export function ResetPasswordPage({ language }: ResetPasswordPageProps) {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const t = copy[language];

  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) setToken(urlToken);
  }, [searchParams]);

  async function submit() {
    setError(null);
    setSuccess(null);
    try {
      await api.resetPassword(token, newPassword);
      setSuccess(t.success);
    } catch (submitError) {
      setError(normalizeAppError(submitError, language, t.failed));
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at 85% 20%, #bfdbfe 0%, #dcfce7 45%, #f8fafc 100%)",
      }}
    >
      <Card sx={{ width: 420, borderRadius: 3, boxShadow: 8 }}>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            {t.title}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {t.description}
          </Typography>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            <TextField
              label={t.token}
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
            <TextField
              label={t.password}
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <Button variant="contained" onClick={submit}>
              {t.submit}
            </Button>
            <Button component={Link} to="/login">
              {t.back}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

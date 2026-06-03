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

interface VerifyEmailPageProps {
  language: "en" | "ru";
}

const copy = {
  en: {
    title: "Verify Email",
    description: "Enter token from verification email",
    token: "Verification token",
    submit: "Verify",
    back: "Back to login",
    success: "Email verified",
    failed: "Verification failed",
  },
  ru: {
    title: "Подтвердить почту",
    description: "Введите токен из письма подтверждения",
    token: "Токен подтверждения",
    submit: "Подтвердить",
    back: "Назад ко входу",
    success: "Почта подтверждена",
    failed: "Не удалось подтвердить почту",
  },
} as const;

export function VerifyEmailPage({ language }: VerifyEmailPageProps) {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState("");
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
      await api.verifyEmail(token);
      setSuccess(t.success);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.failed);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at 20% 15%, #e9d5ff 0%, #bfdbfe 45%, #f8fafc 100%)",
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

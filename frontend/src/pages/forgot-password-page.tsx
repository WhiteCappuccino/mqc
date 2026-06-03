import { Alert, Box, Button, Chip, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

interface ForgotPasswordPageProps {
  language: "en" | "ru";
}

const copy = {
  en: {
    support: "support",
    title: "Reset",
    description:
      "Enter the account email and the system will issue a recovery path if the user exists.",
    haveToken: "Already have token",
    back: "Back to login",
    email: "Email",
    submit: "Send reset instructions",
    success: "If account exists, reset instructions were sent to email.",
    failed: "Request failed",
  },
  ru: {
    support: "поддержка",
    title: "Сброс",
    description:
      "Введите email аккаунта, и система отправит инструкцию для восстановления, если пользователь существует.",
    haveToken: "Токен уже есть",
    back: "Назад ко входу",
    email: "Эл. почта",
    submit: "Отправить инструкции",
    success: "Если аккаунт существует, инструкции по сбросу отправлены на почту.",
    failed: "Не удалось отправить запрос",
  },
} as const;

export function ForgotPasswordPage({ language }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const t = copy[language];

  async function submit() {
    setError(null);
    setSuccess(null);
    try {
      await api.forgotPassword(email);
      setSuccess(t.success);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.failed);
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 1.5, md: 2.5 } }}>
      <Container>
        <Paper sx={{ p: { xs: 2, md: 3 }, backgroundColor: "background.paper" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1fr 0.9fr" },
              gap: 2,
            }}
          >
            <Paper
              sx={{
                p: { xs: 2.5, md: 4 },
                backgroundColor: "#f0e5be",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Stack spacing={2}>
                <Chip label={t.support} size="small" sx={{ alignSelf: "flex-start" }} />
                <Typography variant="h2">{t.title}</Typography>
                <Typography>{t.description}</Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 3, flexWrap: "wrap" }}>
                <Button component={Link} to="/reset-password" variant="outlined">
                  {t.haveToken}
                </Button>
                <Button component={Link} to="/login" variant="outlined">
                  {t.back}
                </Button>
              </Stack>
            </Paper>

            <Paper sx={{ p: { xs: 2.5, md: 4 } }}>
              <Stack spacing={2}>
                {error && <Alert severity="error">{error}</Alert>}
                {success && <Alert severity="success">{success}</Alert>}
                <TextField
                  label={t.email}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <Button variant="contained" onClick={submit}>
                  {t.submit}
                </Button>
              </Stack>
            </Paper>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

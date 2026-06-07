import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Box, Button, Chip, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../auth/auth-context";
import { normalizeAppError } from "../i18n/ui-text";

interface FormValues {
  email: string;
  password: string;
}

interface LoginPageProps {
  language: "en" | "ru";
}

const copy = {
  en: {
    entry: "entry",
    title: "Sign In",
    description:
      "Enter the moderation grid, notifications, upload flow, and review history with one account.",
    createAccount: "Create account",
    forgotPassword: "Forgot password",
    email: "Email",
    password: "Password",
    login: "Login",
    loginFailed: "Login failed",
    validationInvalidEmail: "Invalid email",
    validationMinPassword: "Minimum 8 chars",
  },
  ru: {
    entry: "вход",
    title: "Вход",
    description:
      "Войдите в модерацию, уведомления, загрузки и историю ревью через один аккаунт.",
    createAccount: "Создать аккаунт",
    forgotPassword: "Забыли пароль",
    email: "Эл. почта",
    password: "Пароль",
    login: "Войти",
    loginFailed: "Не удалось войти",
    validationInvalidEmail: "Неправильный email",
    validationMinPassword: "Минимум 8 символов",
  },
} as const;

export function LoginPage({ language }: LoginPageProps) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const t = copy[language];
  const schema = z.object({
    email: z.string().email(t.validationInvalidEmail),
    password: z.string().min(8, t.validationMinPassword),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      await login(values.email, values.password);
      navigate("/dashboard");
    } catch (submitError) {
      setError(normalizeAppError(submitError, language, t.loginFailed));
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 1.5, md: 2.5 } }}>
      <Container>
        <Paper sx={{ p: { xs: 2, md: 3 }, backgroundColor: "background.paper" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1.1fr 0.9fr" },
              gap: 2,
              alignItems: "stretch",
            }}
          >
            <Paper
              sx={{
                p: { xs: 2.5, md: 4 },
                backgroundColor: "#ead0c8",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Stack spacing={2}>
                <Chip label={t.entry} size="small" sx={{ alignSelf: "flex-start" }} />
                <Typography variant="h2">{t.title}</Typography>
                <Typography sx={{ maxWidth: 520 }}>
                  {t.description}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 3, flexWrap: "wrap" }}>
                <Button component={Link} to="/register" variant="outlined">
                  {t.createAccount}
                </Button>
                <Button component={Link} to="/forgot-password" variant="outlined">
                  {t.forgotPassword}
                </Button>
              </Stack>
            </Paper>

            <Paper sx={{ p: { xs: 2.5, md: 4 } }}>
              <form onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={2}>
                  {error && <Alert severity="error">{error}</Alert>}
                  <TextField
                    label={t.email}
                    type="email"
                    {...register("email")}
                    error={Boolean(errors.email)}
                    helperText={errors.email?.message}
                  />
                  <TextField
                    label={t.password}
                    type="password"
                    {...register("password")}
                    error={Boolean(errors.password)}
                    helperText={errors.password?.message}
                  />
                  <Button type="submit" variant="contained" disabled={isSubmitting}>
                    {t.login}
                  </Button>
                </Stack>
              </form>
            </Paper>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

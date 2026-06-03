import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Box, Button, Chip, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../auth/auth-context";

const schema = z
  .object({
    fullName: z.string().min(2, "Minimum 2 chars"),
    username: z
      .string()
      .min(3, "Minimum 3 chars")
      .regex(/^[a-zA-Z0-9_.-]+$/, "Only letters, digits and _.-"),
    email: z.string().email("Invalid email"),
    password: z
      .string()
      .min(8, "Minimum 8 chars")
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, "Use upper/lowercase and digit"),
    confirmPassword: z.string().min(8, "Minimum 8 chars"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

interface RegisterPageProps {
  language: "en" | "ru";
}

const copy = {
  en: {
    access: "access",
    title: "Register",
    description:
      "Create an account for uploads, moderation, audit history, and shared collections.",
    haveAccount: "Already have an account",
    fullName: "Full name",
    username: "Username",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    submit: "Register",
    failed: "Registration failed",
  },
  ru: {
    access: "доступ",
    title: "Регистрация",
    description:
      "Создайте аккаунт для загрузок, модерации, истории аудита и общих коллекций.",
    haveAccount: "Уже есть аккаунт",
    fullName: "Полное имя",
    username: "Имя пользователя",
    email: "Эл. почта",
    password: "Пароль",
    confirmPassword: "Подтвердите пароль",
    submit: "Зарегистрироваться",
    failed: "Не удалось зарегистрироваться",
  },
} as const;

export function RegisterPage({ language }: RegisterPageProps) {
  const navigate = useNavigate();
  const { register: registerAccount } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const t = copy[language];

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
      await registerAccount({
        email: values.email,
        username: values.username,
        fullName: values.fullName,
        password: values.password,
      });
      navigate("/dashboard");
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
              gridTemplateColumns: { xs: "1fr", lg: "0.92fr 1.08fr" },
              gap: 2,
            }}
          >
            <Paper
              sx={{
                p: { xs: 2.5, md: 4 },
                backgroundColor: "#c7f0d8",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Stack spacing={2}>
                <Chip label={t.access} size="small" sx={{ alignSelf: "flex-start" }} />
                <Typography variant="h2">{t.title}</Typography>
                <Typography>{t.description}</Typography>
              </Stack>
              <Button
                component={Link}
                to="/login"
                variant="outlined"
                sx={{ alignSelf: "flex-start", mt: 3 }}
              >
                {t.haveAccount}
              </Button>
            </Paper>

            <Paper sx={{ p: { xs: 2.5, md: 4 } }}>
              <form onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={2}>
                  {error && <Alert severity="error">{error}</Alert>}
                  <TextField
                    label={t.fullName}
                    {...register("fullName")}
                    error={Boolean(errors.fullName)}
                    helperText={errors.fullName?.message}
                  />
                  <TextField
                    label={t.username}
                    {...register("username")}
                    error={Boolean(errors.username)}
                    helperText={errors.username?.message}
                  />
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
                  <TextField
                    label={t.confirmPassword}
                    type="password"
                    {...register("confirmPassword")}
                    error={Boolean(errors.confirmPassword)}
                    helperText={errors.confirmPassword?.message}
                  />
                  <Button type="submit" variant="contained" disabled={isSubmitting}>
                    {t.submit}
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

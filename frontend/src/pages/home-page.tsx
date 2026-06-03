import { Box, Button, Chip, Container, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

interface HomePageProps {
  language: "en" | "ru";
}

interface HomeTile {
  eyebrow: string;
  title: string;
  description: string;
  to: string;
  external?: boolean;
}

const copy = {
  en: {
    legal: "legal",
    privacy: "privacy",
    languageLabel: "ru",
    info: "info",
    hero: "HOME",
    heroDescription:
      "Media Quality Control Platform for structured uploads, automated checks, manual moderation, and a calmer review workflow.",
    location: "location",
    locationText: ["Review Desk", "Quality Lane 6", "Remote Workspace"],
    access: "access",
    accessText: ["API · localhost:3000", "UI · localhost:5173", "Storage · MinIO"],
    open: "Open",
    tiles: [
      {
        eyebrow: "entry",
        title: "Sign In",
        description: "Open the review workspace, alerts, personal queue, and history.",
        to: "/login",
      },
      {
        eyebrow: "access",
        title: "Register",
        description: "Create an operator account for moderation, uploads, and collaboration.",
        to: "/register",
      },
      {
        eyebrow: "support",
        title: "Reset Password",
        description: "Recover access without leaving the same visual workflow.",
        to: "/forgot-password",
      },
      {
        eyebrow: "status",
        title: "API Docs",
        description: "Inspect endpoints, auth flows, and media actions in Swagger.",
        to: "http://localhost:3000/docs",
        external: true,
      },
    ] satisfies HomeTile[],
  },
  ru: {
    legal: "право",
    privacy: "приватность",
    languageLabel: "en",
    info: "инфо",
    hero: "ГЛАВНАЯ",
    heroDescription:
      "Платформа контроля качества медиаконтента для структурированных загрузок, автоматических проверок, ручной модерации и спокойного review-потока.",
    location: "локация",
    locationText: ["Зона ревью", "Линия качества 6", "Удаленное рабочее место"],
    access: "доступ",
    accessText: ["API · localhost:3000", "UI · localhost:5173", "Storage · MinIO"],
    open: "Открыть",
    tiles: [
      {
        eyebrow: "вход",
        title: "Войти",
        description: "Откройте рабочее пространство ревью, уведомления, личную очередь и историю.",
        to: "/login",
      },
      {
        eyebrow: "доступ",
        title: "Регистрация",
        description: "Создайте аккаунт для модерации, загрузок и совместной работы.",
        to: "/register",
      },
      {
        eyebrow: "поддержка",
        title: "Сброс пароля",
        description: "Восстановите доступ, не выпадая из общего интерфейсного сценария.",
        to: "/forgot-password",
      },
      {
        eyebrow: "статус",
        title: "Документация API",
        description: "Просмотрите эндпоинты, авторизацию и действия с медиа в Swagger.",
        to: "http://localhost:3000/docs",
        external: true,
      },
    ] satisfies HomeTile[],
  },
} as const;

export function HomePage({ language }: HomePageProps) {
  const t = copy[language];
  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 1.5, md: 2.5 } }}>
      <Container>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Button size="small" variant="outlined">
              {t.legal}
            </Button>
            <Button size="small" variant="outlined">
              {t.privacy}
            </Button>
            <Button size="small" variant="outlined">
              {t.languageLabel}
            </Button>
          </Stack>

          <Paper sx={{ p: { xs: 2, md: 4 }, backgroundColor: "background.paper" }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.4fr) 0.8fr 0.7fr" },
                gap: 3,
                alignItems: "start",
              }}
            >
              <Stack spacing={2}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "flex-start", flexWrap: "wrap" }}
                >
                  <Typography variant="h1">{t.hero}</Typography>
                  <Chip label={t.info} size="small" sx={{ mt: 1 }} />
                </Stack>
                <Typography sx={{ maxWidth: 760, fontSize: { xs: "1rem", md: "1.15rem" } }}>
                  {t.heroDescription}
                </Typography>
              </Stack>

              <Stack spacing={1}>
                <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: "0.12em" }}>
                  {t.location}
                </Typography>
                <Typography variant="h6">
                  {t.locationText[0]}
                  <br />
                  {t.locationText[1]}
                  <br />
                  {t.locationText[2]}
                </Typography>
              </Stack>

              <Stack spacing={1}>
                <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: "0.12em" }}>
                  {t.access}
                </Typography>
                <Typography variant="h6">
                  {t.accessText[0]}
                  <br />
                  {t.accessText[1]}
                  <br />
                  {t.accessText[2]}
                </Typography>
              </Stack>
            </Box>
          </Paper>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", xl: "1.1fr 1.1fr 1.1fr 1fr" },
              gap: 1.5,
            }}
          >
            {t.tiles.map((tile) => (
              <Paper
                key={tile.title}
                sx={{
                  p: 2.5,
                  minHeight: { xs: 220, md: 320, xl: 420 },
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  backgroundColor: "background.paper",
                }}
                >
                  <Stack spacing={2}>
                    <Chip label={tile.eyebrow} size="small" sx={{ alignSelf: "flex-start" }} />
                  <Typography variant="h3">{tile.title}</Typography>
                  <Typography color="text.secondary">{tile.description}</Typography>
                </Stack>
                <Button
                  variant="contained"
                  component={tile.external ? "a" : RouterLink}
                  href={tile.external ? tile.to : undefined}
                  to={tile.external ? undefined : tile.to}
                  target={tile.external ? "_blank" : undefined}
                  rel={tile.external ? "noreferrer" : undefined}
                  sx={{ alignSelf: "flex-start", mt: 3 }}
                >
                  {t.open}
                </Button>
              </Paper>
            ))}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

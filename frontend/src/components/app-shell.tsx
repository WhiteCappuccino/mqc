import { Box, Button, Container, Divider, Stack, Toolbar, Typography } from "@mui/material";
import { Link as RouterLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/auth-context";

interface AppShellProps {
  colorMode: "light" | "dark";
  language: "en" | "ru";
  onToggleColorMode: () => void;
  onToggleLanguage: () => void;
}

const labels = {
  en: {
    dashboard: "Dashboard",
    upload: "Upload file",
    favorites: "Favorites",
    collections: "Collections",
    alerts: "Alerts",
    profile: "Profile",
    moderation: "Moderation",
    admin: "Админ-панель",
    home: "Home",
    dark: "Dark",
    light: "Light",
  },
  ru: {
    dashboard: "Дашборд",
    upload: "Загрузить файл",
    favorites: "Избранное",
    collections: "Коллекции",
    alerts: "Уведомления",
    profile: "Профиль",
    moderation: "Модерация",
    admin: "Админ-панель",
    home: "Главная",
    dark: "Темная",
    light: "Светлая",
  },
} as const;

export function AppShell({
  colorMode,
  language,
  onToggleColorMode,
  onToggleLanguage,
}: AppShellProps) {
  const { viewer } = useAuth();
  const canModerate = viewer?.role === "MODERATOR" || viewer?.role === "ADMIN";
  const isAdmin = viewer?.role === "ADMIN";
  const t = labels[language];
  const links = [
    { to: "/dashboard", label: t.dashboard },
    { to: "/upload", label: t.upload },
    { to: "/favorites", label: t.favorites },
    { to: "/collections", label: t.collections },
    { to: "/notifications", label: t.alerts },
    { to: "/profile", label: t.profile },
    ...(canModerate ? [{ to: "/moderation", label: t.moderation }] : []),
    ...(isAdmin ? [{ to: "/admin", label: t.admin }] : []),
    { to: "/", label: t.home },
  ];

  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 1.5, md: 2.5 } }}>
      <Container>
        <Stack
          sx={{
            gap: 1.5,
          }}
        >
          <Toolbar
            sx={{
              px: 0,
              py: 0,
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", flexWrap: "wrap" }}>
              <Typography variant="h3">MQC</Typography>
              <Stack direction="row" spacing={1} sx={{ ml: { xs: 2.5, md: 4 } }}>
                <Button variant="outlined" onClick={onToggleColorMode}>
                  {colorMode === "light" ? t.dark : t.light}
                </Button>
                <Button variant="outlined" onClick={onToggleLanguage}>
                  {language === "en" ? "RU" : "EN"}
                </Button>
              </Stack>
            </Stack>

            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={1}
              sx={{ alignItems: { xs: "stretch", lg: "flex-start" }, flexWrap: "wrap" }}
            >
              {links.map((link) => (
                <Button key={link.to} component={RouterLink} to={link.to} variant="outlined">
                  {link.label}
                </Button>
              ))}
            </Stack>
          </Toolbar>
          <Divider sx={{ borderColor: "divider", borderBottomWidth: 1.5 }} />
          <Box sx={{ py: { xs: 2, md: 3 } }}>
            <Outlet />
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

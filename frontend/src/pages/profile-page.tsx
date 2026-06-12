import {
  Alert,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import { formatDateTime, formatMediaStatus, normalizeAppError } from "../i18n/ui-text";
import type { MediaItem, Viewer } from "../types/domain";
import type { UiPreferences } from "../ui/ui-preferences";

interface ProfilePageProps {
  language: "en" | "ru";
  preferences: UiPreferences;
  onPreferencesChange: Dispatch<SetStateAction<UiPreferences>>;
}

const copy = {
  en: {
    title: "Profile",
    interfaceTitle: "Interface settings",
    interfaceDescription: "Adjust the workspace look and behavior without mixing those options into notifications.",
    profileUnavailable: "Profile unavailable",
    loadError: "Failed to load profile",
    saveError: "Failed to save profile",
    passwordError: "Failed to change password",
    profileUpdated: "Profile updated",
    passwordChanged: "Password changed",
    email: "Email",
    fullName: "Full name",
    username: "Username",
    themeMode: "Theme",
    lightTheme: "Light",
    darkTheme: "Dark",
    languageSetting: "Language",
    english: "English",
    russian: "Russian",
    showGrid: "Show background grid",
    softBorders: "Use softer interface borders",
    inAppNotifications: "In-app notifications",
    emailNotifications: "Email notifications",
    hideDashboardHero: "Hide large dashboard header",
    interfaceApplied: "Interface settings are applied instantly",
    saveProfile: "Save profile",
    logout: "Logout",
    changePassword: "Change password",
    currentPassword: "Current password",
    newPassword: "New password",
    updatePassword: "Update password",
    history: "Upload and check history",
    noActivity: "No activity yet",
  },
  ru: {
    title: "Профиль",
    interfaceTitle: "Настройки интерфейса",
    interfaceDescription:
      "Меняйте внешний вид и поведение рабочего пространства отдельно от уведомлений.",
    profileUnavailable: "Профиль недоступен",
    loadError: "Не удалось загрузить профиль",
    saveError: "Не удалось сохранить профиль",
    passwordError: "Не удалось изменить пароль",
    profileUpdated: "Профиль обновлен",
    passwordChanged: "Пароль изменен",
    email: "Эл. почта",
    fullName: "Полное имя",
    username: "Имя пользователя",
    themeMode: "Тема",
    lightTheme: "Светлая",
    darkTheme: "Темная",
    languageSetting: "Язык",
    english: "Английский",
    russian: "Русский",
    showGrid: "Показывать фоновую сетку",
    softBorders: "Смягчать границы интерфейса",
    inAppNotifications: "Уведомления в приложении",
    emailNotifications: "Email-уведомления",
    hideDashboardHero: "Скрыть большой заголовок на дашборде",
    interfaceApplied: "Настройки интерфейса применяются сразу",
    saveProfile: "Сохранить профиль",
    logout: "Выйти",
    changePassword: "Сменить пароль",
    currentPassword: "Текущий пароль",
    newPassword: "Новый пароль",
    updatePassword: "Обновить пароль",
    history: "История загрузок и проверок",
    noActivity: "Пока нет активности",
  },
} as const;

export function ProfilePage({ language, preferences, onPreferencesChange }: ProfilePageProps) {
  const { token, logout } = useAuth();
  const t = copy[language];
  const [profile, setProfile] = useState<Viewer | null>(null);
  const [history, setHistory] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [profileData, historyData] = await Promise.all([
        api.getProfile(token),
        api.profileHistory(token),
      ]);
      setProfile(profileData);
      setHistory(historyData);
    } catch (loadError) {
      setError(normalizeAppError(loadError, language, t.loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function saveProfile() {
    if (!token || !profile) return;
    setError(null);
    setSuccess(null);
    try {
      const updated = await api.updateProfile(
        {
          fullName: profile.fullName,
          username: profile.username,
          notificationEmail: profile.notificationEmail,
          notificationInApp: profile.notificationInApp,
        },
        token,
      );
      setProfile(updated);
      setSuccess(t.profileUpdated);
    } catch (saveError) {
      setError(normalizeAppError(saveError, language, t.saveError));
    }
  }

  async function changePassword() {
    if (!token) return;
    setError(null);
    setSuccess(null);
    try {
      await api.changePassword({ currentPassword, newPassword }, token);
      setCurrentPassword("");
      setNewPassword("");
      setSuccess(t.passwordChanged);
    } catch (saveError) {
      setError(normalizeAppError(saveError, language, t.passwordError));
    }
  }

  if (loading) {
    return (
      <Stack sx={{ alignItems: "center", mt: 4 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (!profile) {
    return <Alert severity="error">{t.profileUnavailable}</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h2">{t.title}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <TextField label={t.email} value={profile.email} disabled />
            <TextField
              label={t.fullName}
              value={profile.fullName}
              onChange={(event) =>
                setProfile((prev) => (prev ? { ...prev, fullName: event.target.value } : prev))
              }
            />
            <TextField
              label={t.username}
              value={profile.username}
              onChange={(event) =>
                setProfile((prev) => (prev ? { ...prev, username: event.target.value } : prev))
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(profile.notificationInApp)}
                  onChange={(event) =>
                    setProfile((prev) =>
                      prev ? { ...prev, notificationInApp: event.target.checked } : prev,
                    )
                  }
                />
              }
              label={t.inAppNotifications}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(profile.notificationEmail)}
                  onChange={(event) =>
                    setProfile((prev) =>
                      prev ? { ...prev, notificationEmail: event.target.checked } : prev,
                    )
                  }
                />
              }
              label={t.emailNotifications}
            />
            <Button variant="contained" onClick={saveProfile}>
              {t.saveProfile}
            </Button>
            <Button color="error" variant="outlined" onClick={logout}>
              {t.logout}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t.changePassword}
          </Typography>
          <Stack spacing={2}>
            <TextField
              label={t.currentPassword}
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
            <TextField
              label={t.newPassword}
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <Button variant="outlined" onClick={changePassword}>
              {t.updatePassword}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant="h6">{t.interfaceTitle}</Typography>
              <Typography color="text.secondary">{t.interfaceDescription}</Typography>
            </Stack>
            <TextField
              select
              label={t.themeMode}
              value={preferences.colorMode}
              onChange={(event) =>
                onPreferencesChange((current) => ({
                  ...current,
                  colorMode: event.target.value as UiPreferences["colorMode"],
                }))
              }
            >
              <MenuItem value="light">{t.lightTheme}</MenuItem>
              <MenuItem value="dark">{t.darkTheme}</MenuItem>
            </TextField>
            <TextField
              select
              label={t.languageSetting}
              value={preferences.language}
              onChange={(event) =>
                onPreferencesChange((current) => ({
                  ...current,
                  language: event.target.value as UiPreferences["language"],
                }))
              }
            >
              <MenuItem value="en">{t.english}</MenuItem>
              <MenuItem value="ru">{t.russian}</MenuItem>
            </TextField>
            <FormControlLabel
              control={
                <Checkbox
                  checked={preferences.showGrid}
                  onChange={(event) =>
                    onPreferencesChange((current) => ({
                      ...current,
                      showGrid: event.target.checked,
                    }))
                  }
                />
              }
              label={t.showGrid}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={preferences.softBorders}
                  onChange={(event) =>
                    onPreferencesChange((current) => ({
                      ...current,
                      softBorders: event.target.checked,
                    }))
                  }
                />
              }
              label={t.softBorders}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={preferences.hideDashboardHero}
                  onChange={(event) =>
                    onPreferencesChange((current) => ({
                      ...current,
                      hideDashboardHero: event.target.checked,
                    }))
                  }
                />
              }
              label={t.hideDashboardHero}
            />
            <Alert severity="info">{t.interfaceApplied}</Alert>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t.history}
          </Typography>
          <Stack spacing={1}>
            {history.map((item) => (
              <Typography key={item.id} variant="body2">
                {item.title} | {formatMediaStatus(item.status, language)} | {formatDateTime(item.createdAt, language)}
              </Typography>
            ))}
            {!history.length && <Typography color="text.secondary">{t.noActivity}</Typography>}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

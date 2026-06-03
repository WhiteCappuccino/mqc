import { ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/auth-context";
import { AppShell } from "./components/app-shell";
import { ProtectedRoute } from "./components/protected-route";
import { AdminPage } from "./pages/admin-page";
import { CollectionsPage } from "./pages/collections-page";
import { DashboardPage } from "./pages/dashboard-page";
import { FavoritesPage } from "./pages/favorites-page";
import { ForgotPasswordPage } from "./pages/forgot-password-page";
import { HomePage } from "./pages/home-page";
import { LoginPage } from "./pages/login-page";
import { MediaDetailsPage } from "./pages/media-details-page";
import { ModerationPage } from "./pages/moderation-page";
import { NotificationsPage } from "./pages/notifications-page";
import { ProfilePage } from "./pages/profile-page";
import { RegisterPage } from "./pages/register-page";
import { ResetPasswordPage } from "./pages/reset-password-page";
import { UploadPage } from "./pages/upload-page";
import { VerifyEmailPage } from "./pages/verify-email-page";
import { createAppTheme } from "./theme/app-theme";
import { useEffect } from "react";
import {
  UI_PREFERENCES_STORAGE_KEY,
  defaultUiPreferences,
  loadUiPreferences,
  type UiPreferences,
} from "./ui/ui-preferences";

function App() {
  const [preferences, setPreferences] = useState<UiPreferences>(() =>
    typeof window === "undefined" ? defaultUiPreferences : loadUiPreferences(),
  );
  const theme = useMemo(
    () =>
      createAppTheme(preferences.colorMode, {
        showGrid: preferences.showGrid,
        softBorders: preferences.softBorders,
      }),
    [preferences.colorMode, preferences.showGrid, preferences.softBorders],
  );

  useEffect(() => {
    localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage language={preferences.language} />} />
            <Route path="/login" element={<LoginPage language={preferences.language} />} />
            <Route path="/register" element={<RegisterPage language={preferences.language} />} />
            <Route
              path="/forgot-password"
              element={<ForgotPasswordPage language={preferences.language} />}
            />
            <Route
              path="/reset-password"
              element={<ResetPasswordPage language={preferences.language} />}
            />
            <Route
              path="/verify-email"
              element={<VerifyEmailPage language={preferences.language} />}
            />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell
                    colorMode={preferences.colorMode}
                    language={preferences.language}
                    onToggleColorMode={() =>
                      setPreferences((current) => ({
                        ...current,
                        colorMode: current.colorMode === "light" ? "dark" : "light",
                      }))
                    }
                    onToggleLanguage={() =>
                      setPreferences((current) => ({
                        ...current,
                        language: current.language === "en" ? "ru" : "en",
                      }))
                    }
                  />
                </ProtectedRoute>
              }
            >
              <Route
                path="/dashboard"
                element={
                  <DashboardPage
                    language={preferences.language}
                    hideHero={preferences.hideDashboardHero}
                  />
                }
              />
              <Route path="/upload" element={<UploadPage language={preferences.language} />} />
              <Route
                path="/media/:id"
                element={<MediaDetailsPage language={preferences.language} />}
              />
              <Route
                path="/favorites"
                element={<FavoritesPage language={preferences.language} />}
              />
              <Route
                path="/collections"
                element={<CollectionsPage language={preferences.language} />}
              />
              <Route
                path="/notifications"
                element={<NotificationsPage language={preferences.language} />}
              />
              <Route
                path="/profile"
                element={
                  <ProfilePage
                    language={preferences.language}
                    preferences={preferences}
                    onPreferencesChange={setPreferences}
                  />
                }
              />
              <Route
                path="/moderation"
                element={
                  <ProtectedRoute roles={["MODERATOR", "ADMIN"]}>
                    <ModerationPage language={preferences.language} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute roles={["ADMIN"]}>
                    <AdminPage language={preferences.language} />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

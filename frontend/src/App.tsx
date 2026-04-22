import { ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
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
import { appTheme } from "./theme/app-theme";

function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/media/:id" element={<MediaDetailsPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/collections" element={<CollectionsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                path="/moderation"
                element={
                  <ProtectedRoute roles={["MODERATOR", "ADMIN"]}>
                    <ModerationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute roles={["ADMIN"]}>
                    <AdminPage />
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

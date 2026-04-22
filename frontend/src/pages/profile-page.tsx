import {
  Alert,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import type { MediaItem, Viewer } from "../types/domain";

export function ProfilePage() {
  const { token } = useAuth();
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
      setError(loadError instanceof Error ? loadError.message : "Failed to load profile");
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
      setSuccess("Profile updated");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save profile");
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
      setSuccess("Password changed");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to change password");
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
    return <Alert severity="error">Profile unavailable</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Profile
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <TextField label="Email" value={profile.email} disabled />
            <TextField
              label="Full name"
              value={profile.fullName}
              onChange={(event) =>
                setProfile((prev) => (prev ? { ...prev, fullName: event.target.value } : prev))
              }
            />
            <TextField
              label="Username"
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
              label="In-app notifications"
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
              label="Email notifications"
            />
            <Button variant="contained" onClick={saveProfile}>
              Save profile
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Change password
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
            <TextField
              label="New password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <Button variant="outlined" onClick={changePassword}>
              Update password
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Upload and check history
          </Typography>
          <Stack spacing={1}>
            {history.map((item) => (
              <Typography key={item.id} variant="body2">
                {item.title} | {item.status} | {new Date(item.createdAt).toLocaleString()}
              </Typography>
            ))}
            {!history.length && <Typography color="text.secondary">No activity yet</Typography>}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}


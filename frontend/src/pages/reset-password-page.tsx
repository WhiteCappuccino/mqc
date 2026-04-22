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
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setSuccess(null);
    try {
      await api.resetPassword(token, newPassword);
      setSuccess("Password updated");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Reset failed");
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at 85% 20%, #bfdbfe 0%, #dcfce7 45%, #f8fafc 100%)",
      }}
    >
      <Card sx={{ width: 420, borderRadius: 3, boxShadow: 8 }}>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Set New Password
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Use token from email/demo message
          </Typography>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            <TextField
              label="Reset token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
            <TextField
              label="New password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <Button variant="contained" onClick={submit}>
              Update password
            </Button>
            <Button component={Link} to="/login">
              Back to login
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}


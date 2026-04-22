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

export function VerifyEmailPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setSuccess(null);
    try {
      await api.verifyEmail(token);
      setSuccess("Email verified");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Verification failed");
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at 20% 15%, #e9d5ff 0%, #bfdbfe 45%, #f8fafc 100%)",
      }}
    >
      <Card sx={{ width: 420, borderRadius: 3, boxShadow: 8 }}>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Verify Email
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Paste verification token
          </Typography>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            <TextField
              label="Verification token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
            <Button variant="contained" onClick={submit}>
              Verify
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


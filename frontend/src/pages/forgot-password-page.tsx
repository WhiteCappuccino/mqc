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

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setSuccess(null);
    try {
      await api.forgotPassword(email);
      setSuccess("If account exists, reset instructions were sent to email.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Request failed");
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at 15% 20%, #fde68a 0%, #dbeafe 45%, #f8fafc 100%)",
      }}
    >
      <Card sx={{ width: 420, borderRadius: 3, boxShadow: 8 }}>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Reset Password
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Enter your account email
          </Typography>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button variant="contained" onClick={submit}>
              Send reset instructions
            </Button>
            <Button component={Link} to="/reset-password">
              Already have token
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

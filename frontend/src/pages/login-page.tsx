import { zodResolver } from "@hookform/resolvers/zod";
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
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../auth/auth-context";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Minimum 8 chars"),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

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
      await login(values.email, values.password);
      navigate("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed");
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at 10% 10%, #fef3c7 0%, #dbeafe 45%, #f8fafc 100%)",
      }}
    >
      <Card sx={{ width: 420, borderRadius: 3, boxShadow: 8 }}>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Sign In
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Media quality platform access
          </Typography>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Email"
                type="email"
                {...register("email")}
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
              />
              <TextField
                label="Password"
                type="password"
                {...register("password")}
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
              />
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                Login
              </Button>
              <Button component={Link} to="/register">
                Create account
              </Button>
              <Button component={Link} to="/forgot-password">
                Forgot password
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

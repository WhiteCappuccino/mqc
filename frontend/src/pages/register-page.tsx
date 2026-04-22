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

const schema = z
  .object({
    fullName: z.string().min(2, "Minimum 2 chars"),
    username: z
      .string()
      .min(3, "Minimum 3 chars")
      .regex(/^[a-zA-Z0-9_.-]+$/, "Only letters, digits and _.-"),
    email: z.string().email("Invalid email"),
    password: z
      .string()
      .min(8, "Minimum 8 chars")
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, "Use upper/lowercase and digit"),
    confirmPassword: z.string().min(8, "Minimum 8 chars"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerAccount } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    setVerificationToken(null);
    try {
      const auth = await registerAccount({
        email: values.email,
        username: values.username,
        fullName: values.fullName,
        password: values.password,
      });
      if (auth.verificationToken) {
        setVerificationToken(auth.verificationToken);
      }
      navigate("/dashboard");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Registration failed",
      );
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at 85% 20%, #bbf7d0 0%, #dbeafe 50%, #f8fafc 100%)",
      }}
    >
      <Card sx={{ width: 420, borderRadius: 3, boxShadow: 8 }}>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Create Account
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Get access to media checks and moderation
          </Typography>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              {verificationToken && (
                <Alert severity="info">
                  Verification token (demo): {verificationToken}
                </Alert>
              )}
              <TextField
                label="Full name"
                {...register("fullName")}
                error={Boolean(errors.fullName)}
                helperText={errors.fullName?.message}
              />
              <TextField
                label="Username"
                {...register("username")}
                error={Boolean(errors.username)}
                helperText={errors.username?.message}
              />
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
              <TextField
                label="Confirm password"
                type="password"
                {...register("confirmPassword")}
                error={Boolean(errors.confirmPassword)}
                helperText={errors.confirmPassword?.message}
              />
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                Register
              </Button>
              <Button component={Link} to="/login">
                Already have an account
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

import { CircularProgress, Stack } from "@mui/material";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import type { ReactElement } from "react";
import type { UserRole } from "../types/domain";

interface ProtectedRouteProps {
  children: ReactElement;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { viewer, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Stack
        sx={{ minHeight: "100vh", alignItems: "center", justifyContent: "center" }}
      >
        <CircularProgress />
      </Stack>
    );
  }

  if (!viewer) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(viewer.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

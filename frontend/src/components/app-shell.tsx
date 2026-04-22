import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { Link as RouterLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/auth-context";

export function AppShell() {
  const { viewer, logout } = useAuth();
  const canModerate = viewer?.role === "MODERATOR" || viewer?.role === "ADMIN";
  const isAdmin = viewer?.role === "ADMIN";

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(180deg,#f8fafc,#eef2ff)" }}>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar sx={{ borderBottom: "1px solid #dbe3f0" }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Media Quality Control
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>
            <Button component={RouterLink} to="/dashboard">
              Dashboard
            </Button>
            <Button component={RouterLink} to="/upload">
              Upload
            </Button>
            <Button component={RouterLink} to="/favorites">
              Favorites
            </Button>
            <Button component={RouterLink} to="/collections">
              Collections
            </Button>
            <Button component={RouterLink} to="/notifications">
              Notifications
            </Button>
            <Button component={RouterLink} to="/profile">
              Profile
            </Button>
            {canModerate && (
              <Button component={RouterLink} to="/moderation">
                Moderation
              </Button>
            )}
            {isAdmin && (
              <Button component={RouterLink} to="/admin">
                Admin
              </Button>
            )}
            <Button component={RouterLink} to="/">
              Home
            </Button>
            <Button color="error" onClick={logout}>
              Logout
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3 }}>
        <Outlet />
      </Container>
    </Box>
  );
}

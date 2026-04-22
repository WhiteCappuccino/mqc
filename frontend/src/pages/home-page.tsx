import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export function HomePage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at 20% 15%, #bfdbfe 0%, #bbf7d0 45%, #f8fafc 100%)",
        px: 2,
      }}
    >
      <Card sx={{ maxWidth: 760, width: "100%", borderRadius: 3, boxShadow: 8 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
              Media Quality Control Platform
            </Typography>
            <Typography color="text.secondary">
              Platform for automated quality checks, moderation, and collaboration across images,
              video, audio, and text content.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="contained" component={RouterLink} to="/login">
                Sign in
              </Button>
              <Button variant="outlined" component={RouterLink} to="/register">
                Register
              </Button>
              <Button component={RouterLink} to="/forgot-password">
                Reset password
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1d4ed8",
    },
    secondary: {
      main: "#0891b2",
    },
    background: {
      default: "#f8fafc",
      paper: "#ffffff",
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: `"DM Sans","Segoe UI",sans-serif`,
    h5: {
      letterSpacing: -0.4,
    },
  },
});

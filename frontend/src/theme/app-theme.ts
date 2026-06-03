import { createTheme } from "@mui/material/styles";

interface ThemeOptions {
  showGrid: boolean;
  softBorders: boolean;
}

export function createAppTheme(mode: "light" | "dark", options: ThemeOptions) {
  const isDark = mode === "dark";
  const lineColor = options.softBorders
    ? isDark
      ? "rgba(245,241,234,0.48)"
      : "rgba(17,17,17,0.38)"
    : isDark
      ? "rgba(245,241,234,0.7)"
      : "rgba(17,17,17,0.6)";
  const gridColor = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.035)";
  const bodyBackground = options.showGrid
    ? mode === "dark"
      ? `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px), #0b0b0b`
      : `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px), #f8f6f1`
    : isDark
      ? "#0b0b0b"
      : "#f8f6f1";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? "#f5f1ea" : "#111111",
        contrastText: isDark ? "#111111" : "#f5f1ea",
      },
      secondary: {
        main: isDark ? "#2a2a2a" : "#ebdfd7",
        contrastText: isDark ? "#f5f1ea" : "#111111",
      },
      success: {
        main: "#9bd3ae",
        contrastText: "#111111",
      },
      warning: {
        main: "#efd7a6",
        contrastText: "#111111",
      },
      error: {
        main: "#e8b8b0",
        contrastText: "#111111",
      },
      background: {
        default: isDark ? "#0b0b0b" : "#f8f6f1",
        paper: isDark ? "#151515" : "#fffdf8",
      },
      text: {
        primary: isDark ? "#f5f1ea" : "#111111",
        secondary: isDark ? "rgba(245,241,234,0.82)" : "rgba(17,17,17,0.66)",
      },
      divider: lineColor,
    },
    shape: {
      borderRadius: 28,
    },
    typography: {
      fontFamily: `"Manrope","Segoe UI",sans-serif`,
      h1: {
        fontFamily: `"Space Grotesk","Manrope",sans-serif`,
        fontWeight: 700,
        fontSize: "clamp(4rem, 14vw, 8.5rem)",
        lineHeight: 0.9,
        letterSpacing: "-0.08em",
      },
      h2: {
        fontFamily: `"Space Grotesk","Manrope",sans-serif`,
        fontWeight: 700,
        fontSize: "clamp(2.5rem, 7vw, 5rem)",
        lineHeight: 0.95,
        letterSpacing: "-0.06em",
      },
      h3: {
        fontFamily: `"Space Grotesk","Manrope",sans-serif`,
        fontWeight: 700,
        fontSize: "clamp(2rem, 5vw, 3.5rem)",
        lineHeight: 1,
        letterSpacing: "-0.05em",
      },
      h4: {
        fontWeight: 700,
        fontSize: "clamp(1.65rem, 3vw, 2.6rem)",
        lineHeight: 1.05,
        letterSpacing: "-0.04em",
      },
      h5: {
        fontWeight: 700,
        fontSize: "1.5rem",
        lineHeight: 1.1,
        letterSpacing: "-0.04em",
      },
      h6: {
        fontWeight: 700,
        fontSize: "1.15rem",
        lineHeight: 1.2,
        letterSpacing: "-0.03em",
      },
      body1: {
        fontSize: "1rem",
        lineHeight: 1.6,
      },
      button: {
        fontWeight: 700,
        textTransform: "none",
        letterSpacing: "-0.02em",
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: isDark ? "#f5f1ea #0a0a0a" : "#111111 #d8d5cf",
            background: bodyBackground,
            backgroundSize: options.showGrid ? "120px 120px, 120px 120px, auto" : "auto",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 28,
            border: `1.5px solid ${lineColor}`,
            boxShadow: "none",
            backgroundImage: "none",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 28,
            border: `1.5px solid ${lineColor}`,
            boxShadow: "none",
            backgroundImage: "none",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            boxShadow: "none",
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 999,
            paddingInline: 18,
            paddingBlock: 10,
            border: `1.5px solid ${lineColor}`,
          },
          contained: {
            "&:hover": {
              backgroundColor: isDark ? "#e7ddd2" : "#2b2b2b",
            },
          },
          outlined: {
            borderWidth: 2,
            backgroundColor: isDark ? "#181818" : "#fffdf8",
          },
          text: {
            borderColor: "transparent",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            border: `1.5px solid ${lineColor}`,
            backgroundColor: isDark ? "#181818" : "#fffdf8",
            fontWeight: 700,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: "outlined",
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            backgroundColor: isDark ? "#181818" : "#fffdf8",
            "& fieldset": {
              borderWidth: 1.5,
              borderColor: lineColor,
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          icon: {
            color: isDark ? "#f5f1ea" : "#111111",
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            color: isDark ? "rgba(245,241,234,0.82)" : "rgba(17,17,17,0.66)",
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            border: `1.5px solid ${lineColor}`,
          },
        },
      },
      MuiContainer: {
        defaultProps: {
          maxWidth: "xl",
        },
      },
    },
  });
}

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#4b3aff", light: "#eeecff" },
    text: { primary: "#14141a", secondary: "#6c6c78" },
    background: { default: "#f6f5fb", paper: "#ffffff" },
    divider: "#ebe9f3",
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 14,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, borderRadius: 12, minWidth: 0 },
        sizeSmall: { fontSize: 12, padding: "4px 10px" },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          boxShadow: "0 1px 2px rgba(20,20,26,0.04), 0 8px 24px rgba(20,20,26,0.06)",
          border: "1px solid #ebe9f3",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 9999, fontWeight: 600, fontSize: 12, height: 26 },
        label: { padding: "0 10px" },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 12,
            backgroundColor: "#ffffff",
            fontSize: 13,
          },
        },
      },
    },
  },
});

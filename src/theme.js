import { createTheme } from "@mui/material/styles";

export const getAppTheme = (mode, primaryColor = "#ef233c") => createTheme({
  direction: "rtl",
  typography: {
    fontFamily: '"Changa", system-ui, sans-serif',
  },
  palette: {
    mode: mode, // dynamic mode
    primary: { main: primaryColor },
    background: {
      default: mode === 'dark' ? "#090c11" : "#F8FAFC",
      paper: mode === 'dark' ? "#11161d" : "#FFFFFF",
    },
    text: {
      primary: mode === 'dark' ? "#ffffff" : "#0f172a",
    }
  },
  shape: { borderRadius: 24 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
            transition: 'background-color 0.3s ease, color 0.3s ease',
        }
      }
    }
  }
});

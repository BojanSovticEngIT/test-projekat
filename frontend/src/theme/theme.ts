import { createTheme, alpha } from '@mui/material/styles';

// Engage Design System — Main Palette (single source of truth)
export const engColors = {
  red: '#C5004B',
  blue: '#002F53',
  black: '#000000',
  grey: '#F3F4F6',
  white: '#FFFFFF'
} as const;

// Portfolio palette — used for role badges and status indicators
export const portfolioColors = {
  smartTransportation: '#035D67',
  augmentedCities: '#FE7311',
  smartGovernment: '#3F4FA2',
  digitalFinance: '#4AACC5',
  eHealth: '#00B0AB',
  mediaComm: '#DC4165'
} as const;

export const theme = createTheme({
  palette: {
    primary: {
      main: engColors.red,
      contrastText: engColors.white
    },
    secondary: {
      main: engColors.blue,
      contrastText: engColors.white
    },
    background: {
      default: engColors.grey,
      paper: engColors.white
    },
    text: {
      primary: engColors.black,
      secondary: '#5C6070'
    }
  },
  shape: {
    borderRadius: 8
  },
  typography: {
    // Neue Haas Grotesk via Adobe Fonts, Roboto as fallback
    fontFamily: '"neue-haas-grotesk-text", "Roboto", Arial, sans-serif',
    h1: { fontFamily: '"neue-haas-grotesk-display", "Roboto", Arial, sans-serif', fontWeight: 700 },
    h2: { fontFamily: '"neue-haas-grotesk-display", "Roboto", Arial, sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"neue-haas-grotesk-display", "Roboto", Arial, sans-serif', fontWeight: 700 },
    h4: { fontFamily: '"neue-haas-grotesk-display", "Roboto", Arial, sans-serif', fontWeight: 700, fontSize: '1.5rem' },
    h5: { fontFamily: '"neue-haas-grotesk-display", "Roboto", Arial, sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"neue-haas-grotesk-display", "Roboto", Arial, sans-serif', fontWeight: 600 },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    subtitle2: { fontWeight: 500, fontSize: '0.8125rem', letterSpacing: '0.01em' }
  },
  components: {
    MuiButton: {
      defaultProps: {
        variant: 'contained',
        disableElevation: true
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: '0.01em',
          borderRadius: 8
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#a50040'
          }
        },
        outlinedPrimary: {
          borderColor: engColors.red,
          '&:hover': {
            backgroundColor: alpha(engColors.red, 0.06)
          }
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small'
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: engColors.white
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: engColors.blue,
          color: engColors.white
        }
      }
    },
    MuiCard: {
      defaultProps: {
        elevation: 0
      },
      styleOverrides: {
        root: {
          // borderRadius: 12,
          border: `1px solid #E5E7EB`
        }
      }
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0
      },
      styleOverrides: {
        root: {
          // borderRadius: 12
        },
        outlined: {
          borderColor: '#E5E7EB'
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#F8F9FB',
          '& .MuiTableCell-head': {
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: '#374151',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            borderBottom: '2px solid #E5E7EB',
            padding: '10px 16px'
          }
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#F3F4F6',
          fontSize: '0.9rem',
          padding: '12px 16px'
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: alpha(engColors.blue, 0.03)
          },
          '&:last-child td': {
            borderBottom: 0
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.75rem',
          letterSpacing: '0.02em',
          borderRadius: 6
        }
      }
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: '1.1rem',
          padding: '20px 24px 12px'
        }
      }
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '8px 24px'
        }
      }
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px'
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8
        }
      }
    }
  }
});

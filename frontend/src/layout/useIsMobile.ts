import { useMediaQuery, useTheme } from '@mui/material';

// The app's only responsive boundary is MUI's `sm` breakpoint (xs vs sm in AppLayout/TopBar sizing).
function useIsMobile(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
}

export default useIsMobile;

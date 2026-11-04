import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

export const SectionTitle = ({ children }: { children: string }): JSX.Element => (
  <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: 'block' }}>
    {children}
  </Typography>
);

/** Label/value pair; must be rendered inside a `dl` (e.g. `<Stack component="dl">`). */
export const DetailRow = ({ label, children }: { label: string; children: ReactNode }): JSX.Element => (
  <Box sx={{ display: 'grid', gridTemplateColumns: '140px minmax(0, 1fr)', gap: 1 }}>
    <Typography component="dt" variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography component="dd" variant="body2" sx={{ m: 0, overflowWrap: 'anywhere' }}>
      {children}
    </Typography>
  </Box>
);

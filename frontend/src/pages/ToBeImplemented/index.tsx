import { Alert, Box, Typography } from '@mui/material';

interface ToBeImplementedPageProps {
  title: string;
}

function ToBeImplementedPage({ title }: ToBeImplementedPageProps): JSX.Element {
  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Alert severity="info">To be implemented</Alert>
    </Box>
  );
}

export default ToBeImplementedPage;

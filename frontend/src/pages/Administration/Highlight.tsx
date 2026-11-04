import { Box } from '@mui/material';

function Highlight({ text, query }: { text: string; query: string }): JSX.Element {
  const index = query ? text.toLowerCase().indexOf(query) : -1;
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <Box component="mark" sx={{ bgcolor: 'warning.light', color: 'inherit', borderRadius: 0.5 }}>
        {text.slice(index, index + query.length)}
      </Box>
      {text.slice(index + query.length)}
    </>
  );
}

export default Highlight;

import { Box } from '@mui/material';
import type { DemandBase } from '../../types/demand.types';

const COLORS: Record<string, string> = { filled: 'success.main', cancelled: 'grey.500', open: 'grey.300' };

function PositionsBar({ demand }: { demand: DemandBase }): JSX.Element {
  const open = Math.max(0, demand.openPositions);
  const segments = [
    ...Array<string>(demand.filledPositions).fill('filled'),
    ...Array<string>(demand.cancelledPositions).fill('cancelled'),
    ...Array<string>(open).fill('open')
  ];

  return (
    <Box aria-hidden sx={{ display: 'flex', gap: '2px', mb: 0.5 }}>
      {segments.map((segment, index) => (
        <Box key={`${segment}-${index}`} sx={{ width: 14, height: 6, borderRadius: 0.5, bgcolor: COLORS[segment] }} />
      ))}
    </Box>
  );
}

export default PositionsBar;

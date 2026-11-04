import { Box, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { engColors } from '../../theme/theme';

export interface NavigationCardProps {
  label: string;
  description: string;
  icon: ReactNode;
  route: string;
  accentColor?: string;
}

function NavigationCard({
  label,
  description,
  icon,
  route,
  accentColor = engColors.red
}: NavigationCardProps): JSX.Element {
  const navigate = useNavigate();

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'box-shadow 0.2s, transform 0.2s',
        '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.1)', transform: 'translateY(-2px)' }
      }}
    >
      <CardActionArea onClick={() => navigate(route)} sx={{ height: '100%' }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ color: 'text.secondary', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem' }}
              >
                {label}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 160 }}>
                {description}
              </Typography>
            </Box>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: `${accentColor}18`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: accentColor,
                flexShrink: 0
              }}
            >
              {icon}
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default NavigationCard;

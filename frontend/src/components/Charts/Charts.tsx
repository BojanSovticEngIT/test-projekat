import { Box, ButtonBase, Card, CardContent, Stack, Tooltip, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { engColors } from '../../theme/theme';
import type { ChartDatum } from '../../types/intelligence.types';

const PALETTE = [engColors.blue, engColors.red, '#4AACC5', '#035D67', '#FE7311', '#3F4FA2', '#00B0AB'];

interface ChartProps {
  data: ChartDatum[];
  onSelect?: (datum: ChartDatum) => void;
  valueFormat?: (value: number) => string;
  emptyText?: string;
}

const fmt = (value: number): string => String(Math.round(value * 100) / 100);

export function ChartCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }): JSX.Element {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={600} component="h2">
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

// Horizontal bars; rows are buttons when onSelect is given (drill-down).
export function BarChart({ data, onSelect, valueFormat = fmt, emptyText = 'No data for the current filters.' }: ChartProps): JSX.Element {
  const max = Math.max(1, ...data.map((item) => item.value));
  if (!data.length) return <Typography color="text.secondary">{emptyText}</Typography>;
  return (
    <Stack spacing={0.75} role="list">
      {data.map((item, index) => {
        const content = (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
            <Typography variant="body2" sx={{ width: '38%', minWidth: 90, textAlign: 'left' }} noWrap title={item.label}>
              {item.label}
            </Typography>
            <Box sx={{ flex: 1, bgcolor: 'grey.100', borderRadius: 1, height: 14 }}>
              <Box sx={{ width: `${(100 * item.value) / max}%`, minWidth: item.value ? 3 : 0, height: '100%', borderRadius: 1, bgcolor: PALETTE[index % 2] }} />
            </Box>
            <Typography variant="body2" fontWeight={600} sx={{ width: 48, textAlign: 'right' }}>
              {valueFormat(item.value)}
            </Typography>
          </Stack>
        );
        return (
          <Box role="listitem" key={item.key}>
            {onSelect ? (
              <ButtonBase onClick={() => onSelect(item)} sx={{ width: '100%', borderRadius: 1, py: 0.25, '&:hover': { bgcolor: 'action.hover' } }} aria-label={`${item.label}: ${valueFormat(item.value)}. Show details`}>
                {content}
              </ButtonBase>
            ) : (
              content
            )}
          </Box>
        );
      })}
    </Stack>
  );
}

// Vertical columns for trends over time.
export function ColumnChart({ data, onSelect, valueFormat = fmt, emptyText = 'No data.' }: ChartProps): JSX.Element {
  const max = Math.max(1, ...data.map((item) => item.value));
  if (!data.length) return <Typography color="text.secondary">{emptyText}</Typography>;
  return (
    <Stack direction="row" alignItems="flex-end" spacing={0.75} sx={{ height: 180 }} role="list">
      {data.map((item, index) => (
        <Tooltip key={item.key} title={`${item.label}: ${valueFormat(item.value)}`}>
          <ButtonBase
            role="listitem"
            disabled={!onSelect}
            onClick={() => onSelect?.(item)}
            sx={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'stretch' }}
            aria-label={`${item.label}: ${valueFormat(item.value)}`}
          >
            <Typography variant="caption" fontWeight={600} textAlign="center">
              {valueFormat(item.value)}
            </Typography>
            <Box sx={{ height: `${(120 * item.value) / max}px`, minHeight: item.value ? 3 : 0, bgcolor: index === data.length - 1 ? engColors.red : engColors.blue, borderRadius: '4px 4px 0 0' }} />
            <Typography variant="caption" color="text.secondary" textAlign="center" noWrap sx={{ mt: 0.5 }}>
              {item.label}
            </Typography>
          </ButtonBase>
        </Tooltip>
      ))}
    </Stack>
  );
}

export function DonutChart({ data, onSelect, valueFormat = fmt, emptyText = 'No data.' }: ChartProps): JSX.Element {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (!total) return <Typography color="text.secondary">{emptyText}</Typography>;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
      <svg width={160} height={160} viewBox="0 0 160 160" role="img" aria-label={data.map((item) => `${item.label} ${item.value}`).join(', ')}>
        <g transform="rotate(-90 80 80)">
          {data.map((item, index) => {
            const length = (circumference * item.value) / total;
            const circle = (
              <circle key={item.key} cx={80} cy={80} r={radius} fill="none" stroke={PALETTE[index % PALETTE.length]} strokeWidth={24} strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} />
            );
            offset += length;
            return circle;
          })}
        </g>
        <text x={80} y={86} textAnchor="middle" fontSize={22} fontWeight={700}>
          {valueFormat(total)}
        </text>
      </svg>
      <Stack spacing={0.5}>
        {data.map((item, index) => (
          <ButtonBase key={item.key} disabled={!onSelect} onClick={() => onSelect?.(item)} sx={{ justifyContent: 'flex-start', borderRadius: 1, px: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: PALETTE[index % PALETTE.length], mr: 1 }} />
            <Typography variant="body2">
              {item.label}: <strong>{valueFormat(item.value)}</strong> ({Math.round((100 * item.value) / total)}%)
            </Typography>
          </ButtonBase>
        ))}
      </Stack>
    </Stack>
  );
}

export function KpiCard({ label, value, caption, onClick }: { label: string; value: string | number; caption?: string; onClick?: () => void }): JSX.Element {
  const body = (
    <CardContent sx={{ width: '100%' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" fontWeight={700} sx={{ my: 0.5 }}>
        {value}
      </Typography>
      {caption ? (
        <Typography variant="caption" color="text.secondary">
          {caption}
        </Typography>
      ) : null}
    </CardContent>
  );
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      {onClick ? (
        <ButtonBase onClick={onClick} sx={{ width: '100%', height: '100%', textAlign: 'left', alignItems: 'flex-start' }}>
          {body}
        </ButtonBase>
      ) : (
        body
      )}
    </Card>
  );
}

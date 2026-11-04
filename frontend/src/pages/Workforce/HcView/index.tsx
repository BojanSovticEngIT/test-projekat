import { Fragment, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { WorkforcePageHeader } from '../../../components';
import { useExportHcView, useHcDefaultCountries, useHcView } from '@features/workforce/hcViewApi';
import { useToast } from '../../../lib/ToastProvider';
import type { HcCount, HcTotals } from '../../../types/hcView.types';

const COLORS = {
  navy: '#002F53',
  headTop: '#E5E7EB',
  headSub: '#F3F4F6',
  label: '#F9FAFB',
  country: '#C51B88',
  subtotal: '#FBE6EE',
  subtotalText: '#8C0034',
  summaryCell: '#EAF0F5',
  border: '#E5E7EB',
  headerDivider: 'rgba(255,255,255,0.45)',
  rowBorder: '#F0F1F3',
  muted: '#C4C8D0',
  text: '#111827',
  textSecondary: '#4B5563'
};

const COUNT_COLUMNS: { key: keyof HcCount; label: string }[] = [
  { key: 'internal', label: 'Internal' },
  { key: 'b2b', label: 'B2B' },
  { key: 'supplier', label: 'Suppliers' }
];

const HEADER_ROW_HEIGHT = 34;
const L1_WIDTH = 200;
const L2_WIDTH = 270;

const EMPTY_COUNT: HcCount = { internal: 0, b2b: 0, supplier: 0 };

const cellSx = {
  textAlign: 'right',
  py: 0.75,
  px: 1.5,
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
  color: COLORS.text,
  borderBottom: `1px solid ${COLORS.rowBorder}`
} satisfies SxProps<Theme>;
const headerCellSx = {
  ...cellSx,
  textAlign: 'center',
  fontWeight: 600,
  color: COLORS.textSecondary,
  bgcolor: COLORS.headTop,
  borderBottom: `1px solid ${COLORS.border}`
} satisfies SxProps<Theme>;

// The table head override forces white text; grey header cells need higher specificity to stay dark.
const greyHeadSx = { '&&&': { color: COLORS.textSecondary } } satisfies SxProps<Theme>;

// Sticky first two columns keep the org structure visible while scrolling across countries.
const stickyL1Sx = {
  position: 'sticky',
  left: 0,
  zIndex: 3,
  minWidth: L1_WIDTH,
  maxWidth: L1_WIDTH
} satisfies SxProps<Theme>;
const stickyL2Sx = {
  position: 'sticky',
  left: L1_WIDTH,
  zIndex: 3,
  minWidth: L2_WIDTH,
  borderRight: `1px solid ${COLORS.border}`
} satisfies SxProps<Theme>;

const formatCount = (value: number): string => (value === 0 ? '–' : String(value));

type RowVariant = 'row' | 'subtotal' | 'grand';

interface CountCellsProps {
  countries: string[];
  totals: HcTotals;
  variant?: RowVariant;
}

function CountCells({ countries, totals, variant = 'row' }: CountCellsProps): JSX.Element {
  const isGrand = variant === 'grand';
  const bg = isGrand ? COLORS.navy : variant === 'subtotal' ? COLORS.subtotal : '#fff';
  const sx = {
    ...cellSx,
    bgcolor: bg,
    color: isGrand ? '#fff' : variant === 'subtotal' ? COLORS.subtotalText : COLORS.text,
    fontWeight: variant === 'row' ? 400 : 600,
    borderBottom: isGrand ? 'none' : `1px solid ${COLORS.rowBorder}`
  } satisfies SxProps<Theme>;
  const dividerSx = {
    ...sx,
    borderLeft: `1px solid ${isGrand ? 'rgba(255,255,255,0.25)' : COLORS.border}`
  } satisfies SxProps<Theme>;
  const summarySx = {
    ...sx,
    bgcolor: isGrand ? COLORS.navy : variant === 'subtotal' ? COLORS.subtotal : COLORS.summaryCell,
    fontWeight: 600
  } satisfies SxProps<Theme>;

  const renderValue = (value: number): JSX.Element | string =>
    value === 0 && variant === 'row' ? <span style={{ color: COLORS.muted }}>–</span> : formatCount(value);

  return (
    <>
      {countries.map((country) =>
        COUNT_COLUMNS.map((column, index) => (
          <TableCell key={`${country}-${column.key}`} sx={index === 0 ? dividerSx : sx}>
            {renderValue((totals.byCountry[country] ?? EMPTY_COUNT)[column.key])}
          </TableCell>
        ))
      )}
      <TableCell sx={{ ...summarySx, borderLeft: `2px solid ${isGrand ? 'rgba(255,255,255,0.4)' : COLORS.navy}` }}>
        {totals.internal}
      </TableCell>
      <TableCell sx={summarySx}>{totals.external}</TableCell>
      <TableCell sx={{ ...summarySx, fontWeight: 700 }}>{totals.total}</TableCell>
    </>
  );
}

function WorkforceHcViewPage(): JSX.Element {
  // Until the user changes the selection, the backend default countries are used.
  const [picked, setPicked] = useState<string[] | undefined>(undefined);
  const { data, isLoading, error } = useHcView(picked);
  const { data: defaultCountries = [] } = useHcDefaultCountries();
  const exportHc = useExportHcView();
  const { showToast } = useToast();

  const selected = picked ?? defaultCountries;
  const countryOptions = useMemo(
    () => [...new Set([...(data?.availableCountries ?? []), ...selected])].sort((a, b) => a.localeCompare(b)),
    [data?.availableCountries, selected]
  );

  const handleExport = (): void =>
    exportHc.mutate(picked, { onError: () => showToast('The export failed.', 'error') });

  const renderBody = (): JSX.Element => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    if (error || !data) {
      return <Alert severity="error">Unable to load headcount view.</Alert>;
    }
    if (data.groups.length === 0) {
      return <Typography color="text.secondary">No headcount data available.</Typography>;
    }

    const { countries, groups, grandTotal } = data;

    return (
      <TableContainer sx={{ maxHeight: '70vh', border: `1px solid ${COLORS.border}`, borderRadius: 2 }}>
        <Table size="small" stickyHeader sx={{ borderCollapse: 'separate' }}>
          <TableHead
            sx={{
              '& .MuiTableCell-head': {
                color: '#fff',
                padding: '4px 12px',
                letterSpacing: '0.04em',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                height: HEADER_ROW_HEIGHT
              }
            }}
          >
            <TableRow>
              <TableCell
                colSpan={2}
                sx={{ ...headerCellSx, ...greyHeadSx, ...stickyL1Sx, zIndex: 5, textAlign: 'left', borderRight: `1px solid ${COLORS.border}` }}
              >
                Corporate structure
              </TableCell>
              {countries.map((country) => (
                <TableCell
                  key={country}
                  colSpan={COUNT_COLUMNS.length}
                  sx={{
                    ...headerCellSx,
                    bgcolor: COLORS.country,
                    color: '#fff',
                    borderLeft: `1px solid ${COLORS.headerDivider}`,
                    borderBottom: `1px solid ${COLORS.headerDivider}`
                  }}
                >
                  {country}
                </TableCell>
              ))}
              <TableCell
                colSpan={3}
                sx={{
                  ...headerCellSx,
                  bgcolor: COLORS.navy,
                  color: '#fff',
                  borderLeft: `2px solid ${COLORS.navy}`,
                  borderBottom: `1px solid ${COLORS.headerDivider}`
                }}
              >
                Summary
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell
                sx={{
                  ...headerCellSx,
                  ...greyHeadSx,
                  ...stickyL1Sx,
                  zIndex: 5,
                  top: HEADER_ROW_HEIGHT,
                  bgcolor: COLORS.headSub,
                  textAlign: 'left'
                }}
              >
                L1
              </TableCell>
              <TableCell
                sx={{
                  ...headerCellSx,
                  ...greyHeadSx,
                  ...stickyL2Sx,
                  zIndex: 5,
                  top: HEADER_ROW_HEIGHT,
                  bgcolor: COLORS.headSub,
                  textAlign: 'left'
                }}
              >
                L2
              </TableCell>
              {countries.map((country) =>
                COUNT_COLUMNS.map((column, index) => (
                  <TableCell
                    key={`${country}-${column.key}`}
                    sx={{
                      ...headerCellSx,
                      top: HEADER_ROW_HEIGHT,
                      bgcolor: COLORS.country,
                      color: '#fff',
                      fontWeight: 600,
                      borderLeft: index === 0 ? `1px solid ${COLORS.headerDivider}` : undefined
                    }}
                  >
                    {column.label}
                  </TableCell>
                ))
              )}
              {['Internal', 'External', 'Total'].map((label, index) => (
                <TableCell
                  key={label}
                  sx={{
                    ...headerCellSx,
                    top: HEADER_ROW_HEIGHT,
                    bgcolor: COLORS.navy,
                    color: '#fff',
                    borderLeft: index === 0 ? `2px solid ${COLORS.navy}` : undefined
                  }}
                >
                  {label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map((group) => (
              <Fragment key={group.n1}>
                {group.rows.map((row, index) => (
                  <TableRow key={`${group.n1}-${row.n2}`}>
                    {index === 0 ? (
                      <TableCell
                        rowSpan={group.rows.length + 1}
                        sx={{
                          ...stickyL1Sx,
                          zIndex: 2,
                          bgcolor: COLORS.label,
                          color: COLORS.navy,
                          fontWeight: 600,
                          verticalAlign: 'top',
                          py: 1,
                          borderBottom: `1px solid ${COLORS.border}`
                        }}
                      >
                        {group.n1}
                      </TableCell>
                    ) : null}
                    <TableCell
                      sx={{
                        ...stickyL2Sx,
                        zIndex: 2,
                        py: 0.75,
                        whiteSpace: 'nowrap',
                        bgcolor: '#fff',
                        color: COLORS.text,
                        borderBottom: `1px solid ${COLORS.rowBorder}`
                      }}
                    >
                      {row.n2}
                    </TableCell>
                    <CountCells countries={countries} totals={row.total} />
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell
                    sx={{
                      ...stickyL2Sx,
                      zIndex: 2,
                      bgcolor: COLORS.subtotal,
                      color: COLORS.subtotalText,
                      fontWeight: 600,
                      py: 0.75,
                      borderBottom: `1px solid ${COLORS.border}`
                    }}
                  >
                    Total {group.n1}
                  </TableCell>
                  <CountCells countries={countries} totals={group.total} variant="subtotal" />
                </TableRow>
              </Fragment>
            ))}
            <TableRow>
              <TableCell
                colSpan={2}
                sx={{ ...stickyL1Sx, bgcolor: COLORS.navy, color: '#fff', fontWeight: 600, py: 1 }}
              >
                Total headcount
              </TableCell>
              <CountCells countries={countries} totals={grandTotal} variant="grand" />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box>
      <WorkforcePageHeader
        title="Headcount View"
        description="Active headcount by organisational unit, country (employee location) and workforce type."
        actions={
          <Button variant="outlined" onClick={handleExport} disabled={exportHc.isPending}>
            Export Excel
          </Button>
        }
      />
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Autocomplete
              multiple
              size="small"
              sx={{ minWidth: 360, flexGrow: 1, maxWidth: 720 }}
              options={countryOptions}
              value={selected}
              onChange={(_, value) => setPicked(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Countries"
                  helperText="Employees in other countries are counted under Other countries."
                />
              )}
            />
            <Button variant="text" onClick={() => setPicked(undefined)} disabled={picked === undefined}>
              Reset to default
            </Button>
          </Stack>
          {renderBody()}
        </CardContent>
      </Card>
    </Box>
  );
}

export default WorkforceHcViewPage;

import { useMemo, useState } from 'react';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { useAuditLogs } from '@features/audit/auditApi';
import type { AuditActionEnum, AuditLogEntry } from '../../types/audit.types';

const AUDIT_ACTIONS: AuditActionEnum[] = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'SUBMIT',
  'APPROVE',
  'REJECT',
  'REQUEST_CLARIFICATION',
  'IMPORT',
  'EXPORT',
  'LOGIN'
];

const ACTION_COLOR_MAP: Record<AuditActionEnum, 'success' | 'info' | 'error' | 'warning' | 'default'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
  SUBMIT: 'info',
  APPROVE: 'success',
  REJECT: 'error',
  REQUEST_CLARIFICATION: 'warning',
  IMPORT: 'info',
  EXPORT: 'default',
  LOGIN: 'default'
};

const formatDate = (value: string): string => new Date(value).toLocaleString();

const formatLabel = (value: string): string =>
  value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const JsonDiff = ({ label, json }: { label: string; json: string | null }): JSX.Element | null => {
  if (!json) {
    return null;
  }
  let formatted = json;
  try {
    formatted = JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    // keep raw
  }
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
      <Box
        component="pre"
        sx={{
          bgcolor: 'action.hover',
          borderRadius: 1,
          p: 1,
          fontSize: '0.75rem',
          overflowX: 'auto',
          maxHeight: 200,
          mt: 0.5
        }}
      >
        {formatted}
      </Box>
    </Box>
  );
};

const AuditLogRow = ({ row }: { row: AuditLogEntry }): JSX.Element => {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Boolean(row.oldValueJson ?? row.newValueJson ?? row.comment);

  return (
    <>
      <TableRow
        hover
        sx={{ cursor: hasDetails ? 'pointer' : 'default' }}
        onClick={() => hasDetails && setExpanded((prev) => !prev)}
      >
        <TableCell padding="checkbox">
          {hasDetails && (
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setExpanded((prev) => !prev); }}>
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          )}
        </TableCell>
        <TableCell>{row.entityName}</TableCell>
        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {row.entityId.slice(0, 8)}…
        </TableCell>
        <TableCell>
          <Chip
            label={formatLabel(row.action)}
            color={ACTION_COLOR_MAP[row.action] ?? 'default'}
            size="small"
          />
        </TableCell>
        <TableCell>{row.changedByEmail}</TableCell>
        <TableCell>{formatDate(row.createdAt)}</TableCell>
      </TableRow>
      {hasDetails && (
        <TableRow>
          <TableCell colSpan={6} sx={{ py: 0, borderBottom: expanded ? undefined : 'none' }}>
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2 }}>
                <Box flex={1}>
                  <JsonDiff label="Old Value" json={row.oldValueJson} />
                </Box>
                <Box flex={1}>
                  <JsonDiff label="New Value" json={row.newValueJson} />
                </Box>
                {row.comment && (
                  <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Comment
                    </Typography>
                    <Typography variant="body2">{row.comment}</Typography>
                  </Box>
                )}
              </Stack>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

const AuditLogPage = (): JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();

  const entityName = searchParams.get('entityName') ?? '';
  const action = (searchParams.get('action') ?? '') as AuditActionEnum | '';
  const changedByEmail = searchParams.get('changedByEmail') ?? '';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';
  const page = Number(searchParams.get('page') ?? '0') || 0;
  const size = Number(searchParams.get('size') ?? '20') || 20;

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });
    if (!('page' in updates)) {
      next.set('page', '0');
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next);
    }
  };

  const filters = useMemo(
    () => ({
      entityName: entityName || undefined,
      action: (action || undefined) as AuditActionEnum | undefined,
      changedByEmail: changedByEmail || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      size
    }),
    [action, changedByEmail, dateFrom, dateTo, entityName, page, size]
  );

  const { data, isLoading, error } = useAuditLogs(filters);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700}>
          Audit Log
        </Typography>
        <Typography color="text.secondary">Review system-wide activity and changes.</Typography>
      </Box>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
          <TextField
            label="Entity"
            size="small"
            value={entityName}
            placeholder="e.g. EmployeeSkill"
            onChange={(e) => updateParams({ entityName: e.target.value || null })}
            sx={{ minWidth: 160 }}
          />
          <TextField
            select
            label="Action"
            size="small"
            value={action}
            onChange={(e) => updateParams({ action: e.target.value || null })}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All</MenuItem>
            {AUDIT_ACTIONS.map((a) => (
              <MenuItem key={a} value={a}>
                {formatLabel(a)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Changed By Email"
            size="small"
            value={changedByEmail}
            onChange={(e) => updateParams({ changedByEmail: e.target.value || null })}
            sx={{ minWidth: 200 }}
          />
          <TextField
            label="Date From"
            type="date"
            size="small"
            value={dateFrom}
            onChange={(e) => updateParams({ dateFrom: e.target.value || null })}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          <TextField
            label="Date To"
            type="date"
            size="small"
            value={dateTo}
            onChange={(e) => updateParams({ dateTo: e.target.value || null })}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
        </Stack>
      </Paper>

      {/* ── Table ───────────────────────────────────────────────── */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {error ? (
            <Alert severity="error" sx={{ m: 2 }}>
              Failed to load audit log.
            </Alert>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" />
                      <TableCell>Entity</TableCell>
                      <TableCell>Entity ID</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Changed By</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isLoading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 6 }).map((__, j) => (
                              <TableCell key={j}>
                                <Box
                                  sx={{
                                    height: 16,
                                    bgcolor: 'action.hover',
                                    borderRadius: 1,
                                    width: j === 0 ? 24 : '80%'
                                  }}
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      : (data?.content ?? []).map((row) => (
                          <AuditLogRow key={row.id} row={row} />
                        ))}
                    {!isLoading && (data?.content ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography color="text.secondary" variant="body2" sx={{ py: 4 }}>
                            No audit log entries found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={data?.totalElements ?? 0}
                page={page}
                rowsPerPage={size}
                rowsPerPageOptions={[10, 20, 50]}
                onPageChange={(_, p) => updateParams({ page: String(p) })}
                onRowsPerPageChange={(e) =>
                  updateParams({ size: e.target.value, page: '0' })
                }
              />
            </>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
};

export default AuditLogPage;

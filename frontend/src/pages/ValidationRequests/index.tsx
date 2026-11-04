import { useEffect, useMemo, useState } from 'react';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import { Box, Chip, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ColumnSelector, DataTable, SkillLevelBadge, StatusChip, useColumnVisibility } from '../../components';
import type { DataTableColumn } from '../../components';
import { useSkillCategories } from '@features/skill/skillApi';
import { useValidationSkillReviews } from '@features/validation/validationApi';
import { ValidationRequestStatus, ValidationRequestType } from '../../types/enums';
import type { ValidationSkillReview } from '../../types/validation.types';

const REQUIRED_COLUMNS = ['employeeName', 'skillName'];

// Revoked (cancelled) requests are never listed, so they are not a filter option.
const STATUS_OPTIONS = [ValidationRequestStatus.SUBMITTED, ValidationRequestStatus.APPROVED, ValidationRequestStatus.REJECTED];

const formatDate = (value?: string): string => (value ? new Date(value).toLocaleDateString() : '—');

const columns: DataTableColumn<ValidationSkillReview>[] = [
  { key: 'employeeName', label: 'Employee' },
  {
    key: 'skillName',
    label: 'Skill',
    render: (row) => (
      <Stack direction="row" spacing={1} alignItems="center">
        <span>{row.skillName}</span>
        {row.requestType === ValidationRequestType.DELETION ? <Chip size="small" color="warning" label="Deletion" /> : null}
      </Stack>
    )
  },
  { key: 'categoryName', label: 'Category' },
  {
    key: 'selfAssessedLevel',
    label: 'Self-assessed',
    render: (row) => <SkillLevelBadge level={row.selfAssessedLevel} />
  },
  {
    key: 'lastValidatedAt',
    label: 'Last validated',
    render: (row) => formatDate(row.lastValidatedAt)
  },
  {
    key: 'submittedAt',
    label: 'Submitted',
    render: (row) => formatDate(row.submittedAt)
  },
  { key: 'historyCount', label: 'History of changes' },
  {
    key: 'certificateCount',
    label: 'Certificates',
    render: (row) =>
      row.certificateCount > 0 ? (
        <Chip size="small" variant="outlined" icon={<WorkspacePremiumOutlinedIcon />} label={row.certificateCount} />
      ) : (
        '—'
      )
  },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <StatusChip status={row.status} />
  }
];

const ValidationRequestsPage = (): JSX.Element => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { visibleColumns, selectorProps } = useColumnVisibility('validation-requests', columns, REQUIRED_COLUMNS);

  const search = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? '';
  const status = (searchParams.get('status') ?? '') as ValidationRequestStatus | '';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';
  const page = Number(searchParams.get('page') ?? '0') || 0;
  const size = Number(searchParams.get('size') ?? '20') || 20;

  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed === search) {
        return;
      }

      const next = new URLSearchParams(searchParams);
      if (trimmed) {
        next.set('search', trimmed);
      } else {
        next.delete('search');
      }
      next.set('page', '0');
      setSearchParams(next);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [search, searchInput, searchParams, setSearchParams]);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      category: category || undefined,
      status: status || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      size
    }),
    [category, dateFrom, dateTo, search, page, size, status]
  );

  const { data: categories = [] } = useSkillCategories();
  const { data, isLoading, error } = useValidationSkillReviews(filters);

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });
    next.set('page', updates.page ?? '0');
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Validation Requests</Typography>
        <Typography color="text.secondary">
          Latest validation outcome per employee skill. Open a row to review its request.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            fullWidth
            label="Search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by employee or skill name"
          />
          <TextField
            select
            fullWidth
            label="Category"
            value={category}
            onChange={(event) => updateParams({ category: event.target.value || null, page: '0' })}
          >
            <MenuItem value="">All categories</MenuItem>
            {categories.map((option) => (
              <MenuItem key={option.id} value={option.name}>
                {option.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            fullWidth
            label="Status"
            value={status}
            onChange={(event) => updateParams({ status: event.target.value || null, page: '0' })}
          >
            <MenuItem value="">All statuses</MenuItem>
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option.replace(/_/g, ' ')}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Submitted From"
            type="date"
            value={dateFrom}
            onChange={(event) => updateParams({ dateFrom: event.target.value || null, page: '0' })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Submitted To"
            type="date"
            value={dateTo}
            onChange={(event) => updateParams({ dateTo: event.target.value || null, page: '0' })}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ColumnSelector<ValidationSkillReview> {...selectorProps} />
      </Box>

      <DataTable<ValidationSkillReview>
        columns={visibleColumns}
        rows={data?.content ?? []}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        emptyMessage="No skills found."
        onRowClick={(row) => navigate(`/validation-requests/${row.requestId}`)}
        pagination={{
          page: data?.number ?? page,
          size: data?.size ?? size,
          total: data?.totalElements ?? 0,
          onPageChange: (nextPage) => updateParams({ page: String(nextPage) }),
          onSizeChange: (nextSize) => updateParams({ size: String(nextSize), page: '0' })
        }}
      />
    </Stack>
  );
};

export default ValidationRequestsPage;

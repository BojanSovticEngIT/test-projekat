import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import { Alert, Box, Button, Chip, IconButton, Menu, MenuItem, Divider, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable, StatusChip, WorkforcePageHeader } from '../../components';
import type { DataTableColumn } from '../../components';
import DeleteDemandDialog from '../../features/demand/DeleteDemandDialog';
import { formatDate, pluralize, STATUS_LABELS } from '../../features/demand/demandFormat';
import PositionsBar from '../../features/demand/PositionsBar';
import type { DemandImportResult } from '../../features/demand/demandApi';
import { useDemands, useDownloadDemandImportTemplate, useExportDemands, useImportDemands, useRestoreDemand } from '../../features/demand/demandApi';
import { useToast } from '../../lib/ToastProvider';
import useAuthStore from '@store/authStore';
import { UserRole } from '../../types/enums';
import type { DemandStatus, DemandSummary } from '../../types/demand.types';

type StatusTab = DemandStatus | 'DELETED';

const STATUS_TABS: { value: '' | StatusTab; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'ON_HOLD', label: 'On hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'DELETED', label: 'Deleted' }
];

const SOON_DAYS = 14;
const MAX_SKILL_CHIPS = 3;

const parseStatusTab = (value: string | null): '' | StatusTab =>
  STATUS_TABS.some((tab) => tab.value === value) ? ((value ?? '') as '' | StatusTab) : '';

const daysFromToday = (isoDate: string): number => {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((new Date(year, month - 1, day).getTime() - startOfToday.getTime()) / 86_400_000);
};

const isSoon = (demand: DemandSummary): boolean => {
  const days = daysFromToday(demand.wantedStartDate);
  return !demand.deleted && demand.status === 'IN_PROGRESS' && demand.filledPositions === 0 && days >= 0 && days <= SOON_DAYS;
};

const isLate = (demand: DemandSummary): boolean =>
  !demand.deleted && demand.status === 'IN_PROGRESS' && daysFromToday(demand.wantedStartDate) < 0;

const SubText = ({ children }: { children: string }): JSX.Element => (
  <Typography variant="caption" color="text.secondary" display="block">
    {children}
  </Typography>
);

function DemandsPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  // The new demand form sends the saved demand here.
  const [createdDemand, setCreatedDemand] = useState<{ id: string; code: string } | null>(
    (location.state as { created?: { id: string; code: string } } | null)?.created ?? null
  );
  const { showToast } = useToast();
  const role = useAuthStore((state) => state.user?.role);
  const isDemandManager = role === UserRole.ADMIN || role === UserRole.PMO;
  const fileInput = useRef<HTMLInputElement>(null);
  const exportDemands = useExportDemands();
  const downloadTemplate = useDownloadDemandImportTemplate();
  const importDemands = useImportDemands();
  const [importResult, setImportResult] = useState<DemandImportResult | null>(null);

  const handleImportFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    importDemands.mutate(file, {
      onSuccess: setImportResult,
      onError: () => showToast('The file could not be imported. Use the .xlsx template.', 'error')
    });
  };

  const statusTab = parseStatusTab(searchParams.get('status'));
  const page = Number(searchParams.get('page') ?? '0') || 0;
  const size = Number(searchParams.get('size') ?? '20') || 20;
  const searchValue = searchParams.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(searchValue);

  const [menu, setMenu] = useState<{ anchor: HTMLElement; demand: DemandSummary } | null>(null);
  const [demandToDelete, setDemandToDelete] = useState<DemandSummary | null>(null);
  const restoreDemand = useRestoreDemand();

  useEffect(() => {
    setSearchInput(searchValue);
  }, [searchValue]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed === searchValue) return;
      const next = new URLSearchParams(searchParams);
      if (trimmed) next.set('search', trimmed);
      else next.delete('search');
      next.set('page', '0');
      setSearchParams(next);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput, searchParams, searchValue, setSearchParams]);

  const filters = useMemo(
    () => ({
      search: searchValue || undefined,
      status: statusTab && statusTab !== 'DELETED' ? statusTab : undefined,
      deleted: statusTab === 'DELETED' && isDemandManager,
      page,
      size
    }),
    [isDemandManager, page, searchValue, size, statusTab]
  );

  const { data: demandsPage, isLoading, isError } = useDemands(filters);

  const visibleTabs = STATUS_TABS.filter((tab) => tab.value !== 'DELETED' || isDemandManager);

  const updateParams = (mutate: (params: URLSearchParams) => void): void => {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    setSearchParams(next);
  };

  const openDemand = (demand: DemandSummary, query = ''): void => navigate(`/demands/${demand.id}${query}`);

  const openMenu = (event: MouseEvent<HTMLElement>, demand: DemandSummary): void => {
    event.stopPropagation();
    setMenu({ anchor: event.currentTarget, demand });
  };

  const handleRestore = async (demand: DemandSummary): Promise<void> => {
    try {
      await restoreDemand.mutateAsync(demand.id);
      showToast(`${demand.code} restored.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to restore the demand.', 'error');
    }
  };

  const columns: DataTableColumn<DemandSummary>[] = [
    {
      key: 'code',
      label: 'Demand',
      render: (row) => (
        <>
          <Typography variant="body2" fontWeight={500} fontFamily="monospace">
            {row.code}
          </Typography>
          <SubText>{row.externalId || 'No Workforce ID'}</SubText>
        </>
      )
    },
    {
      key: 'title',
      label: 'Role',
      render: (row) => (
        <>
          <Typography variant="body2" fontWeight={500}>
            {row.title}
          </Typography>
          <SubText>{[row.clientName, row.projectName].filter(Boolean).join(' · ') || 'No client'}</SubText>
        </>
      )
    },
    {
      key: 'skills',
      label: 'Skills',
      render: (row) => (
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
          {row.skills.slice(0, MAX_SKILL_CHIPS).map((skill) => (
            <Chip
              key={skill.name}
              label={skill.name}
              size="small"
              variant="outlined"
              title={skill.mustHave ? 'Must have' : 'Nice to have'}
              sx={skill.mustHave ? { fontWeight: 700 } : undefined}
            />
          ))}
          {row.skills.length > MAX_SKILL_CHIPS ? (
            <Chip label={`+${row.skills.length - MAX_SKILL_CHIPS}`} size="small" variant="outlined" />
          ) : null}
          {row.missingSkills.length > 0 ? (
            <Chip
              label={`+${row.missingSkills.length} not in catalog`}
              size="small"
              variant="outlined"
              color="warning"
              title={`Not in the skill catalog: ${row.missingSkills.join(', ')}`}
              sx={{ borderStyle: 'dashed' }}
            />
          ) : null}
        </Stack>
      )
    },
    {
      key: 'countries',
      label: 'Countries',
      render: (row) => (row.countries?.length ? row.countries.join(', ') : 'Any')
    },
    { key: 'requestedBy', label: 'Requested by', render: (row) => row.requestedBy },
    {
      key: 'positions',
      label: 'Positions',
      render: (row) => (
        <>
          <PositionsBar demand={row} />
          <SubText>{`${row.filledPositions} filled · ${row.cancelledPositions} cancelled · ${row.requestedPositions} requested`}</SubText>
        </>
      )
    },
    { key: 'activeCandidates', label: 'Candidates', render: (row) => row.activeCandidates },
    {
      key: 'wantedStartDate',
      label: 'Start date',
      render: (row) => (
        <>
          <Typography variant="body2" noWrap>
            {formatDate(row.wantedStartDate)}
          </Typography>
          {isSoon(row) ? (
            <Chip
              label={`Starts in ${pluralize(daysFromToday(row.wantedStartDate), 'day')}`}
              size="small"
              color="warning"
              sx={{ mt: 0.5 }}
            />
          ) : null}
          {isLate(row) ? <Chip label="Start date passed" size="small" color="error" sx={{ mt: 0.5 }} /> : null}
        </>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) =>
        row.deleted ? (
          <StatusChip status="DELETED" label="Deleted" />
        ) : (
          <StatusChip status={row.status} label={STATUS_LABELS[row.status]} />
        )
    },
    {
      key: 'actions',
      label: '',
      render: (row) =>
        isDemandManager ? (
          <IconButton size="small" aria-label={`Actions for ${row.code}`} aria-haspopup="menu" onClick={(event) => openMenu(event, row)}>
            <MoreHorizIcon />
          </IconButton>
        ) : null
    }
  ];

  const closeMenu = (): void => setMenu(null);
  const menuDemand = menu?.demand;

  return (
    <Box>
      <WorkforcePageHeader
        title="Demands"
        description="Demand requests and their staffing progress."
        breadcrumbs={[{ label: 'Demands' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => exportDemands.mutate(undefined, { onError: () => showToast('The export failed.', 'error') })}>
              Export Excel
            </Button>
            {isDemandManager ? (
              <>
                <Button variant="outlined" onClick={() => fileInput.current?.click()} disabled={importDemands.isPending}>
                  Import Excel
                </Button>
                <Button variant="contained" onClick={() => navigate('/demands/new')}>
                  New demand
                </Button>
              </>
            ) : null}
          </Stack>
        }
      />
      <input ref={fileInput} type="file" accept=".xlsx" hidden onChange={handleImportFile} />

      {importResult ? (
        <Alert
          severity={importResult.errors.length > 0 ? 'error' : 'success'}
          sx={{ mb: 2 }}
          onClose={() => setImportResult(null)}
          action={
            <Button color="inherit" size="small" onClick={() => downloadTemplate.mutate()}>
              Download template
            </Button>
          }
        >
          {importResult.errors.length > 0 ? (
            <>
              Nothing was imported. Fix these rows and try again:
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {importResult.errors.slice(0, 20).map((error, index) => (
                  <li key={index}>
                    Row {error.row}: {error.message}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>Imported {pluralize(importResult.imported, 'demand')}: {importResult.codes.join(', ')}.</>
          )}
        </Alert>
      ) : null}

      {createdDemand ? (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setCreatedDemand(null)}
          action={
            <Button color="inherit" size="small" onClick={() => navigate(`/demands/${createdDemand.id}`)}>
              Open demand
            </Button>
          }
        >
          Saved {createdDemand.code}.
        </Alert>
      ) : null}

      {role === UserRole.HR_BUSINESS_PARTNER ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>HR BP / Recruiter.</strong> You can read all demands, add candidates, and add notes. Only the demand manager
          changes demands, candidate steps, outcomes, and placements.
        </Alert>
      ) : null}
      {role === UserRole.MANAGEMENT ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Management.</strong> Read-only access. You see all demands but cannot change anything.
        </Alert>
      ) : null}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" sx={{ mb: 2 }}>
        <Tabs
          value={statusTab}
          onChange={(_, value: '' | StatusTab) =>
            updateParams((params) => {
              if (value) params.set('status', value);
              else params.delete('status');
              params.set('page', '0');
            })
          }
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Filter by status"
        >
          {visibleTabs.map((tab) => (
            <Tab key={tab.label} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
        <TextField
          label="Search"
          placeholder="Search ID, role, technology, client"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          size="small"
          type="search"
          sx={{ minWidth: 300 }}
        />
      </Stack>

      <DataTable
        columns={columns}
        rows={demandsPage?.content ?? []}
        loading={isLoading}
        error={isError ? 'Unable to load demands.' : null}
        emptyMessage="No demands match. Change the filter or the search text."
        onRowClick={(row) => openDemand(row)}
        getRowSx={(row) =>
          isSoon(row)
            ? { '& td:first-of-type': { boxShadow: (theme) => `inset 3px 0 0 ${theme.palette.warning.main}` } }
            : row.deleted
              ? { opacity: 0.7 }
              : undefined
        }
        pagination={{
          page,
          size,
          total: demandsPage?.page.totalElements ?? 0,
          onPageChange: (nextPage) => updateParams((params) => params.set('page', String(nextPage))),
          onSizeChange: (nextSize) =>
            updateParams((params) => {
              params.set('size', String(nextSize));
              params.set('page', '0');
            })
        }}
      />

      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.5 }}>
        Click a row to open its candidates. Use ⋯ for the demand details, edit, or delete. A yellow edge marks an
        in-progress demand that starts within 14 days and has no placement. Bold skills are must-have skills.
      </Typography>

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={closeMenu}>
        {menuDemand ? [
          <MenuItem key="open" onClick={() => { closeMenu(); openDemand(menuDemand); }}>
            Open demand
          </MenuItem>,
          <MenuItem key="details" onClick={() => { closeMenu(); openDemand(menuDemand, '?tab=history'); }}>
            History
          </MenuItem>,
          ...(menuDemand.deleted
            ? [
                <MenuItem key="restore" onClick={() => { closeMenu(); void handleRestore(menuDemand); }}>
                  Restore demand
                </MenuItem>
              ]
            : [
                <MenuItem key="edit" onClick={() => { closeMenu(); navigate(`/demands/${menuDemand.id}/edit`); }}>
                  Edit demand
                </MenuItem>,
                <Divider key="divider" />,
                <MenuItem
                  key="delete"
                  sx={{ color: 'error.main' }}
                  onClick={() => { closeMenu(); setDemandToDelete(menuDemand); }}
                >
                  Delete demand
                </MenuItem>
              ])
        ] : null}
      </Menu>

      <DeleteDemandDialog demand={demandToDelete} onClose={() => setDemandToDelete(null)} />
    </Box>
  );
}

export default DemandsPage;

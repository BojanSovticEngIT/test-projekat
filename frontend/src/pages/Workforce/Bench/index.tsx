import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { DataTable, WorkforcePageHeader } from '../../../components';
import type { DataTableColumn } from '../../../components';
import { useExportBench } from '@features/export/exportApi';
import { useBench } from '@features/workforce/benchApi';
import type { BenchEntry } from '../../../types/workforce-availability.types';

const getTodayIso = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

function WorkforceBenchPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const [asOfDate, setAsOfDate] = useState(getTodayIso);
  const [minAvailablePct, setMinAvailablePct] = useState(100);
  const { data: benchEntries = [], isLoading } = useBench(0, true, asOfDate || undefined, minAvailablePct);
  const exportBench = useExportBench();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const page = Number(searchParams.get('page') ?? '0') || 0;
  const size = Number(searchParams.get('size') ?? '20') || 20;

  const setPaging = (nextPage: number, nextSize = size): void => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    next.set('size', String(nextSize));
    setSearchParams(next);
  };

  // The API returns the full list, so paging happens here.
  const lastPage = Math.max(0, Math.ceil(benchEntries.length / size) - 1);
  const currentPage = Math.min(page, lastPage);
  const pagedRows = benchEntries.slice(currentPage * size, (currentPage + 1) * size);

  const benchColumns = useMemo<readonly DataTableColumn<BenchEntry>[]>(() => {
    const base: DataTableColumn<BenchEntry>[] = [
      { key: 'employeeName', label: 'Name' },
      { key: 'organizationUnit', label: 'Org unit', render: (row) => row.organizationUnit ?? '—' },
      { key: 'workforceType', label: 'Type' },
      {
        key: 'capacityPct',
        label: 'Capacity',
        render: (row) => `${row.capacityPct}%`
      },
      {
        key: 'allocatedPct',
        label: 'Allocated',
        render: (row) => `${row.allocatedPct}%`
      },
      {
        key: 'availablePct',
        label: 'Available',
        render: (row) => `${row.availablePct}%`
      },
      { key: 'lastProjectName', label: 'Last / ending project', render: (row) => row.lastProjectName ?? '—' },
      { key: 'lineManagerName', label: 'Line manager', render: (row) => row.lineManagerName ?? '—' }
    ];

    base.splice(6, 0, {
      key: 'daysOnBench',
      label: 'Days on bench',
      render: (row) => String(row.daysOnBench ?? 0)
    });

    return base;
  }, []);

  return (
    <Box>
      <WorkforcePageHeader
        title="Bench/Availability"
        description="Employees with at least the selected available capacity on the selected date."
        actions={
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={exportBench.isPending}
            onClick={() => setExportDialogOpen(true)}
          >
            Download Excel
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="As of date"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={asOfDate}
          onChange={(event) => {
            setAsOfDate(event.target.value);
            if (page !== 0) setPaging(0);
          }}
        />
        <TextField
          label="Min Available %"
          type="number"
          size="small"
          inputProps={{ min: 0, max: 100, step: 5 }}
          value={minAvailablePct}
          onChange={(event) => {
            const value = Number(event.target.value);
            setMinAvailablePct(Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0)));
            if (page !== 0) setPaging(0);
          }}
        />
      </Stack>

      <Card>
        <CardContent>
          <DataTable
            columns={benchColumns}
            rows={pagedRows}
            loading={isLoading}
            emptyMessage="No employees match the date and minimum available % filters."
            pagination={{
              page: currentPage,
              size,
              total: benchEntries.length,
              onPageChange: (nextPage) => setPaging(nextPage),
              onSizeChange: (nextSize) => setPaging(0, nextSize)
            }}
          />
        </CardContent>
      </Card>

      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Download Excel</DialogTitle>
        <DialogContent>
          <DialogContentText>Do you want to download current view or all data?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setExportDialogOpen(false);
              exportBench.mutate({ asOfDate: asOfDate || undefined, minAvailablePct, page: currentPage, size });
            }}
          >
            Current view
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setExportDialogOpen(false);
              exportBench.mutate({ asOfDate: asOfDate || undefined, minAvailablePct });
            }}
          >
            All data
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default WorkforceBenchPage;

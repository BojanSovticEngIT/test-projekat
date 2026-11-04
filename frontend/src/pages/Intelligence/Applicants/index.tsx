import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Alert, Box, Grid, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { WorkforcePageHeader } from '../../../components/WorkforcePageHeader';
import { ChartCard, ColumnChart, KpiCard } from '../../../components/Charts/Charts';
import ExportMenu from '../../../components/ExportMenu/ExportMenu';
import { useApplicantTrend, useApplicants } from '@features/intelligence/intelligenceApi';
import useAuthStore from '@store/authStore';
import type { Report } from '../../../lib/export';

function ExternalApplicantsPage(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const [month, setMonth] = useState<string | null>(null);
  const trend = useApplicantTrend(12);
  const applicants = useApplicants(month);
  const data = applicants.data;

  if (trend.isError || applicants.isError) return <Alert severity="error">Recruiting data is not available for your role.</Alert>;

  const report = (): Report => {
    if (!data || !trend.data) throw new Error('No data yet.');
    return {
      title: 'External applicants',
      subtitle: 'Recruiting statistics (kept separate from internal workforce data)',
      generatedAt: new Date(),
      generatedBy: user?.username,
      criteria: [`Month: ${data.monthLabel}`, 'Counted by submission date'],
      notes: ['Only first and last names are included. Contact details, CVs and other personal data are never exported.'],
      kpis: [
        { label: `Applicants in ${data.monthLabel}`, value: String(data.total) },
        { label: 'This month', value: String(trend.data.currentMonthTotal) }
      ],
      charts: [{ title: 'Applicants per month', data: trend.data.months }],
      tables: [
        { title: 'Monthly applicant count', columns: ['Month', 'Applicants'], rows: trend.data.months.map((item) => [item.label, item.value]) },
        { title: `Applicants ${data.monthLabel}`, columns: ['First name', 'Last name'], rows: (data.applicants ?? []).map((item) => [item.firstName, item.lastName]) }
      ],
      fileName: 'external-applicants'
    };
  };

  return (
    <Box>
      <WorkforcePageHeader
        title="External applicants"
        description="People who applied through recruiting. They are not employees: they never appear in employee search, analytics or demand matching."
        breadcrumbs={[{ label: 'Workforce Intelligence', to: '/intelligence' }, { label: 'External applicants' }]}
        actions={<ExportMenu getReport={report} disabled={!data || !trend.data} />}
      />
      <Alert severity="info" icon={<LockOutlinedIcon />} sx={{ mb: 2 }}>
        Privacy: only first and last name are shown. Contact information, CVs and other personal details are not available here and are never exported.
      </Alert>
      <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
        Demo data: applicants are counted by their application date. The client system currently stores one full-name field and no application date, so in production an accurate monthly count needs an
        application date (or an equivalent submission timestamp) from the source system, and first and last name as separate fields.
      </Alert>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Stack spacing={2}>
            <KpiCard label="Applicants this month" value={trend.data?.currentMonthTotal ?? '—'} caption="Counted by submission date, not last change" />
            <TextField select size="small" label="Month" value={month ?? data?.month ?? ''} onChange={(event) => setMonth(event.target.value || null)}>
              {[...(trend.data?.months ?? [])].reverse().map((item) => (
                <MenuItem key={item.key} value={item.key}>
                  {item.label} ({item.value})
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Grid>
        <Grid item xs={12} md={9}>
          <ChartCard title="Applicants per month" subtitle="Last 12 months. Click a month to list its applicants.">
            <ColumnChart data={trend.data?.months ?? []} onSelect={(item) => setMonth(item.key)} />
          </ChartCard>
        </Grid>
        <Grid item xs={12}>
          <ChartCard title={data ? `${data.total} applicant${data.total === 1 ? '' : 's'} in ${data.monthLabel}` : 'Applicants'}>
            <TableContainer sx={{ maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>First name</TableCell>
                    <TableCell>Last name</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.applicants ?? []).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.firstName}</TableCell>
                      <TableCell>{item.lastName}</TableCell>
                    </TableRow>
                  ))}
                  {data && !data.applicants?.length ? (
                    <TableRow>
                      <TableCell colSpan={2}>
                        <Typography color="text.secondary">No applicants in this month.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}

export default ExternalApplicantsPage;

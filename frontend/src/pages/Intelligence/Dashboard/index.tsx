import { Alert, Box, Grid, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkforcePageHeader } from '../../../components/WorkforcePageHeader';
import { BarChart, ChartCard, ColumnChart, DonutChart, KpiCard } from '../../../components/Charts/Charts';
import ExportMenu from '../../../components/ExportMenu/ExportMenu';
import { useDashboard, useIntelligenceCatalog } from '@features/intelligence/intelligenceApi';
import useAuthStore from '@store/authStore';
import type { Report } from '../../../lib/export';

function IntelligenceDashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const catalog = useIntelligenceCatalog().data;
  const [businessUnitId, setBusinessUnitId] = useState<string | null>(null);
  const [tenureYears, setTenureYears] = useState(2);
  const [skillYears, setSkillYears] = useState(3);
  const { data, isError, isFetching } = useDashboard(businessUnitId, tenureYears, skillYears);
  const canDrill = Boolean(data?.scope.canSearchPeople);
  const search = (query: string): void => {
    if (canDrill) navigate(`/search?${query}`);
  };
  const buQuery = businessUnitId ? `&bu=${businessUnitId}` : '';

  if (isError) return <Alert severity="error">The dashboard is not available for your role.</Alert>;

  const buildReport = (): Report => {
    if (!data) throw new Error('No data yet.');
    return {
      title: 'Workforce dashboard',
      subtitle: data.scope.label,
      generatedAt: new Date(),
      generatedBy: user?.username,
      criteria: data.criteria,
      notes: ['Internal workforce figures only. Recruiting figures are aggregate counts of external applicants.'],
      kpis: [
        { label: 'Internal employees', value: String(data.kpis.internalEmployees) },
        { label: 'On bench', value: String(data.kpis.onBench) },
        { label: `Same project > ${data.tenureThresholdYears} y`, value: String(data.kpis.sameProjectOverThreshold) },
        { label: `Same skill > ${data.skillThresholdYears} y`, value: String(data.kpis.skillOverThreshold) },
        ...(data.kpis.applicantsThisMonth !== null ? [{ label: 'Applicants this month', value: String(data.kpis.applicantsThisMonth) }] : [])
      ],
      charts: [
        { title: 'Employees by business unit', data: data.byBusinessUnit },
        { title: 'Employees by technology (level 3+)', data: data.byTechnology },
        { title: 'Competency distribution (skill assignments)', data: data.competency },
        { title: 'Allocation status today', data: data.allocation },
        { title: 'Current project tenure', data: data.tenureDistribution },
        ...(data.applicantsTrend ? [{ title: 'External applicants per month', data: data.applicantsTrend }] : [])
      ],
      tables: data.demandOverview
        ? [{ title: 'Staffing demand matching', columns: ['Demand', 'Title', 'Evaluated', 'Eligible', 'Best score'], rows: data.demandOverview.map((row) => [row.code, row.title, row.evaluated, row.eligible, row.bestScore]) }]
        : [],
      fileName: 'workforce-dashboard'
    };
  };

  return (
    <Box>
      <WorkforcePageHeader
        title="Workforce dashboard"
        description="Key workforce figures from current data. Click a bar or a figure to see the people behind it."
        breadcrumbs={[{ label: 'Workforce Intelligence', to: '/intelligence' }, { label: 'Dashboard' }]}
        actions={<ExportMenu getReport={buildReport} disabled={!data} />}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField select size="small" label="Business unit" value={businessUnitId ?? ''} sx={{ minWidth: 220 }} onChange={(event) => setBusinessUnitId(event.target.value || null)}>
          <MenuItem value="">All business units</MenuItem>
          {catalog?.businessUnits.map((unit) => (
            <MenuItem key={unit.id} value={unit.id}>
              {unit.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField size="small" type="number" label="Project tenure threshold (years)" value={tenureYears} inputProps={{ min: 0, max: 20, step: 0.5 }} onChange={(event) => setTenureYears(Number(event.target.value) || 0)} />
        <TextField size="small" type="number" label="Skill experience threshold (years)" value={skillYears} inputProps={{ min: 0, max: 20, step: 0.5 }} onChange={(event) => setSkillYears(Number(event.target.value) || 0)} />
        {data ? (
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
            {data.scope.label} · as of {data.asOf}
            {isFetching ? ' · updating…' : ''}
          </Typography>
        ) : null}
      </Stack>

      {data ? (
        <Grid container spacing={2}>
          <Grid item xs={6} md={2}>
            <KpiCard label="Internal employees" value={data.kpis.internalEmployees} caption="Active staff in scope" onClick={canDrill ? () => search(`text=${buQuery}`) : undefined} />
          </Grid>
          <Grid item xs={6} md={2}>
            <KpiCard label="On bench" value={data.kpis.onBench} caption={`${data.kpis.partiallyAllocated} partially allocated`} onClick={canDrill ? () => search(`status=BENCH${buQuery}`) : undefined} />
          </Grid>
          <Grid item xs={6} md={2}>
            <KpiCard label={`Same project > ${data.tenureThresholdYears} y`} value={data.kpis.sameProjectOverThreshold} caption="Current project tenure" onClick={canDrill ? () => search(`tenureMin=${data.tenureThresholdYears}&sort=TENURE${buQuery}`) : undefined} />
          </Grid>
          <Grid item xs={6} md={2}>
            <KpiCard label={`Same skill > ${data.skillThresholdYears} y`} value={data.kpis.skillOverThreshold} caption="Employees, counted once" onClick={canDrill ? () => search(`skillYearsMin=${data.skillThresholdYears}&sort=EXPERIENCE${buQuery}`) : undefined} />
          </Grid>
          {data.kpis.applicantsThisMonth !== null ? (
            <Grid item xs={6} md={2}>
              <KpiCard
                label="Applicants this month"
                value={data.kpis.applicantsThisMonth}
                caption="External recruiting (separate)"
                onClick={data.scope.applicantAccess === 'LIST' ? () => navigate('/intelligence/applicants') : undefined}
              />
            </Grid>
          ) : null}
          {data.kpis.openDemands !== null ? (
            <Grid item xs={6} md={2}>
              <KpiCard label="Demands with eligible staff" value={`${data.kpis.demandsWithEligible}/${data.kpis.openDemands}`} caption="Must-haves met by someone" onClick={() => navigate('/intelligence/matching')} />
            </Grid>
          ) : null}

          <Grid item xs={12} md={6}>
            <ChartCard title="Employees by business unit" subtitle="Whole scope; the unit filter does not apply here">
              <BarChart data={data.byBusinessUnit} onSelect={canDrill ? (item) => search(`bu=${item.key}`) : undefined} />
            </ChartCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <ChartCard title="Employees by technology" subtitle="People with the skill at level 3 (Experienced) or higher, top 10">
              <BarChart data={data.byTechnology} onSelect={canDrill ? (item) => search(`skill=${item.key}&level=3${buQuery}`) : undefined} />
            </ChartCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <ChartCard title="Allocation status today">
              <DonutChart data={data.allocation} onSelect={canDrill ? (item) => search(`status=${item.key}${buQuery}`) : undefined} />
            </ChartCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <ChartCard title="Competency distribution" subtitle="Skill assignments by level (1 Beginner – 5 Master)">
              <BarChart data={data.competency} />
            </ChartCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <ChartCard title="Current project tenure" subtitle="Continuous time on the current main project">
              <BarChart data={data.tenureDistribution} onSelect={() => navigate('/intelligence/analytics?tab=tenure')} />
            </ChartCard>
          </Grid>
          {data.applicantsTrend ? (
            <Grid item xs={12} md={6}>
              <ChartCard title="External applicants per month" subtitle="By submission date. Recruiting data, kept separate from the workforce.">
                <ColumnChart data={data.applicantsTrend} />
              </ChartCard>
            </Grid>
          ) : null}
          {data.demandOverview ? (
            <Grid item xs={12} md={data.applicantsTrend ? 6 : 12}>
              <ChartCard title="Staffing demand matching" subtitle="Eligible = meets every must-have criterion">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Demand</TableCell>
                      <TableCell align="right">Evaluated</TableCell>
                      <TableCell align="right">Eligible</TableCell>
                      <TableCell align="right">Best score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.demandOverview.map((row) => (
                      <TableRow key={row.demandId} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/intelligence/matching?demand=${row.demandId}`)}>
                        <TableCell>
                          {row.code} · {row.title}
                        </TableCell>
                        <TableCell align="right">{row.evaluated}</TableCell>
                        <TableCell align="right">{row.eligible}</TableCell>
                        <TableCell align="right">{row.bestScore ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ChartCard>
            </Grid>
          ) : null}
        </Grid>
      ) : null}
    </Box>
  );
}

export default IntelligenceDashboardPage;

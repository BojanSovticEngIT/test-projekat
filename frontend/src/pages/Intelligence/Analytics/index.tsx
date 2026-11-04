import { Alert, Box, Chip, Grid, MenuItem, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WorkforcePageHeader } from '../../../components/WorkforcePageHeader';
import { BarChart, ChartCard, KpiCard } from '../../../components/Charts/Charts';
import ExportMenu from '../../../components/ExportMenu/ExportMenu';
import { useIntelligenceCatalog, useSkillAnalytics, useTenureAnalytics } from '@features/intelligence/intelligenceApi';
import { LEVEL_LABELS, yearsText } from '@features/intelligence/intelligenceModel';
import useAuthStore from '@store/authStore';
import type { Report } from '../../../lib/export';
import type { IntelligenceCatalog } from '../../../types/intelligence.types';

const QUALITY_LABEL = { RECORDED: 'Recorded', ESTIMATED: 'Estimated', UNAVAILABLE: 'Unavailable' } as const;

function ThresholdField({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }): JSX.Element {
  return (
    <TextField
      size="small"
      type="number"
      label={label}
      value={value}
      inputProps={{ min: 0, max: 20, step: 0.5 }}
      sx={{ width: 220 }}
      onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
    />
  );
}

function OptionSelect({ label, value, onChange, options }: { label: string; value: string | null; onChange: (value: string | null) => void; options: { id: string; name: string }[] }): JSX.Element {
  return (
    <TextField select size="small" label={label} value={value ?? ''} sx={{ minWidth: 200 }} onChange={(event) => onChange(event.target.value || null)}>
      <MenuItem value="">All</MenuItem>
      {options.map((option) => (
        <MenuItem key={option.id} value={option.id}>
          {option.name}
        </MenuItem>
      ))}
    </TextField>
  );
}

function TenureTab({ catalog }: { catalog: IntelligenceCatalog }): JSX.Element {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [thresholdYears, setThreshold] = useState(2);
  const [businessUnitId, setBusinessUnit] = useState<string | null>(null);
  const [projectId, setProject] = useState<string | null>(null);
  const [skillId, setSkill] = useState<string | null>(null);
  const { data, isError } = useTenureAnalytics({ thresholdYears, businessUnitId, projectId, skillId });
  if (isError) return <Alert severity="error">Analytics are not available for your role.</Alert>;

  const report = (): Report => {
    if (!data) throw new Error('No data yet.');
    return {
      title: 'Project tenure analytics',
      subtitle: 'Continuous time on the current main project, from assignment start dates',
      generatedAt: new Date(),
      generatedBy: user?.username,
      criteria: data.criteria,
      kpis: [
        { label: `More than ${data.thresholdYears} years on current project`, value: String(data.aboveThreshold) },
        { label: 'With a current project', value: `${data.withCurrentProject} of ${data.employeesInScope}` }
      ],
      charts: [{ title: 'Current project tenure distribution', data: data.distribution }],
      tables: [
        { title: 'By project', columns: ['Project', 'Client', 'Current members', `> ${data.thresholdYears} years`, 'Average years', 'Longest years'], rows: data.projects.map((row) => [row.project, row.client, row.currentMembers, row.aboveThreshold, row.avgTenureYears, row.maxTenureYears]) },
        ...(data.individualsVisible
          ? [{ title: 'By employee', columns: ['Name', 'Business unit', 'Team', 'Current project', 'Since', 'Current project (years)', 'Total project experience (years)', 'Projects'], rows: data.employees.map((row) => [row.name, row.businessUnit, row.team, row.project, row.since, row.currentTenureYears, row.totalProjectYears, row.projectCount]) }]
          : [])
      ],
      fileName: 'project-tenure'
    };
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        <ThresholdField label="More than (years) on current project" value={thresholdYears} onChange={setThreshold} />
        <OptionSelect label="Business unit" value={businessUnitId} onChange={setBusinessUnit} options={catalog.businessUnits} />
        <OptionSelect label="Current project" value={projectId} onChange={setProject} options={catalog.projects} />
        <OptionSelect label="Technology" value={skillId} onChange={setSkill} options={catalog.skills} />
        <Box sx={{ flex: 1 }} />
        <ExportMenu getReport={report} disabled={!data} />
      </Stack>
      <Alert severity="info">
        Tenure = days since the start of the continuous assignment on a current project (the longest-running active assignment counts, so people on several projects are included; back-to-back allocations on the same project are joined). Figures count active employees; contractors are excluded. Total project experience is shown separately and counts overlapping assignments once.
      </Alert>
      {data ? (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <KpiCard
              label={`Employees > ${data.thresholdYears} years on current project`}
              value={data.aboveThreshold}
              caption={`${data.employeesInScope ? Math.round((1000 * data.aboveThreshold) / data.employeesInScope) / 10 : 0}% of ${data.employeesInScope} employees · ${data.withCurrentProject} have a current project`}
              onClick={catalog.scope.canSearchPeople ? () => navigate(`/search?workforce=EMPLOYEE&tenureMin=${data.thresholdYears}&sort=TENURE${businessUnitId ? `&bu=${businessUnitId}` : ''}`) : undefined}
            />
          </Grid>
          <Grid item xs={12} sm={8}>
            <ChartCard title="Distribution of current project tenure">
              <BarChart data={data.distribution} />
            </ChartCard>
          </Grid>
          <Grid item xs={12}>
            <ChartCard title="By project" subtitle="Current members only">
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Project</TableCell>
                      <TableCell align="right">Current members</TableCell>
                      <TableCell align="right">&gt; {data.thresholdYears} years</TableCell>
                      <TableCell align="right">Average (years)</TableCell>
                      <TableCell align="right">Longest (years)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.projects.map((row) => (
                      <TableRow key={row.projectId} hover sx={{ cursor: catalog.scope.canSearchPeople ? 'pointer' : 'default' }} onClick={() => catalog.scope.canSearchPeople && navigate(`/search?project=${row.projectId}&sort=TENURE`)}>
                        <TableCell>
                          {row.project}
                          {row.client ? <Typography component="span" variant="body2" color="text.secondary">{` · ${row.client}`}</Typography> : null}
                        </TableCell>
                        <TableCell align="right">{row.currentMembers}</TableCell>
                        <TableCell align="right">{row.aboveThreshold}</TableCell>
                        <TableCell align="right">{row.avgTenureYears}</TableCell>
                        <TableCell align="right">{row.maxTenureYears}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12}>
            <ChartCard title="By employee" subtitle={data.individualsVisible ? 'Current project tenure vs. total project experience' : undefined}>
              {data.individualsVisible ? (
                <TableContainer sx={{ maxHeight: 420 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Business unit / team</TableCell>
                        <TableCell>Current project</TableCell>
                        <TableCell>Since</TableCell>
                        <TableCell align="right">Current project (y)</TableCell>
                        <TableCell align="right">All projects (y)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.employees.map((row) => (
                        <TableRow key={row.id} hover selected={row.aboveThreshold} sx={{ cursor: 'pointer' }} onClick={() => navigate(`/search?text=${encodeURIComponent(row.name)}`)}>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{[row.businessUnit, row.team].filter(Boolean).join(' / ')}</TableCell>
                          <TableCell>{row.project ?? '—'}</TableCell>
                          <TableCell>{row.since ?? '—'}</TableCell>
                          <TableCell align="right">{row.currentTenureYears ?? '—'}</TableCell>
                          <TableCell align="right">
                            {row.totalProjectYears} ({row.projectCount})
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">Your role sees totals only, not individual employees.</Typography>
              )}
            </ChartCard>
          </Grid>
        </Grid>
      ) : null}
    </Stack>
  );
}

function SkillTab({ catalog }: { catalog: IntelligenceCatalog }): JSX.Element {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [thresholdYears, setThreshold] = useState(3);
  const [businessUnitId, setBusinessUnit] = useState<string | null>(null);
  const [skillId, setSkill] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const { data, isError } = useSkillAnalytics({ thresholdYears, businessUnitId, skillId, category });
  if (isError) return <Alert severity="error">Analytics are not available for your role.</Alert>;

  const report = (): Report => {
    if (!data) throw new Error('No data yet.');
    return {
      title: 'Skill experience analytics',
      subtitle: 'Experience measured from recorded skill start dates; estimated from project history when not recorded',
      generatedAt: new Date(),
      generatedBy: user?.username,
      criteria: data.criteria,
      notes: [`${data.estimatedAssignments} skill assignments are estimated and ${data.unavailableAssignments} have no start date (excluded from threshold counts).`],
      kpis: [
        { label: `Employees with a skill > ${data.thresholdYears} years`, value: String(data.employeesAboveThreshold) },
        { label: 'Skill assignments above threshold', value: String(data.assignmentsAboveThreshold) }
      ],
      charts: [
        { title: 'Skill experience distribution', data: data.distribution },
        { title: 'Competency distribution', data: data.competency }
      ],
      tables: [
        { title: 'By skill', columns: ['Skill', 'Area', 'People with skill', `> ${data.thresholdYears} years`, 'Average years', 'Estimated', 'Unavailable'], rows: data.skills.map((row) => [row.skill, row.category, row.holders, row.aboveThreshold, row.avgYears, row.estimated, row.unavailable]) },
        ...(data.individualsVisible
          ? [{ title: 'By employee and skill', columns: ['Name', 'Business unit', 'Skill', 'Years', 'Date quality', 'Level', 'Approved'], rows: data.rows.map((row) => [row.name, row.businessUnit, row.skill, row.years, QUALITY_LABEL[row.quality], row.level, row.evidence === 'VALIDATED' ? 'Yes' : 'No']) }]
          : [])
      ],
      fileName: 'skill-experience'
    };
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        <ThresholdField label="Same skill for more than (years)" value={thresholdYears} onChange={setThreshold} />
        <OptionSelect label="Business unit" value={businessUnitId} onChange={setBusinessUnit} options={catalog.businessUnits} />
        <OptionSelect label="Skill" value={skillId} onChange={setSkill} options={catalog.skills} />
        <OptionSelect label="Technology area" value={category} onChange={setCategory} options={catalog.categories.map((item) => ({ id: item, name: item }))} />
        <Box sx={{ flex: 1 }} />
        <ExportMenu getReport={report} disabled={!data} />
      </Stack>
      <Alert severity="info">
        Experience uses the recorded "using since" date of each skill, not the date it was added to the profile. When no date is recorded it is estimated from the first project that used the skill (marked "~").
        Skills with neither are shown as unavailable and are not counted against the threshold.
      </Alert>
      {data ? (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Stack spacing={2}>
              <KpiCard
                label={`Employees with a skill > ${data.thresholdYears} years`}
                value={data.employeesAboveThreshold}
                caption={`${data.employeesInScope ? Math.round((1000 * data.employeesAboveThreshold) / data.employeesInScope) / 10 : 0}% of ${data.employeesInScope} employees, each counted once (${data.assignmentsAboveThreshold} skill assignments)`}
                onClick={catalog.scope.canSearchPeople ? () => navigate(`/search?workforce=EMPLOYEE&skillYearsMin=${data.thresholdYears}&sort=EXPERIENCE${skillId ? `&skill=${skillId}` : ''}${businessUnitId ? `&bu=${businessUnitId}` : ''}`) : undefined}
              />
              <KpiCard label="Data quality" value={`${data.estimatedAssignments} est. · ${data.unavailableAssignments} n/a`} caption="Estimated / unavailable experience dates" />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={4}>
            <ChartCard title="Years with the same skill">
              <BarChart data={data.distribution} />
            </ChartCard>
          </Grid>
          <Grid item xs={12} sm={4}>
            <ChartCard title="Competency distribution" subtitle="Skill assignments by level">
              <BarChart data={data.competency} />
            </ChartCard>
          </Grid>
          <Grid item xs={12}>
            <ChartCard title="By skill">
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Skill</TableCell>
                      <TableCell>Area</TableCell>
                      <TableCell align="right">People</TableCell>
                      <TableCell align="right">&gt; {data.thresholdYears} years</TableCell>
                      <TableCell align="right">Average years</TableCell>
                      <TableCell align="right">Estimated / n/a</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.skills.map((row) => (
                      <TableRow key={row.skillId} hover sx={{ cursor: catalog.scope.canSearchPeople ? 'pointer' : 'default' }} onClick={() => catalog.scope.canSearchPeople && navigate(`/search?skill=${row.skillId}&sort=EXPERIENCE`)}>
                        <TableCell>{row.skill}</TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell align="right">{row.holders}</TableCell>
                        <TableCell align="right">{row.aboveThreshold}</TableCell>
                        <TableCell align="right">{row.avgYears ?? '—'}</TableCell>
                        <TableCell align="right">
                          {row.estimated} / {row.unavailable}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12}>
            <ChartCard title="By employee and skill">
              {data.individualsVisible ? (
                <TableContainer sx={{ maxHeight: 420 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Skill</TableCell>
                        <TableCell align="right">Years</TableCell>
                        <TableCell>Date quality</TableCell>
                        <TableCell>Level</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.rows.map((row) => (
                        <TableRow key={`${row.employeeId}-${row.skillId}`} hover selected={row.aboveThreshold} sx={{ cursor: 'pointer' }} onClick={() => navigate(`/search?text=${encodeURIComponent(row.name)}`)}>
                          <TableCell>
                            {row.name}
                            <Typography component="span" variant="body2" color="text.secondary">{` · ${row.businessUnit ?? ''}`}</Typography>
                          </TableCell>
                          <TableCell>{row.skill}</TableCell>
                          <TableCell align="right">{yearsText(row.years, row.quality)}</TableCell>
                          <TableCell>
                            <Chip size="small" variant="outlined" color={row.quality === 'RECORDED' ? 'success' : row.quality === 'ESTIMATED' ? 'warning' : 'default'} label={QUALITY_LABEL[row.quality]} />
                          </TableCell>
                          <TableCell>
                            {row.level} — {LEVEL_LABELS[row.level]}
                            {row.evidence === 'VALIDATED' ? '' : ' (not verified)'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">Your role sees totals only, not individual employees.</Typography>
              )}
            </ChartCard>
          </Grid>
        </Grid>
      ) : null}
    </Stack>
  );
}

function IntelligenceAnalyticsPage(): JSX.Element {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'skills' ? 'skills' : 'tenure';
  const catalogQuery = useIntelligenceCatalog();
  if (catalogQuery.isError) return <Alert severity="error">Analytics are not available for your role.</Alert>;
  return (
    <Box>
      <WorkforcePageHeader
        title="Experience analytics"
        description="How long people stay on projects and how long they have used their skills. Thresholds are configurable."
        breadcrumbs={[{ label: 'Workforce Intelligence', to: '/intelligence' }, { label: 'Experience analytics' }]}
      />
      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        Reports preview: these standing analytics belong to the Reports &amp; Workforce Analytics module. Search &amp; Discovery answers the same questions on demand (for example &ldquo;How many people have been on the same project for more than 2 years?&rdquo;).
      </Alert>
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, value: string) => setParams({ tab: value })}>
          <Tab value="tenure" label="Project tenure" />
          <Tab value="skills" label="Skill experience" />
        </Tabs>
      </Paper>
      {catalogQuery.data ? tab === 'tenure' ? <TenureTab catalog={catalogQuery.data} /> : <SkillTab catalog={catalogQuery.data} /> : null}
    </Box>
  );
}

export default IntelligenceAnalyticsPage;

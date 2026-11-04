import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Slider,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WorkforcePageHeader } from '../../../components/WorkforcePageHeader';
import ExportMenu from '../../../components/ExportMenu/ExportMenu';
import { useDemands, useIntelligenceCatalog, useMatching } from '@features/intelligence/intelligenceApi';
import { STATUS_LABELS, levelLabel } from '@features/intelligence/intelligenceModel';
import useAuthStore from '@store/authStore';
import type { Report } from '../../../lib/export';
import type { CandidateMatch, CriterionType, DemandCriterion, IntelligenceCatalog, MatchingWeights, StaffingDemand } from '../../../types/intelligence.types';

const DEFAULT_WEIGHTS: MatchingWeights = { optional: 40, competency: 25, experience: 15, availability: 20 };
const WEIGHT_LABELS: Record<keyof MatchingWeights, string> = {
  optional: 'Optional criteria met',
  competency: 'Competency level fit',
  experience: 'Relevant project experience',
  availability: 'Availability on start date'
};
const TYPE_LABELS: Record<CriterionType, string> = {
  SKILL: 'Skill / technology',
  CERTIFICATION: 'Certification',
  INDUSTRY: 'Industry experience',
  PROJECT_EXPERIENCE: 'Similar project',
  LANGUAGE: 'Language'
};

const label = (criterion: DemandCriterion, catalog: IntelligenceCatalog): string => {
  switch (criterion.type) {
    case 'SKILL':
      return `${catalog.skills.find((skill) => skill.id === criterion.skillId)?.name} ≥ ${levelLabel(criterion.minLevel ?? 1)}${criterion.minYears ? `, > ${criterion.minYears} y` : ''}`;
    case 'CERTIFICATION':
      return catalog.certifications.find((cert) => cert.code === criterion.certificationCode)?.name ?? criterion.certificationCode ?? '';
    case 'INDUSTRY':
      return `${catalog.verticals.find((vertical) => vertical.id === criterion.verticalId)?.name} industry`;
    case 'PROJECT_EXPERIENCE':
      return `Project like "${criterion.keyword}"`;
    case 'LANGUAGE':
      return `Speaks ${criterion.language}`;
    default:
      return '';
  }
};

function CriterionBuilder({ catalog, onAdd }: { catalog: IntelligenceCatalog; onAdd: (criterion: DemandCriterion, optional: boolean) => void }): JSX.Element {
  const [type, setType] = useState<CriterionType>('SKILL');
  const [skillId, setSkillId] = useState<string | null>(null);
  const [minLevel, setMinLevel] = useState(3);
  const [minYears, setMinYears] = useState('');
  const [code, setCode] = useState('');
  const [verticalId, setVerticalId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [language, setLanguage] = useState('');
  const build = (): DemandCriterion | null => {
    const id = `c-${Date.now()}`;
    if (type === 'SKILL') return skillId ? { id, type, skillId, minLevel, minYears: minYears ? Number(minYears) : null, weight: 2 } : null;
    if (type === 'CERTIFICATION') return code ? { id, type, certificationCode: code, weight: 2 } : null;
    if (type === 'INDUSTRY') return verticalId ? { id, type, verticalId, weight: 2 } : null;
    if (type === 'PROJECT_EXPERIENCE') return keyword.trim() ? { id, type, keyword: keyword.trim(), weight: 2 } : null;
    return language ? { id, type, language, weight: 2 } : null;
  };
  const criterion = build();
  return (
    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1} alignItems={{ lg: 'center' }}>
      <TextField select size="small" label="Criterion type" value={type} sx={{ minWidth: 180 }} onChange={(event) => setType(event.target.value as CriterionType)}>
        {(Object.keys(TYPE_LABELS) as CriterionType[]).map((item) => (
          <MenuItem key={item} value={item}>
            {TYPE_LABELS[item]}
          </MenuItem>
        ))}
      </TextField>
      {type === 'SKILL' ? (
        <>
          <Autocomplete
            size="small"
            sx={{ minWidth: 200 }}
            options={catalog.skills}
            getOptionLabel={(option) => option.name}
            value={catalog.skills.find((skill) => skill.id === skillId) ?? null}
            onChange={(_, skill) => setSkillId(skill?.id ?? null)}
            renderInput={(params) => <TextField {...params} label="Skill" />}
          />
          <TextField select size="small" label="Min. level" value={minLevel} sx={{ minWidth: 160 }} onChange={(event) => setMinLevel(Number(event.target.value))}>
            {[1, 2, 3, 4, 5].map((level) => (
              <MenuItem key={level} value={level}>
                {levelLabel(level)}
              </MenuItem>
            ))}
          </TextField>
          <TextField size="small" type="number" label="More than (years)" value={minYears} sx={{ width: 140 }} onChange={(event) => setMinYears(event.target.value)} />
        </>
      ) : null}
      {type === 'CERTIFICATION' ? (
        <TextField select size="small" label="Certification" value={code} sx={{ minWidth: 260 }} onChange={(event) => setCode(event.target.value)}>
          {catalog.certifications.map((cert) => (
            <MenuItem key={cert.code} value={cert.code}>
              {cert.name}
            </MenuItem>
          ))}
        </TextField>
      ) : null}
      {type === 'INDUSTRY' ? (
        <TextField select size="small" label="Industry" value={verticalId} sx={{ minWidth: 200 }} onChange={(event) => setVerticalId(event.target.value)}>
          {catalog.verticals.map((vertical) => (
            <MenuItem key={vertical.id} value={vertical.id}>
              {vertical.name}
            </MenuItem>
          ))}
        </TextField>
      ) : null}
      {type === 'PROJECT_EXPERIENCE' ? <TextField size="small" label="Project keyword (e.g. payment)" value={keyword} onChange={(event) => setKeyword(event.target.value)} /> : null}
      {type === 'LANGUAGE' ? (
        <TextField select size="small" label="Language" value={language} sx={{ minWidth: 160 }} onChange={(event) => setLanguage(event.target.value)}>
          {catalog.languages.map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </TextField>
      ) : null}
      <Button variant="outlined" disabled={!criterion} onClick={() => criterion && onAdd(criterion, false)}>
        Add as must-have
      </Button>
      <Button variant="outlined" disabled={!criterion} onClick={() => criterion && onAdd(criterion, true)}>
        Add as optional
      </Button>
    </Stack>
  );
}

function CandidateCard({ candidate, weights }: { candidate: CandidateMatch; weights: MatchingWeights }): JSX.Element {
  return (
    <Accordion variant="outlined" disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} sx={{ width: '100%' }}>
          <Box sx={{ position: 'relative', display: 'inline-flex', minWidth: 56 }}>
            {candidate.eligible ? (
              <>
                <CircularProgress variant="determinate" value={candidate.score ?? 0} size={52} color={(candidate.score ?? 0) >= 75 ? 'success' : 'warning'} />
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography fontWeight={700} aria-label={`Match ${candidate.score} percent`}>
                    {candidate.score}%
                  </Typography>
                </Box>
              </>
            ) : (
              <Chip color="error" size="small" label="Not eligible" />
            )}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={600}>{candidate.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {candidate.title} · {candidate.businessUnit ?? '—'} · {candidate.location}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ maxWidth: 520 }}>
            {candidate.mustHave.map((result) => (
              <Chip key={result.criterionId} size="small" color={result.met ? 'success' : 'error'} icon={result.met ? <CheckCircleOutlineIcon /> : <HighlightOffIcon />} label={result.label} />
            ))}
            {candidate.optional.map((result) => (
              <Chip key={result.criterionId} size="small" variant="outlined" color={result.met ? 'success' : 'default'} label={`${result.met ? '✓' : '✗'} ${result.label}`} />
            ))}
          </Stack>
          <Box sx={{ minWidth: 160 }}>
            <Chip size="small" label={STATUS_LABELS[candidate.allocationStatus]} />
            <Typography variant="caption" display="block" color="text.secondary">
              {candidate.availabilityLabel}
            </Typography>
          </Box>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Typography variant="subtitle2" gutterBottom>
              Score breakdown
            </Typography>
            {(Object.keys(WEIGHT_LABELS) as (keyof MatchingWeights)[]).map((key) =>
              candidate.components[key] === null || weights[key] === 0 ? null : (
                <Box key={key} sx={{ mb: 1 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">
                      {WEIGHT_LABELS[key]} <Typography component="span" variant="caption" color="text.secondary">({weights[key]}%)</Typography>
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {candidate.components[key]}
                    </Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={candidate.components[key] ?? 0} sx={{ height: 6, borderRadius: 3 }} />
                </Box>
              )
            )}
            {!candidate.eligible ? <Alert severity="error">Fails a must-have criterion, so no match percentage is given.</Alert> : null}
          </Grid>
          <Grid item xs={12} md={7}>
            <Typography variant="subtitle2" gutterBottom>
              Criteria
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {[...candidate.mustHave.map((result) => ({ ...result, kind: 'Must-have' })), ...candidate.optional.map((result) => ({ ...result, kind: 'Optional' }))].map((result) => (
                <Typography component="li" variant="body2" key={result.criterionId} color={result.met ? 'text.primary' : 'error'}>
                  {result.kind}: {result.label} — {result.met ? 'met' : 'not met'} ({result.detail})
                </Typography>
              ))}
            </Box>
            <Typography variant="subtitle2" sx={{ mt: 1.5 }} gutterBottom>
              Explanation
            </Typography>
            {candidate.explanation.map((line) => (
              <Typography key={line} variant="body2">
                {line}
              </Typography>
            ))}
            {candidate.relevantProjects.length ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Relevant projects: {candidate.relevantProjects.join('; ')}
              </Typography>
            ) : null}
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}

function DemandMatchingPage(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const [params] = useSearchParams();
  const catalog = useIntelligenceCatalog().data;
  const demands = useDemands();
  const [demand, setDemand] = useState<StaffingDemand | null>(null);
  const [weights, setWeights] = useState<MatchingWeights>(DEFAULT_WEIGHTS);
  const matching = useMatching(demand, weights);
  const result = matching.data;

  useEffect(() => {
    if (!demand && demands.data?.length) setDemand(demands.data.find((item) => item.id === params.get('demand')) ?? demands.data[0]);
  }, [demands.data, demand, params]);

  if (demands.isError) return <Alert severity="error">Demand matching is not available for your role.</Alert>;

  const update = (patch: Partial<StaffingDemand>): void => setDemand((current) => (current ? { ...current, ...patch, id: current.id.startsWith('custom') ? current.id : `custom-${current.id}`, code: current.code.endsWith('*') ? current.code : `${current.code}*` } : current));

  const report = (): Report => {
    if (!result || !catalog) throw new Error('No results yet.');
    return {
      title: `Demand matching: ${result.demand.code} ${result.demand.title}`,
      subtitle: result.demand.description,
      generatedAt: new Date(),
      generatedBy: user?.username,
      criteria: result.criteria,
      notes: ['Must-have criteria are eligibility gates. Not eligible people have no match percentage.', 'Internal employees only; external applicants are not matched.'],
      kpis: [
        { label: 'Evaluated', value: String(result.evaluated) },
        { label: 'Eligible', value: String(result.eligibleCount) },
        { label: 'Best score', value: result.eligible[0]?.score !== undefined ? `${result.eligible[0].score}%` : '—' }
      ],
      charts: result.eligible.length ? [{ title: 'Match score of eligible candidates', data: result.eligible.slice(0, 15).map((item) => ({ label: item.name, value: item.score ?? 0 })) }] : [],
      tables: [
        {
          title: 'Eligible candidates',
          columns: ['Rank', 'Name', 'Title', 'Business unit', 'Match %', 'Optional', 'Competency', 'Experience', 'Availability', 'Optional met', 'Availability on start'],
          rows: result.eligible.map((item, index) => [
            index + 1,
            item.name,
            item.title,
            item.businessUnit,
            item.score,
            item.components.optional,
            item.components.competency,
            item.components.experience,
            item.components.availability,
            item.optional.filter((entry) => entry.met).map((entry) => entry.label).join('; '),
            item.availabilityLabel
          ])
        },
        { title: 'Not eligible (near misses)', columns: ['Name', 'Title', 'Missing must-have criteria'], rows: result.notEligible.map((item) => [item.name, item.title, item.mustHave.filter((entry) => !entry.met).map((entry) => entry.label).join('; ')]) }
      ],
      fileName: `demand-matching-${result.demand.code}`
    };
  };

  return (
    <Box>
      <WorkforcePageHeader
        title="Demand matching"
        description="Rank internal employees against a staffing demand. Must-have criteria decide who is eligible; optional criteria and weights decide the order."
        breadcrumbs={[{ label: 'Workforce Intelligence', to: '/intelligence' }, { label: 'Demand matching' }]}
        actions={<ExportMenu getReport={report} disabled={!result} />}
      />
      {catalog && demand ? (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Staffing demand"
                value={demands.data?.some((item) => item.id === demand.id) ? demand.id : ''}
                onChange={(event) => setDemand(demands.data?.find((item) => item.id === event.target.value) ?? demand)}
                helperText={demand.id.startsWith('custom') ? 'Edited: criteria differ from the stored demand (not saved).' : demand.description}
              >
                {demands.data?.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.code} · {item.title}
                  </MenuItem>
                ))}
              </TextField>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <TextField size="small" type="date" label="Start" InputLabelProps={{ shrink: true }} value={demand.startDate} onChange={(event) => event.target.value && update({ startDate: event.target.value })} />
                <TextField size="small" type="number" label="Allocation %" value={demand.allocationPct} inputProps={{ min: 1, max: 100 }} onChange={(event) => update({ allocationPct: Number(event.target.value) || 100 })} />
              </Stack>
              <TextField
                select
                fullWidth
                size="small"
                sx={{ mt: 2 }}
                label="Availability"
                value={demand.availabilityMode}
                onChange={(event) => update({ availabilityMode: event.target.value === 'HARD' ? 'HARD' : 'RANKING' })}
              >
                <MenuItem value="HARD">Must-have: free on the start date</MenuItem>
                <MenuItem value="RANKING">Ranking factor: sooner is better</MenuItem>
              </TextField>

              <Typography variant="subtitle2" sx={{ mt: 2 }}>
                Must-have criteria
              </Typography>
              {demand.mustHave.map((criterion) => (
                <Stack key={criterion.id} direction="row" alignItems="center" spacing={1}>
                  <Chip color="error" variant="outlined" size="small" label="Must" />
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {label(criterion, catalog)}
                  </Typography>
                  <IconButton size="small" aria-label="Remove criterion" onClick={() => update({ mustHave: demand.mustHave.filter((item) => item.id !== criterion.id) })}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              {!demand.mustHave.length ? (
                <Typography variant="body2" color="text.secondary">
                  None: everyone is eligible.
                </Typography>
              ) : null}
              <Typography variant="subtitle2" sx={{ mt: 2 }}>
                Optional criteria (weight 1–5)
              </Typography>
              {demand.optional.map((criterion) => (
                <Stack key={criterion.id} direction="row" alignItems="center" spacing={1}>
                  <TextField
                    select
                    size="small"
                    value={criterion.weight}
                    sx={{ width: 70 }}
                    inputProps={{ 'aria-label': 'Weight' }}
                    onChange={(event) => update({ optional: demand.optional.map((item) => (item.id === criterion.id ? { ...item, weight: Number(event.target.value) } : item)) })}
                  >
                    {[1, 2, 3, 4, 5].map((weight) => (
                      <MenuItem key={weight} value={weight}>
                        {weight}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {label(criterion, catalog)}
                  </Typography>
                  <IconButton size="small" aria-label="Remove criterion" onClick={() => update({ optional: demand.optional.filter((item) => item.id !== criterion.id) })}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Typography variant="subtitle2" sx={{ mt: 2 }}>
                Score weights
              </Typography>
              {(Object.keys(WEIGHT_LABELS) as (keyof MatchingWeights)[]).map((key) => (
                <Box key={key}>
                  <Typography variant="body2">
                    {WEIGHT_LABELS[key]}: {weights[key]}
                    {result ? ` (applied ${result.appliedWeights[key]}%)` : ''}
                  </Typography>
                  <Slider size="small" min={0} max={100} step={5} value={weights[key]} onChange={(_, value) => setWeights({ ...weights, [key]: value as number })} aria-label={WEIGHT_LABELS[key]} />
                </Box>
              ))}
              <Button size="small" onClick={() => setWeights(DEFAULT_WEIGHTS)}>
                Reset weights
              </Button>
            </Paper>
          </Grid>
          <Grid item xs={12} lg={8}>
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Add a criterion
                </Typography>
                <CriterionBuilder
                  catalog={catalog}
                  onAdd={(criterion, optional) => update(optional ? { optional: [...demand.optional, criterion] } : { mustHave: [...demand.mustHave, criterion] })}
                />
              </CardContent>
            </Card>
            {matching.isFetching ? <LinearProgress sx={{ mb: 1 }} /> : null}
            {matching.isError ? <Alert severity="warning">Add at least one criterion.</Alert> : null}
            {result ? (
              <>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                  {result.eligibleCount} eligible of {result.evaluated} evaluated · {result.scope.label}
                </Typography>
                <Stack spacing={1}>
                  {result.eligible.map((candidate) => (
                    <CandidateCard key={candidate.employeeId} candidate={candidate} weights={result.appliedWeights} />
                  ))}
                  {!result.eligible.length ? <Alert severity="info">Nobody meets every must-have criterion. See the near misses below, or relax a must-have.</Alert> : null}
                </Stack>
                {result.notEligible.length ? (
                  <>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 3, mb: 1 }}>
                      Not eligible — near misses ({result.notEligible.length})
                    </Typography>
                    <Stack spacing={1}>
                      {result.notEligible.map((candidate) => (
                        <CandidateCard key={candidate.employeeId} candidate={candidate} weights={result.appliedWeights} />
                      ))}
                    </Stack>
                  </>
                ) : null}
              </>
            ) : null}
          </Grid>
        </Grid>
      ) : (
        <LinearProgress />
      )}
    </Box>
  );
}

export default DemandMatchingPage;

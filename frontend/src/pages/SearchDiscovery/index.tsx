import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import DataObjectIcon from '@mui/icons-material/DataObject';
import HistoryIcon from '@mui/icons-material/History';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SchemaOutlinedIcon from '@mui/icons-material/SchemaOutlined';
import SendIcon from '@mui/icons-material/Send';
import TuneIcon from '@mui/icons-material/Tune';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Collapse,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { WorkforcePageHeader } from '../../components/WorkforcePageHeader';
import ExportMenu from '../../components/ExportMenu/ExportMenu';
import AnswerPanel, { AiThinking } from '@features/intelligence/AnswerPanel';
import CriteriaForm from '@features/intelligence/CriteriaForm';
import { AlternativeResults, PersonDrawer, ResultsTable } from '@features/intelligence/SearchResults';
import { HistoryDrawer, SaveSearchDialog, SavedSearchesDrawer } from '@features/intelligence/SearchLibrary';
import {
  fetchSearch,
  useAnswer,
  useDemands,
  useIntelligenceCatalog,
  useInterpret,
  useRecordRun,
  useSaveSearch,
  useSearch,
  useTouchSavedSearch
} from '@features/intelligence/intelligenceApi';
import {
  MODE_LABELS,
  QUICK_SEARCHES,
  SENIORITY_LABELS,
  SORT_LABELS,
  STATUS_LABELS,
  WORKFORCE_KIND_LABELS,
  createEmptyFilters,
  filtersFromParams,
  isEmptyFilters,
  levelLabel
} from '@features/intelligence/intelligenceModel';
import useAuthStore from '@store/authStore';
import type { Report } from '../../lib/export';
import type {
  AnswerSpec,
  DemandStatus,
  InterpretResponse,
  IntelligenceCatalog,
  QueryAnswer,
  ResultKind,
  SavedSearch,
  SearchFilters,
  SearchMode,
  SearchResultRow,
  SearchSort
} from '../../types/intelligence.types';

interface Run {
  filters: SearchFilters;
  sort: SearchSort;
  mode: SearchMode;
  label: string;
  query: string | null;
  // Statistic to compute next to the people list (AI questions such as "how many" or "what percentage").
  answerSpec: AnswerSpec | null;
  runId: number;
  // Only user-initiated runs go to history and usage; paging and sorting do not.
  record: boolean;
}

const PROMPT_GROUPS: { label: string; prompts: string[] }[] = [
  {
    label: 'People across skills and allocations',
    prompts: [
      'Find Java developers with more than three years of experience.',
      'Show employees with Java and Spring Boot experience who are not currently allocated.',
      'Find people who worked on e-commerce projects.',
      'Show employees working in Software Factory.'
    ]
  },
  {
    label: 'Demands and recruiting',
    prompts: [
      'Show open demands requiring Java.',
      'Find employees matching demand DEM-M05.',
      'How many external applicants did we receive this month?'
    ]
  },
  {
    label: 'Workforce figures',
    prompts: [
      'How many Java developers do we have?',
      'What percentage of our employees are Java developers?',
      'Compare Java and .NET developers.',
      'How many employees are currently unallocated?'
    ]
  },
  {
    label: 'Experience and tenure',
    prompts: [
      'How many employees have been working on the same project for more than 2 years?',
      'Find employees who have been using React for more than 5 years.',
      'Show me Java developers with more than 3 years of experience.'
    ]
  },
  {
    label: 'Availability',
    prompts: ['Find Vue developers available next month.', 'Show me developers available when their current project ends.']
  },
  {
    label: 'Matching and experience',
    prompts: [
      'Find people with Java as a Must-have skill and Spring Boot as an Optional skill.',
      'Show employees with e-commerce project experience.',
      'Find people with experience in cloud technologies.'
    ]
  },
  {
    label: 'Na srpskom',
    prompts: ['Koliko ljudi je preko 2 godine na istom projektu?', 'Koliko ljudi ima isti skill duže od 3 godine?', 'Koji procenat zaposlenih su Java programeri?']
  }
];

// A few short prompts next to the search box; the full list lives under "More examples & tips".
const QUICK_PROMPTS = ['Java developers with Kafka and AWS', 'Advanced React developers on bench', 'Show open demands requiring Java.', 'What percentage of our employees are Java developers?'];

const DEMAND_STATUS_LABELS: Record<DemandStatus, string> = { OPEN: 'Open', IN_SELECTION: 'In selection', ON_HOLD: 'On hold' };

const RESULT_LABELS: Record<ResultKind, string> = {
  PEOPLE: 'people',
  STATISTIC: 'number with denominator',
  COMPARISON: 'comparison',
  MATCH: 'ranked match',
  DEMANDS: 'demands',
  APPLICANTS: 'recruiting figure'
};

const REFINE_EXAMPLES =['only in Serbia', 'at least 50% free next month', 'senior only', 'with Azure experience'];

const ENGINE_LABEL: Record<InterpretResponse['engine'], { label: string; color: 'secondary' | 'success' | 'warning' }> = {
  SIMULATED_AI: { label: 'Simulated AI (demo rule engine, no LLM connected)', color: 'secondary' },
  RULES_ONLY: { label: 'Answered without AI (smart routing)', color: 'success' },
  FALLBACK_CONVENTIONAL: { label: 'AI unavailable — keyword fallback', color: 'warning' }
};

export const summarize = (filters: SearchFilters, catalog: IntelligenceCatalog): string[] => {
  const name = (list: { id: string; name: string }[], id: string): string => list.find((item) => item.id === id)?.name ?? id;
  const out: string[] = [];
  if (filters.text.trim()) out.push(`"${filters.text.trim()}"`);
  filters.skills.forEach((skill) =>
    out.push(`${name(catalog.skills, skill.skillId)} ≥ ${levelLabel(skill.minLevel)}${skill.minYears ? `, ${skill.yearsMode === 'AT_LEAST' ? '≥' : '>'} ${skill.minYears} y` : ''}`)
  );
  if (filters.anySkillMinYears !== null) out.push(`Same skill > ${filters.anySkillMinYears} y`);
  if (filters.projectText.trim()) out.push(`Project history "${filters.projectText.trim()}"`);
  if (filters.currentProjectId) out.push(`On ${name(catalog.projects, filters.currentProjectId)}`);
  if (filters.minCurrentTenureYears !== null) out.push(`Current project > ${filters.minCurrentTenureYears} y`);
  if (filters.maxCurrentTenureYears !== null) out.push(`Current project ≤ ${filters.maxCurrentTenureYears} y`);
  filters.businessUnitIds.forEach((id) => out.push(name(catalog.businessUnits, id)));
  filters.teamIds.forEach((id) => out.push(name(catalog.teams, id)));
  filters.allocationStatuses.forEach((status) => out.push(STATUS_LABELS[status]));
  if (filters.minAvailablePct !== null) out.push(`≥ ${filters.minAvailablePct}% free`);
  if (filters.availableFrom) out.push(`from ${filters.availableFrom}`);
  if (filters.rollingOffWithinDays !== null) out.push(`Project ends ≤ ${filters.rollingOffWithinDays} days`);
  filters.countries.forEach((country) => out.push(country));
  filters.seniority.forEach((value) => out.push(SENIORITY_LABELS[value]));
  if (filters.verticalId) out.push(`${name(catalog.verticals, filters.verticalId)} experience`);
  filters.workforceTypes.forEach((kind) => out.push(WORKFORCE_KIND_LABELS[kind]));
  return out;
};

const answerKpis = (answer: QueryAnswer | undefined): NonNullable<Report['kpis']> => {
  if (!answer) return [];
  if (answer.kind === 'STAT')
    return [
      { label: answer.subject, value: String(answer.count) },
      { label: 'Share of population', value: `${answer.percentage}%` },
      { label: 'Population', value: answer.population.label }
    ];
  if (answer.kind === 'COMPARE') return answer.rows.map((row) => ({ label: row.label, value: `${row.count} (${row.percentage}%)` }));
  if (answer.kind === 'DEMANDS') return [{ label: 'Demands', value: String(answer.total) }];
  if (answer.kind === 'APPLICANTS') return [{ label: `Applicants ${answer.monthLabel}`, value: String(answer.total) }];
  return [
    { label: 'Eligible', value: `${answer.eligibleCount} of ${answer.evaluated}` },
    { label: 'Best score', value: answer.top[0] ? String(answer.top[0].score) : '—' }
  ];
};

function SearchDiscoveryPage(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const catalogQuery = useIntelligenceCatalog();
  const catalog = catalogQuery.data;
  const [tab, setTab] = useState<SearchMode>('AI');
  const [draft, setDraft] = useState<SearchFilters>(createEmptyFilters);
  const [run, setRun] = useState<Run | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [aiQuery, setAiQuery] = useState('');
  const [refineText, setRefineText] = useState('');
  const [interpretation, setInterpretation] = useState<InterpretResponse | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showRefine, setShowRefine] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  // Structured search across modules: people (01 + 02, optionally ranked for a demand) or demands (03).
  const [structuredTarget, setStructuredTarget] = useState<'PEOPLE' | 'DEMANDS'>('PEOPLE');
  const [matchDemandId, setMatchDemandId] = useState<string | null>(null);
  const [demandSkillIds, setDemandSkillIds] = useState<string[]>([]);
  const [demandStatusFilter, setDemandStatusFilter] = useState<DemandStatus[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SearchResultRow | null>(null);
  const [savedOpen, setSavedOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saveSource, setSaveSource] = useState<Omit<Run, 'runId' | 'record'> | null>(null);
  const [editingSaved, setEditingSaved] = useState<SavedSearch | null>(null);
  const runCounter = useRef(0);
  const recorded = useRef(new Set<number>());
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const interpret = useInterpret();
  const recordRun = useRecordRun();
  const saveSearch = useSaveSearch();
  const touchSaved = useTouchSavedSearch();
  // Alternatives are offered for people searches, not for statistics (they would blur the numbers).
  const STAT_ONLY = ['WORKFORCE_COUNT', 'WORKFORCE_PERCENTAGE', 'TECHNOLOGY_COMPARISON', 'PROJECT_TENURE', 'SKILL_DURATION', 'DEMAND_SEARCH', 'APPLICANT_COUNT'];
  const wantsAlternatives = !run?.answerSpec || !STAT_ONLY.includes(run.answerSpec.intent);
  const search = useSearch(run?.filters ?? null, run?.sort ?? 'RELEVANCE', page, size, run?.runId ?? 0, wantsAlternatives);
  const answerRequest = useMemo(() => (run?.answerSpec ? { ...run.answerSpec, filters: run.filters } : null), [run]);
  const answer = useAnswer(answerRequest);
  const demandOptions = useDemands(Boolean(catalog?.scope.canMatch));
  // Demand and recruiting questions answer with demands or a count, not with a list of employees.
  const peopleListVisible = !run?.answerSpec || !['DEMAND_SEARCH', 'APPLICANT_COUNT'].includes(run.answerSpec.intent);

  const start = (next: Omit<Run, 'runId'>): void => {
    runCounter.current += 1;
    setRun({ ...next, runId: runCounter.current });
    setPage(0);
  };

  const runStructured = (): void => {
    if (structuredTarget === 'DEMANDS') {
      const filters: SearchFilters = { ...createEmptyFilters(), skills: demandSkillIds.map((skillId) => ({ skillId, minLevel: 1, minYears: null })) };
      const names = catalog ? catalog.skills.filter((skill) => demandSkillIds.includes(skill.id)).map((skill) => skill.name) : [];
      start({
        filters,
        sort: 'RELEVANCE',
        mode: 'STRUCTURED',
        label: `Demands${names.length ? ` requiring ${names.join(' and ')}` : ''}${demandStatusFilter.length ? ` (${demandStatusFilter.map((status) => DEMAND_STATUS_LABELS[status]).join(', ')})` : ''}`,
        query: null,
        answerSpec: { intent: 'DEMAND_SEARCH', ...(demandStatusFilter.length ? { demandStatuses: demandStatusFilter } : {}) },
        record: true
      });
      return;
    }
    const demand = (demandOptions.data ?? []).find((item) => item.id === matchDemandId);
    if (demand) {
      // The people list shows everyone with the demand's must-have skills (plus the other filters); the ranking applies all criteria.
      const skills = demand.mustHave
        .filter((criterion) => criterion.type === 'SKILL' && criterion.skillId)
        .map((criterion) => ({ skillId: criterion.skillId as string, minLevel: criterion.minLevel ?? 1, minYears: criterion.minYears ?? null }));
      const filters: SearchFilters = { ...draft, skills, skillMatch: 'ALL' };
      start({ filters, sort: 'RELEVANCE', mode: 'STRUCTURED', label: `People for ${demand.code} ${demand.title}`, query: null, answerSpec: { intent: 'DEMAND_MATCH', demandId: demand.id }, record: true });
      return;
    }
    start({ filters: draft, sort: run?.sort ?? 'RELEVANCE', mode: 'STRUCTURED', label: labelFor(draft), query: null, answerSpec: editingSaved?.answerSpec ?? null, record: true });
  };
  const labelFor = (filters: SearchFilters): string => (catalog ? summarize(filters, catalog).join(' · ') : '') || 'Everyone in scope';

  // First load: a saved search opened from the Saved searches page, drill-down parameters from dashboards,
  // otherwise browse everyone in scope.
  useEffect(() => {
    if (!catalog || run) return;
    const saved = (location.state as { savedSearch?: SavedSearch } | null)?.savedSearch;
    const fromLink = filtersFromParams(params);
    if (saved) {
      touchSaved.mutate(saved.id);
      setDraft(saved.filters);
      setTab(saved.mode);
      setAiQuery(saved.query ?? '');
      start({ filters: saved.filters, sort: saved.sort, mode: saved.mode, label: saved.name, query: saved.query, answerSpec: saved.answerSpec ?? null, record: true });
    } else if (fromLink) {
      setDraft(fromLink);
      setTab('STRUCTURED');
      start({
        filters: fromLink,
        sort: params.get('sort') === 'TENURE' ? 'TENURE' : params.get('sort') === 'EXPERIENCE' ? 'EXPERIENCE' : 'RELEVANCE',
        mode: 'STRUCTURED',
        label: `Drill-down: ${summarize(fromLink, catalog).join(' · ')}`,
        query: null,
        answerSpec: null,
        record: true
      });
    } else {
      start({ filters: createEmptyFilters(), sort: 'NAME', mode: 'STRUCTURED', label: 'Everyone in scope', query: null, answerSpec: null, record: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  useEffect(() => {
    if (!run?.record || !search.data || search.isPlaceholderData || recorded.current.has(run.runId)) return;
    recorded.current.add(run.runId);
    recordRun.mutate({ mode: run.mode, label: run.label, query: run.query, filters: run.filters, sort: run.sort, resultCount: search.data.total, answerSpec: run.answerSpec });
  }, [run, search.data, search.isPlaceholderData, recordRun]);

  const runAi = async (text: string, context: string | null = null): Promise<void> => {
    if (!text.trim()) return;
    if (!context) setAiQuery(text);
    setShowJson(false);
    try {
      const result = await interpret.mutateAsync({ query: text, context });
      setInterpretation(result);
      setDraft(result.filters);
      setRefineText('');
      setAiQuery(result.query);
      start({ filters: result.filters, sort: result.sort, mode: 'AI', label: `"${result.query}"`, query: result.query, answerSpec: result.answerSpec, record: true });
    } catch {
      // The error is shown from interpret.isError; the previous results stay on screen.
    }
  };

  const resetAi = (): void => {
    setAiQuery('');
    setRefineText('');
    setInterpretation(null);
    setShowEditor(false);
    setShowJson(false);
    setShowRefine(false);
    setShowDetails(false);
    interpret.reset();
    setDraft(createEmptyFilters());
    start({ filters: createEmptyFilters(), sort: 'NAME', mode: 'STRUCTURED', label: 'Everyone in scope', query: null, answerSpec: null, record: false });
  };

  const openSaved = (saved: { filters: SearchFilters; sort: SearchSort; mode: SearchMode; query: string | null; answerSpec?: AnswerSpec | null; name?: string; label?: string }): void => {
    setDraft(saved.filters);
    setTab(saved.mode);
    setAiQuery(saved.query ?? '');
    setInterpretation(null);
    start({
      filters: saved.filters,
      sort: saved.sort,
      mode: saved.mode,
      label: saved.name ?? saved.label ?? labelFor(saved.filters),
      query: saved.query,
      answerSpec: saved.answerSpec ?? null,
      record: true
    });
  };

  const showPeople = (): void => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const data = search.data;
  const scope = catalog?.scope;
  const showRelevance = Boolean(run?.filters.skills.length);

  const buildReport = async (): Promise<Report> => {
    if (!run) throw new Error('Run a search first.');
    const all = await fetchSearch(run.filters, run.sort, 0, 500);
    const sensitive = all.scope.canSeeSeniority;
    return {
      title: run.mode === 'AI' && run.query ? `Search & Discovery: ${run.query}` : 'Workforce search results',
      subtitle: `${MODE_LABELS[run.mode]} search · sorted by ${SORT_LABELS[all.sort]}`,
      generatedAt: new Date(),
      generatedBy: user?.username,
      criteria: all.criteria.length ? all.criteria : ['No filters: everyone in your scope'],
      notes: [
        `Scope: ${all.scope.label}`,
        'Internal staff only. External applicants are never part of employee search.',
        ...(answer.data && (answer.data.kind === 'STAT' || answer.data.kind === 'COMPARE') ? [`Population: ${answer.data.population.definition}`] : []),
        'Demo data: figures are illustrative and do not describe the real workforce.',
        ...(all.total > 500 ? ['Only the first 500 rows are exported.'] : [])
      ],
      kpis: [
        ...answerKpis(answer.data),
        { label: 'People listed', value: String(all.total) },
        { label: 'Availability date', value: all.targetDate }
      ],
      charts:
        answer.data?.kind === 'STAT' && answer.data.breakdown
          ? [{ title: answer.data.breakdown.title, data: answer.data.breakdown.rows.map((row) => ({ label: row.label, value: row.count })) }]
          : answer.data?.kind === 'COMPARE'
            ? [{ title: 'Comparison', data: answer.data.rows.map((row) => ({ label: row.label, value: row.count })) }]
            : [],
      tables: [
        ...(answer.data?.kind === 'STAT' && answer.data.lenses.length
          ? [{ title: 'Definitions', columns: ['Definition', 'People', 'Share'], rows: answer.data.lenses.map((lens) => [lens.label, lens.count, `${lens.percentage}%`]) }]
          : []),
        {
          title: 'Results',
          columns: [
            'Name',
            'Title',
            'Business unit',
            'Team',
            'Location',
            'Current project',
            'On project since',
            'Current project (years)',
            'Project ends',
            'Allocation',
            'Free %',
            'Matched skills',
            'Top skills',
            'Relevance',
            ...(sensitive ? ['Seniority', 'Cost code'] : [])
          ],
          rows: all.rows.map((row) => [
            row.name,
            row.title,
            row.businessUnit,
            row.team,
            row.location,
            row.currentProject?.name ?? null,
            row.currentProject?.since ?? null,
            row.currentProject?.tenureYears ?? null,
            row.currentProject?.endDate ?? null,
            STATUS_LABELS[row.allocationStatus],
            row.availablePct,
            row.matchedSkills.map((skill) => `${skill.name} ${skill.level}/5`).join(', '),
            row.topSkills.map((skill) => `${skill.name} ${skill.level}/5`).join(', '),
            row.relevance,
            ...(sensitive ? [row.seniority, row.costCode] : [])
          ])
        }
      ],
      fileName: 'search-and-discovery'
    };
  };

  const quickProjectName = useMemo(() => catalog?.projects.find((project) => project.id === projectId)?.name, [catalog, projectId]);

  if (catalogQuery.isError) return <Alert severity="error">Search & Discovery is not available for your role.</Alert>;

  return (
    <Box>
      <WorkforcePageHeader
        title="Search & Discovery"
        description="One search across skills, projects, allocations, availability and demands."
        breadcrumbs={[{ label: 'Search & Discovery' }]}
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button startIcon={<SchemaOutlinedIcon />} variant="text" onClick={() => navigate('/intelligence/ai-architecture')}>
              How AI search works
            </Button>
            <Button startIcon={<BookmarkBorderIcon />} variant="outlined" onClick={() => setSavedOpen(true)}>
              Saved searches
            </Button>
            <Button startIcon={<HistoryIcon />} variant="outlined" onClick={() => setHistoryOpen(true)}>
              Recent searches
            </Button>
          </Stack>
        }
      />
      {scope ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
          <Tooltip title={`${scope.description} External applicants never appear among employees.`}>
            <Chip size="small" color="primary" variant="outlined" label={`Searching: ${scope.label}`} />
          </Tooltip>
          <Chip size="small" color="warning" variant="outlined" label="Demo data · simulated AI" />
        </Stack>
      ) : null}

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, value: SearchMode) => setTab(value)} aria-label="Search mode" variant="scrollable">
          <Tab value="AI" icon={<AutoAwesomeOutlinedIcon />} iconPosition="start" label="AI Quick Search" />
          <Tab value="STRUCTURED" icon={<TuneIcon />} iconPosition="start" label="Structured search" />
          <Tab value="QUICK" icon={<BoltOutlinedIcon />} iconPosition="start" label="Quick search" />
        </Tabs>
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          {tab === 'AI' && catalog ? (
            <Stack spacing={2}>
              <Box
                component="form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void runAi(aiQuery);
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={3}
                    value={aiQuery}
                    onChange={(event) => setAiQuery(event.target.value)}
                    placeholder='Ask anything about your workforce, e.g. "What percentage of our employees are Java developers?" or "Koliko ljudi je preko 2 godine na istom projektu?"'
                    inputProps={{ 'aria-label': 'Natural-language query', maxLength: 500 }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void runAi(aiQuery);
                      }
                    }}
                  />
                  <Stack direction="row" spacing={1} sx={{ minWidth: { md: 220 } }}>
                    <Button type="submit" variant="contained" startIcon={<SendIcon />} disabled={!aiQuery.trim() || interpret.isPending}>
                      Ask
                    </Button>
                    <Button startIcon={<RestartAltIcon />} onClick={resetAi} disabled={interpret.isPending || (!aiQuery && !interpretation)}>
                      Clear
                    </Button>
                  </Stack>
                </Stack>
              </Box>

              {/* Examples and guidance stay one click away so they never push the results down. */}
              <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="caption" color="text.secondary">
                  Try:
                </Typography>
                {QUICK_PROMPTS.map((prompt) => (
                  <Chip key={prompt} size="small" variant="outlined" label={prompt} onClick={() => void runAi(prompt)} />
                ))}
                <Button size="small" startIcon={<HelpOutlineIcon />} onClick={() => setShowHelp(!showHelp)} aria-expanded={showHelp}>
                  {showHelp ? 'Hide examples & tips' : 'More examples & tips'}
                </Button>
              </Stack>
              <Collapse in={showHelp}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                  <Typography variant="body2" sx={{ mb: 1.5 }}>
                    One search across <strong>Skill Matrix</strong> (skills, levels, years), <strong>Workforce</strong> (projects, allocations, availability, units)
                    {scope?.canMatch ? (
                      <>
                        {' '}
                        and <strong>Demand Management</strong> (demands, matching)
                      </>
                    ) : null}
                    . Ask for people, a number (&ldquo;how many&rdquo;, &ldquo;what percentage&rdquo;), a comparison, demands or a match. Name skills, years (&ldquo;more than 3
                    years&rdquo;), availability (&ldquo;next month&rdquo;, &ldquo;50% free&rdquo;) and must-have / optional criteria. English and Serbian both work.
                  </Typography>
                  <Grid container spacing={1.5}>
                    {PROMPT_GROUPS.map((group) => (
                      <Grid item xs={12} sm={6} lg={4} key={group.label}>
                        <Typography variant="subtitle2" gutterBottom>
                          {group.label}
                        </Typography>
                        <Stack spacing={0.75} alignItems="flex-start">
                          {group.prompts.map((prompt) => (
                            <Chip
                              key={prompt}
                              size="small"
                              variant="outlined"
                              icon={<AutoAwesomeOutlinedIcon />}
                              label={prompt}
                              onClick={() => void runAi(prompt)}
                              sx={{ maxWidth: '100%', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }}
                            />
                          ))}
                        </Stack>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Collapse>

              <AiThinking active={interpret.isPending} />
              {interpret.isError ? (
                <Alert severity="error" action={<Button onClick={() => setTab('STRUCTURED')}>Use structured search</Button>}>
                  The AI service did not answer. Your previous results are still shown. Try again, or use structured search, which does not need AI.
                </Alert>
              ) : null}

              {interpretation && !interpret.isPending ? (
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  {/* Compact summary: what was understood, in one line. Details, notes and JSON on demand. */}
                  <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" fontWeight={600}>
                      Understood:
                    </Typography>
                    {interpretation.recognized.map((item) => (
                      <Chip
                        key={item}
                        size="small"
                        color={item.startsWith('Optional:') ? 'success' : item.startsWith('Must-have:') ? 'error' : 'primary'}
                        variant={item.startsWith('Optional:') || item.startsWith('Must-have:') ? 'outlined' : 'filled'}
                        label={item}
                      />
                    ))}
                    {interpretation.notUnderstood.map((word) => (
                      <Chip key={word} size="small" color="warning" variant="outlined" label={`Not understood: ${word}`} />
                    ))}
                    <Chip size="small" variant="outlined" label={`Result: ${RESULT_LABELS[interpretation.resultKind]}`} />
                    <Box sx={{ flexGrow: 1 }} />
                    <Button size="small" startIcon={<TuneIcon />} onClick={() => setShowEditor(!showEditor)} aria-expanded={showEditor}>
                      Edit criteria
                    </Button>
                    <Button size="small" onClick={() => setShowRefine(!showRefine)} aria-expanded={showRefine}>
                      Refine
                    </Button>
                    <Button size="small" startIcon={<InfoOutlinedIcon />} onClick={() => setShowDetails(!showDetails)} aria-expanded={showDetails}>
                      Details{interpretation.notes.length ? ` (${interpretation.notes.length})` : ''}
                    </Button>
                  </Stack>
                  {interpretation.notes.some((note) => /not available for your role|not visible for your role|only available to roles/.test(note)) ? (
                    <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                      {interpretation.notes.find((note) => /not available for your role|not visible for your role|only available to roles/.test(note))}
                    </Typography>
                  ) : null}
                  <Collapse in={showRefine}>
                    <Box
                      component="form"
                      sx={{ mt: 1.5 }}
                      onSubmit={(event) => {
                        event.preventDefault();
                        void runAi(refineText, interpretation.query);
                      }}
                    >
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <TextField
                          size="small"
                          fullWidth
                          label="Refine this question"
                          placeholder={`e.g. ${REFINE_EXAMPLES.join(' · ')}`}
                          value={refineText}
                          onChange={(event) => setRefineText(event.target.value)}
                          inputProps={{ maxLength: 200 }}
                        />
                        <Button type="submit" variant="outlined" disabled={!refineText.trim()}>
                          Refine
                        </Button>
                      </Stack>
                    </Box>
                  </Collapse>
                  <Collapse in={showDetails}>
                    <Box sx={{ mt: 1.5 }}>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                        <Chip size="small" color="primary" label={`Intent: ${interpretation.intentLabel}`} />
                        {interpretation.domains.length ? <Chip size="small" variant="outlined" label={`Uses: ${interpretation.domains.join(' + ')}`} /> : null}
                        {interpretation.language === 'SR' ? <Chip size="small" variant="outlined" label="Serbian question" /> : null}
                        <Chip size="small" color={ENGINE_LABEL[interpretation.engine].color} variant="outlined" label={ENGINE_LABEL[interpretation.engine].label} />
                        <Chip
                          size="small"
                          variant="outlined"
                          label={
                            interpretation.usage.inputTokens
                              ? `~${interpretation.usage.inputTokens} in / ${interpretation.usage.outputTokens} out tokens · est. $${interpretation.usage.estimatedCostUsd.toFixed(5)}`
                              : 'No AI tokens used · $0'
                          }
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        “{interpretation.query}”
                      </Typography>
                      {interpretation.notes.map((note) => (
                        <Typography key={note} variant="body2">
                          • {note}
                        </Typography>
                      ))}
                      <Button size="small" sx={{ mt: 1 }} startIcon={<DataObjectIcon />} onClick={() => setShowJson(!showJson)} aria-expanded={showJson}>
                        {showJson ? 'Hide structured query' : 'Show structured query (JSON)'}
                      </Button>
                    </Box>
                  </Collapse>
                  <Collapse in={showJson && showDetails}>
                    <Box
                      component="pre"
                      sx={{ mt: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, fontSize: 13, overflowX: 'auto', maxWidth: '100%' }}
                      aria-label="Structured query"
                    >
                      {JSON.stringify(interpretation.structured, null, 2)}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      In production an Azure OpenAI model returns this JSON; the backend validates it and runs the query. The model never sees employee records.
                    </Typography>
                  </Collapse>
                  <Collapse in={showEditor}>
                    <Box sx={{ mt: 2 }}>
                      <CriteriaForm catalog={catalog} filters={draft} onChange={setDraft} />
                      <Button
                        sx={{ mt: 2 }}
                        variant="contained"
                        onClick={() =>
                          start({
                            filters: draft,
                            sort: run?.sort ?? interpretation.sort,
                            mode: 'AI',
                            label: `"${interpretation.query}" (edited)`,
                            query: interpretation.query,
                            answerSpec: interpretation.answerSpec,
                            record: true
                          })
                        }
                      >
                        Search with these criteria
                      </Button>
                    </Box>
                  </Collapse>
                </Paper>
              ) : null}
            </Stack>
          ) : null}

          {tab === 'STRUCTURED' && catalog ? (
            <>
              {editingSaved ? (
                <Alert severity="info" sx={{ mb: 2 }} onClose={() => setEditingSaved(null)}>
                  Editing saved search "{editingSaved.name}". Change the criteria, then choose "Update saved search".
                </Alert>
              ) : null}
              {/* What to find: people (Skill Matrix + Workforce, optionally ranked for a demand) or demands (Demand Management). */}
              {catalog.scope.canMatch ? (
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight={600}>
                    Find:
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={structuredTarget}
                    onChange={(_, value: 'PEOPLE' | 'DEMANDS' | null) => value && setStructuredTarget(value)}
                    aria-label="What to find"
                  >
                    <ToggleButton value="PEOPLE">People</ToggleButton>
                    <ToggleButton value="DEMANDS">Demands</ToggleButton>
                  </ToggleButtonGroup>
                  <Typography variant="caption" color="text.secondary">
                    {structuredTarget === 'PEOPLE'
                      ? 'Skills (Skill Matrix), projects, allocation and availability (Workforce); optionally ranked for a demand.'
                      : 'Demands (Demand Management) that ask for these skills, with how many people could fill them.'}
                  </Typography>
                </Stack>
              ) : null}
              {structuredTarget === 'DEMANDS' && catalog.scope.canMatch ? (
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <Autocomplete
                    multiple
                    fullWidth
                    size="small"
                    options={catalog.skills}
                    groupBy={(option) => option.category}
                    getOptionLabel={(option) => option.name}
                    value={catalog.skills.filter((skill) => demandSkillIds.includes(skill.id))}
                    onChange={(_, skills) => setDemandSkillIds(skills.map((skill) => skill.id))}
                    renderInput={(fieldParams) => <TextField {...fieldParams} label="Required skills (must-have or optional)" />}
                  />
                  <Autocomplete
                    multiple
                    size="small"
                    sx={{ minWidth: 280 }}
                    options={['OPEN', 'IN_SELECTION', 'ON_HOLD'] as DemandStatus[]}
                    getOptionLabel={(option) => DEMAND_STATUS_LABELS[option]}
                    value={demandStatusFilter}
                    onChange={(_, statuses) => setDemandStatusFilter(statuses)}
                    renderInput={(fieldParams) => <TextField {...fieldParams} label="Status (empty = all)" />}
                  />
                </Stack>
              ) : (
                <>
                  <CriteriaForm catalog={catalog} filters={draft} onChange={setDraft} />
                  {catalog.scope.canMatch ? (
                    <Autocomplete
                      size="small"
                      sx={{ mt: 2, maxWidth: 560 }}
                      options={demandOptions.data ?? []}
                      getOptionLabel={(option) => `${option.code} · ${option.title}`}
                      value={(demandOptions.data ?? []).find((item) => item.id === matchDemandId) ?? null}
                      onChange={(_, demand) => setMatchDemandId(demand?.id ?? null)}
                      renderInput={(fieldParams) => (
                        <TextField
                          {...fieldParams}
                          label="Rank against a demand (optional)"
                          helperText={
                            matchDemandId
                              ? "The ranking uses the demand's must-have and optional criteria; its must-have skills replace the skills above."
                              : 'Adds the must-have / optional ranking for the chosen demand above the people list.'
                          }
                        />
                      )}
                    />
                  ) : null}
                </>
              )}
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button variant="contained" onClick={runStructured}>
                  Search
                </Button>
                <Button
                  disabled={isEmptyFilters(draft) && !matchDemandId && !demandSkillIds.length && !demandStatusFilter.length}
                  onClick={() => {
                    setDraft(createEmptyFilters());
                    setMatchDemandId(null);
                    setDemandSkillIds([]);
                    setDemandStatusFilter([]);
                    start({ filters: createEmptyFilters(), sort: 'NAME', mode: 'STRUCTURED', label: 'Everyone in scope', query: null, answerSpec: null, record: false });
                  }}
                >
                  Clear all
                </Button>
                {editingSaved ? (
                  <Button
                    variant="outlined"
                    onClick={() =>
                      void saveSearch
                        .mutateAsync({
                          id: editingSaved.id,
                          name: editingSaved.name,
                          mode: editingSaved.mode,
                          filters: draft,
                          sort: run?.sort ?? editingSaved.sort,
                          query: editingSaved.query,
                          answerSpec: editingSaved.answerSpec ?? null
                        })
                        .then(() => setEditingSaved(null))
                    }
                  >
                    Update saved search
                  </Button>
                ) : null}
              </Stack>
            </>
          ) : null}

          {tab === 'QUICK' && catalog ? (
            <Grid container spacing={1.5}>
              {QUICK_SEARCHES.map((quick) => (
                <Grid item xs={12} sm={6} md={4} key={quick.id}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardActionArea
                      sx={{ height: '100%' }}
                      disabled={quick.needsProject && !projectId}
                      onClick={() => {
                        const built = quick.build(catalog, projectId ?? undefined);
                        setDraft(built.filters);
                        start({ ...built, mode: 'QUICK', label: quick.needsProject ? `${quick.label}: ${quickProjectName}` : quick.label, query: null, answerSpec: null, record: true });
                      }}
                    >
                      <CardContent>
                        <Typography fontWeight={600}>{quick.label}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {quick.description}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                    {quick.needsProject ? (
                      <Box sx={{ px: 2, pb: 2 }}>
                        <Autocomplete
                          size="small"
                          options={catalog.projects}
                          getOptionLabel={(option) => option.name}
                          value={catalog.projects.find((project) => project.id === projectId) ?? null}
                          onChange={(_, project) => setProjectId(project?.id ?? null)}
                          renderInput={(fieldParams) => <TextField {...fieldParams} label="Project" />}
                        />
                      </Box>
                    ) : null}
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : null}
        </Box>
      </Paper>

      {run?.answerSpec ? (
        <Box sx={{ mb: 2 }}>
          <AnswerPanel answer={answer.data} loading={answer.isFetching} error={answer.isError} onShowPeople={showPeople} />
          {!peopleListVisible ? (
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
              <Button
                variant="outlined"
                startIcon={<BookmarkBorderIcon />}
                onClick={() => setSaveSource({ filters: run.filters, sort: run.sort, mode: run.mode, label: run.label, query: run.query, answerSpec: run.answerSpec })}
              >
                Save search
              </Button>
            </Stack>
          ) : null}
        </Box>
      ) : null}

      {data?.warnings.map((warning) => (
        <Alert key={warning} severity="warning" sx={{ mb: 1 }}>
          {warning}
        </Alert>
      ))}

      {run && peopleListVisible ? (
        <Box ref={resultsRef}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={1} sx={{ mb: 1 }}>
            <Box>
              <Typography variant="h6" component="h2" fontWeight={600}>
                {data
                  ? data.total === 0
                    ? 'No exact matches'
                    : `${data.total} ${data.total === 1 ? 'person matches' : 'people match'}${data.alternatives.length ? ' exactly' : ''}`
                  : 'Searching…'}
                <Chip size="small" sx={{ ml: 1 }} label={MODE_LABELS[run.mode]} color={run.mode === 'AI' ? 'secondary' : 'default'} />
                {data?.alternatives.length ? (
                  <Chip size="small" sx={{ ml: 1 }} color="warning" variant="outlined" label={`+ ${data.alternatives.length} alternatives below`} />
                ) : null}
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                {(data?.criteria.length ? data.criteria : ['No filters: everyone in your scope']).map((item) => (
                  <Chip key={item} size="small" variant="outlined" label={item} />
                ))}
              </Stack>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <TextField
                select
                size="small"
                label="Sort by"
                value={run.sort}
                sx={{ minWidth: 200 }}
                onChange={(event) => setRun({ ...run, sort: event.target.value as SearchSort, record: false })}
              >
                {(Object.keys(SORT_LABELS) as SearchSort[]).map((sort) => (
                  <MenuItem key={sort} value={sort}>
                    {SORT_LABELS[sort]}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="outlined"
                startIcon={<BookmarkBorderIcon />}
                onClick={() => setSaveSource({ filters: run.filters, sort: run.sort, mode: run.mode, label: run.label, query: run.query, answerSpec: run.answerSpec })}
              >
                Save search
              </Button>
              <ExportMenu getReport={buildReport} disabled={!data} />
            </Stack>
          </Stack>
          {data && data.total === 0 ? (
            <Alert severity="info" sx={{ mb: 1 }}>
              Nobody meets all of these criteria.{' '}
              {data.alternatives.length ? 'The closest alternatives are listed below; each shows what it does not meet. ' : ''}
              Remove or relax a criterion{run.mode === 'AI' ? ' with “Edit criteria”, or refine the question' : ''} to widen the search.
            </Alert>
          ) : null}
          {data && data.total === 0 && data.alternatives.length ? null : (
            <ResultsTable
              rows={data?.rows ?? []}
              total={data?.total ?? 0}
              page={page}
              size={size}
              sort={run.sort}
              loading={search.isFetching}
              showRelevance={showRelevance}
              onSort={(sort) => setRun({ ...run, sort, record: false })}
              onPage={setPage}
              onSize={(value) => {
                setSize(value);
                setPage(0);
              }}
              onOpen={setSelected}
            />
          )}
          <AlternativeResults
            items={data?.alternatives ?? []}
            exactCount={data?.total ?? 0}
            exceptionsOnly={run.answerSpec?.intent === 'DEMAND_MATCH'}
            onOpen={setSelected}
          />
        </Box>
      ) : null}

      <PersonDrawer row={selected} onClose={() => setSelected(null)} />
      <SavedSearchesDrawer
        open={savedOpen}
        onClose={() => setSavedOpen(false)}
        describe={(saved) => (catalog ? summarize(saved.filters, catalog).join(' · ') || 'Everyone in scope' : '')}
        onRun={(saved) => {
          touchSaved.mutate(saved.id);
          setEditingSaved(null);
          openSaved(saved);
          setSavedOpen(false);
        }}
        onEdit={(saved) => {
          setDraft(saved.filters);
          setTab('STRUCTURED');
          setEditingSaved(saved);
          setSavedOpen(false);
        }}
      />
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRun={(entry) => {
          openSaved(entry);
          setHistoryOpen(false);
        }}
        onSave={(entry) => {
          setSaveSource({ filters: entry.filters, sort: entry.sort, mode: entry.mode, label: entry.label, query: entry.query, answerSpec: entry.answerSpec ?? null });
          setHistoryOpen(false);
        }}
      />
      <SaveSearchDialog
        open={saveSource !== null}
        initialName={(saveSource?.label ?? '').replace(/^"|"$/g, '').slice(0, 80)}
        onClose={() => setSaveSource(null)}
        onSave={async (name) => {
          if (saveSource)
            await saveSearch.mutateAsync({ name, mode: saveSource.mode, filters: saveSource.filters, sort: saveSource.sort, query: saveSource.query, answerSpec: saveSource.answerSpec });
        }}
      />
    </Box>
  );
}

export default SearchDiscoveryPage;

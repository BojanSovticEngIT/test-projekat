import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import DataObjectIcon from '@mui/icons-material/DataObject';
import HistoryIcon from '@mui/icons-material/History';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SchemaOutlinedIcon from '@mui/icons-material/SchemaOutlined';
import SendIcon from '@mui/icons-material/Send';
import TuneIcon from '@mui/icons-material/Tune';
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
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WorkforcePageHeader } from '../../components/WorkforcePageHeader';
import ExportMenu from '../../components/ExportMenu/ExportMenu';
import AnswerPanel, { AiThinking } from '@features/intelligence/AnswerPanel';
import CriteriaForm from '@features/intelligence/CriteriaForm';
import { PersonDrawer, ResultsTable } from '@features/intelligence/SearchResults';
import { HistoryDrawer, SaveSearchDialog, SavedSearchesDrawer } from '@features/intelligence/SearchLibrary';
import {
  fetchSearch,
  useAnswer,
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
  InterpretResponse,
  IntelligenceCatalog,
  QueryAnswer,
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

const REFINE_EXAMPLES = ['only in Serbia', 'at least 50% free next month', 'senior only', 'with Azure experience'];

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
  return [
    { label: 'Eligible', value: `${answer.eligibleCount} of ${answer.evaluated}` },
    { label: 'Best score', value: answer.top[0] ? String(answer.top[0].score) : '—' }
  ];
};

function SearchDiscoveryPage(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
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
  const search = useSearch(run?.filters ?? null, run?.sort ?? 'RELEVANCE', page, size, run?.runId ?? 0);
  const answerRequest = useMemo(() => (run?.answerSpec ? { ...run.answerSpec, filters: run.filters } : null), [run]);
  const answer = useAnswer(answerRequest);

  const start = (next: Omit<Run, 'runId'>): void => {
    runCounter.current += 1;
    setRun({ ...next, runId: runCounter.current });
    setPage(0);
  };
  const labelFor = (filters: SearchFilters): string => (catalog ? summarize(filters, catalog).join(' · ') : '') || 'Everyone in scope';

  // First load: drill-down parameters from dashboards, otherwise browse everyone in scope.
  useEffect(() => {
    if (!catalog || run) return;
    const fromLink = filtersFromParams(params);
    if (fromLink) {
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
        ...(answer.data && answer.data.kind !== 'MATCH' ? [`Population: ${answer.data.population.definition}`] : []),
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
        description="Ask a question in plain English or Serbian, or search with filters. Find people, count them, compare technologies and match them to demands."
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
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
          <Chip size="small" color="primary" variant="outlined" label={`Searching: ${scope.label}`} />
          <Chip size="small" color="warning" variant="outlined" label="Demo data · simulated AI" />
          <Typography variant="body2" color="text.secondary">
            {scope.description} External applicants are never included.
          </Typography>
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
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'flex-start' }}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
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
                  <Stack direction={{ xs: 'row', md: 'column' }} spacing={1} sx={{ minWidth: 150 }}>
                    <Button type="submit" variant="contained" startIcon={<SendIcon />} disabled={!aiQuery.trim() || interpret.isPending}>
                      Ask
                    </Button>
                    <Button startIcon={<RestartAltIcon />} onClick={resetAi} disabled={interpret.isPending || (!aiQuery && !interpretation)}>
                      Clear
                    </Button>
                  </Stack>
                </Stack>
              </Box>

              {!interpretation && !interpret.isPending ? (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Suggested questions
                  </Typography>
                  <Grid container spacing={1.5} sx={{ mt: 0.25 }}>
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
                </Box>
              ) : null}

              <AiThinking active={interpret.isPending} />
              {interpret.isError ? (
                <Alert severity="error" action={<Button onClick={() => setTab('STRUCTURED')}>Use structured search</Button>}>
                  The AI service did not answer. Your previous results are still shown. Try again, or use structured search, which does not need AI.
                </Alert>
              ) : null}

              {interpretation && !interpret.isPending ? (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      What I understood
                    </Typography>
                    <Chip size="small" color="primary" label={`Intent: ${interpretation.intentLabel}`} />
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
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ my: 1.5 }}>
                    {interpretation.recognized.map((item) => (
                      <Chip
                        key={item}
                        color={item.startsWith('Optional:') ? 'success' : item.startsWith('Must-have:') ? 'error' : 'primary'}
                        variant={item.startsWith('Optional:') || item.startsWith('Must-have:') ? 'outlined' : 'filled'}
                        label={item}
                      />
                    ))}
                    {interpretation.notUnderstood.map((word) => (
                      <Chip key={word} color="warning" variant="outlined" label={`Not understood: ${word}`} />
                    ))}
                  </Stack>
                  {interpretation.notes.map((note) => (
                    <Typography key={note} variant="body2">
                      • {note}
                    </Typography>
                  ))}

                  <Box
                    component="form"
                    sx={{ mt: 2 }}
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

                  <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
                    <Button size="small" startIcon={<TuneIcon />} onClick={() => setShowEditor(!showEditor)} aria-expanded={showEditor}>
                      {showEditor ? 'Hide criteria' : 'Edit criteria'}
                    </Button>
                    <Button size="small" startIcon={<DataObjectIcon />} onClick={() => setShowJson(!showJson)} aria-expanded={showJson}>
                      {showJson ? 'Hide structured query' : 'Show structured query (JSON)'}
                    </Button>
                  </Stack>
                  <Collapse in={showJson}>
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
              <CriteriaForm catalog={catalog} filters={draft} onChange={setDraft} />
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => start({ filters: draft, sort: run?.sort ?? 'RELEVANCE', mode: 'STRUCTURED', label: labelFor(draft), query: null, answerSpec: editingSaved?.answerSpec ?? null, record: true })}
                >
                  Search
                </Button>
                <Button
                  disabled={isEmptyFilters(draft)}
                  onClick={() => {
                    setDraft(createEmptyFilters());
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
        </Box>
      ) : null}

      {data?.warnings.map((warning) => (
        <Alert key={warning} severity="warning" sx={{ mb: 1 }}>
          {warning}
        </Alert>
      ))}

      {run ? (
        <Box ref={resultsRef}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={1} sx={{ mb: 1 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {data ? `${data.total} ${data.total === 1 ? 'person' : 'people'}` : 'Searching…'}
                <Chip size="small" sx={{ ml: 1 }} label={MODE_LABELS[run.mode]} color={run.mode === 'AI' ? 'secondary' : 'default'} />
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
          {run.mode === 'AI' && data && data.total === 0 ? (
            <Alert severity="info" sx={{ mb: 1 }}>
              Nobody matches all of the understood criteria. Open “Edit criteria” above to relax one, or refine the question.
            </Alert>
          ) : null}
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

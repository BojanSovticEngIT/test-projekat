import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import HistoryIcon from '@mui/icons-material/History';
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
import { useSearchParams } from 'react-router-dom';
import { WorkforcePageHeader } from '../../components/WorkforcePageHeader';
import ExportMenu from '../../components/ExportMenu/ExportMenu';
import CriteriaForm from '@features/intelligence/CriteriaForm';
import { PersonDrawer, ResultsTable } from '@features/intelligence/SearchResults';
import { HistoryDrawer, SaveSearchDialog, SavedSearchesDrawer } from '@features/intelligence/SearchLibrary';
import { fetchSearch, useIntelligenceCatalog, useInterpret, useRecordRun, useSaveSearch, useSearch, useTouchSavedSearch } from '@features/intelligence/intelligenceApi';
import {
  MODE_LABELS,
  QUICK_SEARCHES,
  SENIORITY_LABELS,
  SORT_LABELS,
  STATUS_LABELS,
  createEmptyFilters,
  filtersFromParams,
  isEmptyFilters,
  levelLabel
} from '@features/intelligence/intelligenceModel';
import useAuthStore from '@store/authStore';
import type { Report } from '../../lib/export';
import type {
  InterpretResponse,
  IntelligenceCatalog,
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
  runId: number;
  // Only user-initiated runs go to history and usage; paging and sorting do not.
  record: boolean;
}

const AI_EXAMPLES = [
  'Find senior Java developers who have worked on payment integrations and are available for a new project.',
  'Show me employees who have been working on the same project for more than two years.',
  'Find people who have maintained the same skill for more than three years.',
  'Which employees have experience in technologies required for our new project?',
  'Kubernets engineer on bench'
];

const ENGINE_LABEL: Record<InterpretResponse['engine'], { label: string; color: 'secondary' | 'success' | 'warning' }> = {
  SIMULATED_AI: { label: 'Simulated AI (demo rule engine, no LLM connected)', color: 'secondary' },
  RULES_ONLY: { label: 'Answered without AI (smart routing)', color: 'success' },
  FALLBACK_CONVENTIONAL: { label: 'AI unavailable — keyword fallback', color: 'warning' }
};

export const summarize = (filters: SearchFilters, catalog: IntelligenceCatalog): string[] => {
  const name = (list: { id: string; name: string }[], id: string): string => list.find((item) => item.id === id)?.name ?? id;
  const out: string[] = [];
  if (filters.text.trim()) out.push(`"${filters.text.trim()}"`);
  filters.skills.forEach((skill) => out.push(`${name(catalog.skills, skill.skillId)} ≥ ${levelLabel(skill.minLevel)}${skill.minYears ? `, ${skill.minYears}+ y` : ''}`));
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
  filters.countries.forEach((country) => out.push(country));
  filters.seniority.forEach((value) => out.push(SENIORITY_LABELS[value]));
  if (filters.verticalId) out.push(`${name(catalog.verticals, filters.verticalId)} experience`);
  return out;
};

function SearchDiscoveryPage(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const [params] = useSearchParams();
  const catalogQuery = useIntelligenceCatalog();
  const catalog = catalogQuery.data;
  const [tab, setTab] = useState<SearchMode>('STRUCTURED');
  const [draft, setDraft] = useState<SearchFilters>(createEmptyFilters);
  const [run, setRun] = useState<Run | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [aiQuery, setAiQuery] = useState('');
  const [interpretation, setInterpretation] = useState<InterpretResponse | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SearchResultRow | null>(null);
  const [savedOpen, setSavedOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saveSource, setSaveSource] = useState<Omit<Run, 'runId' | 'record'> | null>(null);
  const [editingSaved, setEditingSaved] = useState<SavedSearch | null>(null);
  const runCounter = useRef(0);
  const recorded = useRef(new Set<number>());

  const interpret = useInterpret();
  const recordRun = useRecordRun();
  const saveSearch = useSaveSearch();
  const touchSaved = useTouchSavedSearch();
  const search = useSearch(run?.filters ?? null, run?.sort ?? 'RELEVANCE', page, size, run?.runId ?? 0);

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
      start({ filters: fromLink, sort: params.get('sort') === 'TENURE' ? 'TENURE' : params.get('sort') === 'EXPERIENCE' ? 'EXPERIENCE' : 'RELEVANCE', mode: 'STRUCTURED', label: `Drill-down: ${summarize(fromLink, catalog).join(' · ')}`, query: null, record: true });
    } else {
      start({ filters: createEmptyFilters(), sort: 'NAME', mode: 'STRUCTURED', label: 'Everyone in scope', query: null, record: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  useEffect(() => {
    if (!run?.record || !search.data || search.isPlaceholderData || recorded.current.has(run.runId)) return;
    recorded.current.add(run.runId);
    recordRun.mutate({ mode: run.mode, label: run.label, query: run.query, filters: run.filters, sort: run.sort, resultCount: search.data.total });
  }, [run, search.data, search.isPlaceholderData, recordRun]);

  const runAi = async (text: string): Promise<void> => {
    setAiQuery(text);
    if (!text.trim()) return;
    const result = await interpret.mutateAsync(text);
    setInterpretation(result);
    setDraft(result.filters);
    start({ filters: result.filters, sort: result.sort, mode: 'AI', label: `"${text.trim()}"`, query: text.trim(), record: true });
  };

  const openSaved = (saved: { filters: SearchFilters; sort: SearchSort; mode: SearchMode; query: string | null; name?: string; label?: string }): void => {
    setDraft(saved.filters);
    setTab(saved.mode);
    setAiQuery(saved.query ?? '');
    setInterpretation(null);
    start({ filters: saved.filters, sort: saved.sort, mode: saved.mode, label: saved.name ?? saved.label ?? labelFor(saved.filters), query: saved.query, record: true });
  };

  const data = search.data;
  const scope = catalog?.scope;
  const showRelevance = Boolean(run?.filters.skills.length);

  const buildReport = async (): Promise<Report> => {
    if (!run) throw new Error('Run a search first.');
    const all = await fetchSearch(run.filters, run.sort, 0, 500);
    const sensitive = all.scope.canSeeSeniority;
    return {
      title: 'Workforce search results',
      subtitle: `${MODE_LABELS[run.mode]} search${run.query ? `: "${run.query}"` : ''} · sorted by ${SORT_LABELS[all.sort]}`,
      generatedAt: new Date(),
      generatedBy: user?.username,
      criteria: all.criteria.length ? all.criteria : ['No filters: everyone in your scope'],
      notes: [`Scope: ${all.scope.label}`, 'Internal employees only. External applicants are never part of employee search.', ...(all.total > 500 ? ['Only the first 500 rows are exported.'] : [])],
      kpis: [
        { label: 'Results', value: String(all.total) },
        { label: 'On bench', value: String(all.rows.filter((row) => row.allocationStatus === 'BENCH').length) },
        { label: 'Availability date', value: all.targetDate }
      ],
      tables: [
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
            STATUS_LABELS[row.allocationStatus],
            row.availablePct,
            row.matchedSkills.map((skill) => `${skill.name} ${skill.level}/5`).join(', '),
            row.topSkills.map((skill) => `${skill.name} ${skill.level}/5`).join(', '),
            row.relevance,
            ...(sensitive ? [row.seniority, row.costCode] : [])
          ])
        }
      ],
      fileName: 'workforce-search'
    };
  };

  const quickProjectName = useMemo(() => catalog?.projects.find((project) => project.id === projectId)?.name, [catalog, projectId]);

  if (catalogQuery.isError) return <Alert severity="error">Workforce discovery is not available for your role.</Alert>;

  return (
    <Box>
      <WorkforcePageHeader
        title="Discovery"
        description="Find internal employees by skills, experience, projects and availability. Three ways to search, one result list."
        breadcrumbs={[{ label: 'Workforce Intelligence', to: '/intelligence' }, { label: 'Discovery' }]}
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
          <Chip size="small" color="warning" variant="outlined" label="Demo data" />
          <Typography variant="body2" color="text.secondary">
            {scope.description} External applicants are never included.
          </Typography>
        </Stack>
      ) : null}

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, value: SearchMode) => setTab(value)} aria-label="Search mode" variant="scrollable">
          <Tab value="STRUCTURED" icon={<TuneIcon />} iconPosition="start" label="Structured search" />
          <Tab value="QUICK" icon={<BoltOutlinedIcon />} iconPosition="start" label="Quick search" />
          <Tab value="AI" icon={<AutoAwesomeOutlinedIcon />} iconPosition="start" label="AI Quick Search" />
        </Tabs>
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          {tab === 'STRUCTURED' && catalog ? (
            <>
              {editingSaved ? (
                <Alert severity="info" sx={{ mb: 2 }} onClose={() => setEditingSaved(null)}>
                  Editing saved search "{editingSaved.name}". Change the criteria, then choose "Update saved search".
                </Alert>
              ) : null}
              <CriteriaForm catalog={catalog} filters={draft} onChange={setDraft} />
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button variant="contained" onClick={() => start({ filters: draft, sort: run?.sort ?? 'RELEVANCE', mode: 'STRUCTURED', label: labelFor(draft), query: null, record: true })}>
                  Search
                </Button>
                <Button
                  disabled={isEmptyFilters(draft)}
                  onClick={() => {
                    setDraft(createEmptyFilters());
                    start({ filters: createEmptyFilters(), sort: 'NAME', mode: 'STRUCTURED', label: 'Everyone in scope', query: null, record: false });
                  }}
                >
                  Clear all
                </Button>
                {editingSaved ? (
                  <Button
                    variant="outlined"
                    onClick={() =>
                      void saveSearch
                        .mutateAsync({ id: editingSaved.id, name: editingSaved.name, mode: editingSaved.mode, filters: draft, sort: run?.sort ?? editingSaved.sort, query: editingSaved.query })
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
                        start({ ...built, mode: 'QUICK', label: quick.needsProject ? `${quick.label}: ${quickProjectName}` : quick.label, query: null, record: true });
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

          {tab === 'AI' && catalog ? (
            <Stack spacing={2}>
              <Alert severity="info" icon={<AutoAwesomeOutlinedIcon />}>
                Describe who you need in plain words. The query is turned into structured criteria you can review and change. In this demo the interpretation is
                done by a deterministic rule engine that simulates an AI model; no AI service is called and costs are estimates.
              </Alert>
              <Box
                component="form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void runAi(aiQuery);
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    value={aiQuery}
                    onChange={(event) => setAiQuery(event.target.value)}
                    placeholder="e.g. Find senior Java developers who have worked on payment integrations and are available for a new project."
                    inputProps={{ 'aria-label': 'Natural-language query', maxLength: 500 }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void runAi(aiQuery);
                      }
                    }}
                  />
                  <Button type="submit" variant="contained" disabled={!aiQuery.trim() || interpret.isPending} sx={{ minWidth: 140 }}>
                    Interpret & search
                  </Button>
                </Stack>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  Examples:
                </Typography>
                {AI_EXAMPLES.map((example) => (
                  <Chip key={example} size="small" variant="outlined" label={example} onClick={() => void runAi(example)} sx={{ maxWidth: '100%' }} />
                ))}
              </Stack>
              {interpret.isError ? <Alert severity="error">The query could not be interpreted.</Alert> : null}
              {interpretation ? (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Interpreted criteria
                    </Typography>
                    <Chip size="small" color={ENGINE_LABEL[interpretation.engine].color} label={ENGINE_LABEL[interpretation.engine].label} />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={
                        interpretation.usage.inputTokens
                          ? `~${interpretation.usage.inputTokens} in / ${interpretation.usage.outputTokens} out tokens · est. $${interpretation.usage.estimatedCostUsd.toFixed(6)}`
                          : 'No AI tokens used · $0'
                      }
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {interpretation.engineNote}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ my: 1.5 }}>
                    {interpretation.recognized.map((item) => (
                      <Chip key={item} color="primary" label={item} />
                    ))}
                  </Stack>
                  {interpretation.notes.map((note) => (
                    <Typography key={note} variant="body2">
                      • {note}
                    </Typography>
                  ))}
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Review and change the criteria
                  </Typography>
                  <CriteriaForm catalog={catalog} filters={draft} onChange={setDraft} />
                  <Button
                    sx={{ mt: 2 }}
                    variant="contained"
                    onClick={() => start({ filters: draft, sort: run?.sort ?? interpretation.sort, mode: 'AI', label: `"${aiQuery.trim()}" (edited)`, query: aiQuery.trim(), record: true })}
                  >
                    Search with these criteria
                  </Button>
                </Paper>
              ) : null}
            </Stack>
          ) : null}
        </Box>
      </Paper>

      {data?.warnings.map((warning) => (
        <Alert key={warning} severity="warning" sx={{ mb: 1 }}>
          {warning}
        </Alert>
      ))}

      {run ? (
        <>
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
            <Stack direction="row" spacing={1} alignItems="center">
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
              <Button variant="outlined" startIcon={<BookmarkBorderIcon />} onClick={() => setSaveSource({ filters: run.filters, sort: run.sort, mode: run.mode, label: run.label, query: run.query })}>
                Save search
              </Button>
              <ExportMenu getReport={buildReport} disabled={!data} />
            </Stack>
          </Stack>
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
        </>
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
          setSaveSource({ filters: entry.filters, sort: entry.sort, mode: entry.mode, label: entry.label, query: entry.query });
          setHistoryOpen(false);
        }}
      />
      <SaveSearchDialog
        open={saveSource !== null}
        initialName={(saveSource?.label ?? '').replace(/^"|"$/g, '').slice(0, 80)}
        onClose={() => setSaveSource(null)}
        onSave={async (name) => {
          if (saveSource) await saveSearch.mutateAsync({ name, mode: saveSource.mode, filters: saveSource.filters, sort: saveSource.sort, query: saveSource.query });
        }}
      />
    </Box>
  );
}

export default SearchDiscoveryPage;

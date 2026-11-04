import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  InputAdornment,
  LinearProgress,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { WorkforcePageHeader } from '../../components/WorkforcePageHeader';
import SearchFiltersPanel, { levelLabel } from '@features/search/SearchFiltersPanel';
import SearchResultCard from '@features/search/SearchResultCard';
import { useParseQuery, useSearchCatalog, useSearchPeople } from '@features/search/searchApi';
import { createEmptyFilters, EXAMPLE_QUERIES, hasActiveFilters, SENIORITY_LABELS } from '@features/search/searchFilters';
import type { SearchCatalog, SearchFilters } from '../../types/search.types';

const PAGE_SIZE = 10;

interface ActiveChip {
  key: string;
  label: string;
  clear: (filters: SearchFilters) => SearchFilters;
}

const activeChips = (filters: SearchFilters, catalog: SearchCatalog): ActiveChip[] => {
  const skillName = (id: string): string => catalog.skills.find((skill) => skill.id === id)?.name ?? id;
  const chips: ActiveChip[] = filters.skills.map((criterion) => ({
    key: `skill-${criterion.skillId}`,
    label: `${skillName(criterion.skillId)} ≥ ${levelLabel(criterion.minLevel)} · ${criterion.mustHave ? 'must-have' : 'nice to have'}`,
    clear: (current) => ({ ...current, skills: current.skills.filter((item) => item.skillId !== criterion.skillId) })
  }));
  filters.countries.forEach((country) =>
    chips.push({ key: `country-${country}`, label: `Country: ${country}`, clear: (current) => ({ ...current, countries: current.countries.filter((item) => item !== country) }) })
  );
  if (filters.unitId) {
    chips.push({ key: 'unit', label: `Unit: ${catalog.units.find((unit) => unit.id === filters.unitId)?.label}`, clear: (current) => ({ ...current, unitId: null }) });
  }
  if (filters.verticalId) {
    chips.push({ key: 'vertical', label: `Industry: ${catalog.verticals.find((item) => item.id === filters.verticalId)?.name}`, clear: (current) => ({ ...current, verticalId: null }) });
  }
  if (filters.minAvailablePct !== null) {
    chips.push({ key: 'availability', label: `≥ ${filters.minAvailablePct}% free`, clear: (current) => ({ ...current, minAvailablePct: null }) });
  }
  if (filters.availableFrom) {
    chips.push({ key: 'date', label: `Needed from ${filters.availableFrom}`, clear: (current) => ({ ...current, availableFrom: null }) });
  }
  filters.seniority.forEach((value) =>
    chips.push({ key: `seniority-${value}`, label: `Seniority: ${SENIORITY_LABELS[value]}`, clear: (current) => ({ ...current, seniority: current.seniority.filter((item) => item !== value) }) })
  );
  if (filters.keywords.trim()) {
    chips.push({ key: 'keywords', label: `Text: "${filters.keywords.trim()}"`, clear: (current) => ({ ...current, keywords: '' }) });
  }
  if (catalog.scope.canSeeExternal && !filters.includeExternal) {
    chips.push({ key: 'external', label: 'Internal staff only', clear: (current) => ({ ...current, includeExternal: true }) });
  }
  return chips;
};

function SearchDiscoveryPage(): JSX.Element {
  const catalogQuery = useSearchCatalog();
  const catalog = catalogQuery.data;
  const parse = useParseQuery();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const search = useSearchPeople(filters, page, PAGE_SIZE);

  useEffect(() => {
    if (catalog && filters === null) setFilters(createEmptyFilters(catalog.scope.canSeeExternal));
  }, [catalog, filters]);

  const updateFilters = (next: SearchFilters): void => {
    setFilters(next);
    setPage(0);
  };

  const runQuery = async (text: string): Promise<void> => {
    setQuery(text);
    if (!catalog) return;
    if (!text.trim()) {
      setNotes([]);
      updateFilters(createEmptyFilters(catalog.scope.canSeeExternal));
      return;
    }
    const result = await parse.mutateAsync(text);
    setNotes(result.notes);
    updateFilters(result.filters);
  };

  const chips = useMemo(() => (filters && catalog ? activeChips(filters, catalog) : []), [filters, catalog]);
  const data = search.data;

  if (catalogQuery.isError) {
    return <Alert severity="error">Search & Discovery is not available for your role.</Alert>;
  }

  return (
    <Box>
      <WorkforcePageHeader
        title="Search & Discovery"
        description="Find the right people by skills, project experience and availability. Type what you need in plain words, then refine."
        breadcrumbs={[{ label: 'Search & Discovery' }]}
      />

      {catalog ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
          <Chip size="small" color="primary" variant="outlined" label={`You are searching: ${catalog.scope.label}`} title={catalog.scope.description} />
          <Chip size="small" color="warning" variant="outlined" label="Demo data" />
          <Typography variant="body2" color="text.secondary">
            {catalog.scope.description}
          </Typography>
        </Stack>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            void runQuery(query);
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              fullWidth
              size="small"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. Senior Java and Kafka developer in Serbia, 50% available next month"
              inputProps={{ 'aria-label': 'Describe who you are looking for', maxLength: 500 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
            <Button type="submit" variant="contained" disabled={!catalog || parse.isPending}>
              Search
            </Button>
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            Try:
          </Typography>
          {EXAMPLE_QUERIES.map((example) => (
            <Chip key={example} size="small" variant="outlined" label={example} onClick={() => void runQuery(example)} />
          ))}
        </Stack>
      </Paper>

      {notes.length > 0 ? (
        <Alert severity="info" onClose={() => setNotes([])} sx={{ mb: 2 }}>
          <Typography variant="subtitle2">How we read your search</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </Box>
        </Alert>
      ) : null}

      {filters && catalog ? (
        <>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
            {chips.map((chip) => (
              <Chip key={chip.key} label={chip.label} color="primary" onDelete={() => updateFilters(chip.clear(filters))} />
            ))}
            {hasActiveFilters(filters, catalog) ? (
              <Button
                size="small"
                onClick={() => {
                  setQuery('');
                  setNotes([]);
                  updateFilters(createEmptyFilters(catalog.scope.canSeeExternal));
                }}
              >
                Clear all
              </Button>
            ) : null}
          </Stack>

          <Accordion variant="outlined" disableGutters sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TuneIcon fontSize="small" />
                <Typography>Refine filters</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <SearchFiltersPanel catalog={catalog} filters={filters} onChange={updateFilters} />
            </AccordionDetails>
          </Accordion>
        </>
      ) : null}

      {search.isFetching || catalogQuery.isLoading || parse.isPending ? <LinearProgress sx={{ mb: 1 }} /> : null}

      {data?.warnings.map((warning) => (
        <Alert key={warning} severity="warning" sx={{ mb: 1 }}>
          {warning}
        </Alert>
      ))}

      {data ? (
        <>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {data.total} {data.total === 1 ? 'person' : 'people'}
              {data.fullMatches + data.partialMatches > 0 ? ` · ${data.fullMatches} full match · ${data.partialMatches} partial` : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Score = {[
                data.weights.skills ? `skills ${data.weights.skills}%` : null,
                `availability ${data.weights.availability}%`,
                data.weights.experience ? `project experience ${data.weights.experience}%` : null,
                data.weights.recency ? `recent use ${data.weights.recency}%` : null
              ]
                .filter(Boolean)
                .join(' · ')}
            </Typography>
          </Stack>

          {data.total === 0 ? (
            <Alert severity="info">No one matches all filters. Remove a filter chip above to widen the search.</Alert>
          ) : (
            <Stack spacing={1.5}>
              {data.results.map((result) => (
                <SearchResultCard key={result.id} result={result} weights={data.weights} />
              ))}
            </Stack>
          )}

          {data.total > PAGE_SIZE ? (
            <Stack alignItems="center" sx={{ mt: 2 }}>
              <Pagination count={Math.ceil(data.total / PAGE_SIZE)} page={page + 1} onChange={(_, value) => setPage(value - 1)} />
            </Stack>
          ) : null}
        </>
      ) : null}
    </Box>
  );
}

export default SearchDiscoveryPage;

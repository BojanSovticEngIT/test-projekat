import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkforcePageHeader } from '../../../components/WorkforcePageHeader';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useDeleteSavedSearch, useIntelligenceCatalog, useSavedSearches } from '@features/intelligence/intelligenceApi';
import { MODE_LABELS } from '@features/intelligence/intelligenceModel';
import { summarize } from '../../SearchDiscovery';
import type { QueryIntent, SavedSearch } from '../../../types/intelligence.types';

// What a saved search answers when it runs again.
const ANSWER_LABELS: Record<QueryIntent, string> = {
  EMPLOYEE_SEARCH: 'People',
  AVAILABILITY: 'People (availability)',
  WORKFORCE_COUNT: 'Count',
  WORKFORCE_PERCENTAGE: 'Percentage',
  TECHNOLOGY_COMPARISON: 'Technology comparison',
  PROJECT_TENURE: 'Project tenure',
  SKILL_DURATION: 'Skill duration',
  DEMAND_MATCH: 'Demand match',
  DEMAND_SEARCH: 'Demands',
  APPLICANT_COUNT: 'Recruiting figure'
};

const formatDate = (value: string | null): string => (value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never');

function SavedSearchesPage(): JSX.Element {
  const navigate = useNavigate();
  const catalog = useIntelligenceCatalog().data;
  const saved = useSavedSearches();
  const remove = useDeleteSavedSearch();
  const [deleting, setDeleting] = useState<SavedSearch | null>(null);

  const run = (item: SavedSearch): void => navigate('/search', { state: { savedSearch: item } });

  return (
    <Box>
      <WorkforcePageHeader
        title="Saved searches"
        description="Searches you saved in Search & Discovery. Running one applies the saved criteria to the current data, with your current access."
        breadcrumbs={[{ label: 'Workforce Intelligence', to: '/intelligence' }, { label: 'Saved searches' }]}
        actions={
          <Button variant="outlined" onClick={() => navigate('/search')}>
            Open Search & Discovery
          </Button>
        }
      />
      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        Demo: saved searches are kept in this browser for your user. In production they are stored in the database.
      </Alert>
      {saved.isLoading ? <LinearProgress /> : null}
      {saved.isError ? <Alert severity="error">Saved searches are not available for your role.</Alert> : null}
      {saved.data && !saved.data.length ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" gutterBottom>
            No saved searches yet. Run a search in Search & Discovery and choose &ldquo;Save search&rdquo;.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/search')}>
            Go to Search & Discovery
          </Button>
        </Paper>
      ) : null}
      {saved.data?.length ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="Saved searches">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Criteria</TableCell>
                <TableCell>Answer</TableCell>
                <TableCell>Last run</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {saved.data.map((item) => {
                const criteria = catalog ? summarize(item.filters, catalog) : [];
                return (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ minWidth: 180 }}>
                      <Typography fontWeight={600}>{item.name}</Typography>
                      <Chip size="small" label={MODE_LABELS[item.mode]} color={item.mode === 'AI' ? 'secondary' : 'default'} sx={{ mt: 0.5 }} />
                    </TableCell>
                    <TableCell>
                      {item.query ? (
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          &ldquo;{item.query}&rdquo;
                        </Typography>
                      ) : null}
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {(criteria.length ? criteria : ['No filters: everyone in scope']).map((label) => (
                          <Chip key={label} size="small" variant="outlined" label={label} />
                        ))}
                        {item.answerSpec?.demandId ? <Chip size="small" variant="outlined" label={`Demand ${item.answerSpec.demandId}`} /> : null}
                      </Stack>
                    </TableCell>
                    <TableCell>{item.answerSpec ? ANSWER_LABELS[item.answerSpec.intent] : 'People'}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(item.lastRunAt)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Saved {formatDate(item.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Button size="small" variant="contained" startIcon={<PlayArrowIcon />} onClick={() => run(item)}>
                        Run
                      </Button>
                      <Tooltip title="Delete">
                        <IconButton aria-label={`Delete ${item.name}`} onClick={() => setDeleting(item)}>
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete saved search"
        message={`Delete "${deleting?.name ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id, { onSettled: () => setDeleting(null) });
        }}
      />
    </Box>
  );
}

export default SavedSearchesPage;

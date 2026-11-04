import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import {
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import type { AlternativeResult, PersonSkillView, SearchResultRow, SearchSort } from '../../types/intelligence.types';
import { SENIORITY_LABELS, STATUS_LABELS, yearsText } from './intelligenceModel';

const STATUS_COLOR = { BENCH: 'success', PARTIAL: 'warning', FULL: 'default' } as const;

export function SkillChip({ skill }: { skill: PersonSkillView }): JSX.Element {
  const verified = skill.evidence === 'VALIDATED' || skill.certified;
  return (
    <Tooltip
      title={`${skill.evidence === 'VALIDATED' ? 'Approved by manager' : 'Not yet verified'}${skill.certified ? ', backed by a valid certificate' : ''}. Experience: ${
        skill.years === null ? 'start date unknown' : `${skill.years} years${skill.yearsQuality === 'ESTIMATED' ? ' (estimated from project history)' : ''}`
      }`}
    >
      <Chip
        size="small"
        variant={verified ? 'filled' : 'outlined'}
        color={verified ? 'primary' : 'default'}
        icon={verified ? <VerifiedOutlinedIcon /> : undefined}
        label={`${skill.name} ${skill.level}/5 · ${yearsText(skill.years, skill.yearsQuality)}`}
      />
    </Tooltip>
  );
}

interface TableProps {
  rows: SearchResultRow[];
  total: number;
  page: number;
  size: number;
  sort: SearchSort;
  loading: boolean;
  showRelevance: boolean;
  onSort: (sort: SearchSort) => void;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
  onOpen: (row: SearchResultRow) => void;
}

const SORTABLE: { label: string; sort: SearchSort | null }[] = [
  { label: 'Name', sort: 'NAME' },
  { label: 'Business unit / team', sort: null },
  { label: 'Current project', sort: 'TENURE' },
  { label: 'Allocation', sort: 'AVAILABILITY' },
  { label: 'Skills', sort: 'EXPERIENCE' }
];

export function ResultsTable({ rows, total, page, size, sort, loading, showRelevance, onSort, onPage, onSize, onOpen }: TableProps): JSX.Element {
  return (
    <TableContainer component={Paper} variant="outlined">
      {loading ? <LinearProgress /> : null}
      <Table size="small" aria-label="Search results">
        <TableHead>
          <TableRow>
            {SORTABLE.map((column) => (
              <TableCell key={column.label}>
                {column.sort ? (
                  <TableSortLabel active={sort === column.sort} direction={column.sort === 'NAME' ? 'asc' : 'desc'} onClick={() => onSort(column.sort as SearchSort)}>
                    {column.label}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </TableCell>
            ))}
            {showRelevance ? (
              <TableCell align="right">
                <TableSortLabel active={sort === 'RELEVANCE'} direction="desc" onClick={() => onSort('RELEVANCE')}>
                  Relevance
                </TableSortLabel>
              </TableCell>
            ) : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {!loading && rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>
                <Box sx={{ py: 5, textAlign: 'center' }}>
                  <InboxOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                  <Typography color="text.secondary">No one matches these criteria. Remove a criterion, lower a level or year threshold, or pick a later date.</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : null}
          {rows.map((row) => (
            <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => onOpen(row)}>
              <TableCell>
                <Typography fontWeight={600}>{row.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {row.title} · {row.location}
                  {row.seniority ? ` · ${SENIORITY_LABELS[row.seniority]}` : ''}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{row.businessUnit ?? '—'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {row.team ?? ''}
                </Typography>
              </TableCell>
              <TableCell>
                {row.currentProject ? (
                  <>
                    <Typography variant="body2">{row.currentProject.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {row.currentProject.tenureYears} y on project (since {row.currentProject.since}) · {row.currentProject.pct}%
                    </Typography>
                    {row.currentProject.endDate ? (
                      <Typography variant="caption" color="text.secondary">
                        Ends {row.currentProject.endDate}
                      </Typography>
                    ) : null}
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No current project
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Chip size="small" color={STATUS_COLOR[row.allocationStatus]} label={STATUS_LABELS[row.allocationStatus]} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {row.availabilityLabel}
                </Typography>
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {(row.matchedSkills.length ? row.matchedSkills : row.topSkills.slice(0, 3)).map((skill) => (
                    <SkillChip key={skill.skillId} skill={skill} />
                  ))}
                </Stack>
              </TableCell>
              {showRelevance ? (
                <TableCell align="right">
                  <Typography fontWeight={700}>{row.relevance ?? '—'}</Typography>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={size}
        rowsPerPageOptions={[10, 20, 50]}
        onPageChange={(_, value) => onPage(value)}
        onRowsPerPageChange={(event) => onSize(Number(event.target.value))}
      />
    </TableContainer>
  );
}

export function PersonDrawer({ row, onClose }: { row: SearchResultRow | null; onClose: () => void }): JSX.Element {
  return (
    <Drawer anchor="right" open={row !== null} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 520 } } }}>
      {row ? (
        <Box sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h5" component="h2">
                {row.name}
              </Typography>
              <Typography color="text.secondary">{row.title}</Typography>
            </Box>
            <IconButton aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {[row.businessUnit, row.team, row.location].filter(Boolean).join(' · ')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Line manager: {row.lineManager ?? '—'}
            {row.seniority ? ` · Seniority: ${SENIORITY_LABELS[row.seniority]}` : ''}
            {row.costCode ? ` · Cost code: ${row.costCode}` : ''}
          </Typography>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2">Allocation</Typography>
          <Typography variant="body2">
            {STATUS_LABELS[row.allocationStatus]} — {row.allocatedPct}% allocated, {row.availabilityLabel}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {row.currentProject
              ? `Current project: ${row.currentProject.name}${row.currentProject.client ? ` (${row.currentProject.client})` : ''}, ${row.currentProject.role}, since ${row.currentProject.since} — ${row.currentProject.tenureYears} years`
              : 'No current project.'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total project experience: {row.totalProjectYears} years on {row.projectCount} project{row.projectCount === 1 ? '' : 's'}
          </Typography>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Skills
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {[...row.matchedSkills, ...row.topSkills].map((skill) => (
              <SkillChip key={skill.skillId} skill={skill} />
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Filled chip = approved by manager or certified. "~" = years estimated from project history; "unknown" = no experience start date recorded.
          </Typography>

          {row.reasons.length ? (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Why this result (relevance {row.relevance})
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {row.reasons.map((reason) => (
                  <Typography component="li" variant="body2" key={reason}>
                    {reason}
                  </Typography>
                ))}
              </Box>
            </>
          ) : null}

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Project history
          </Typography>
          {row.projects.length ? (
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {row.projects.map((project) => (
                <Typography component="li" variant="body2" key={`${project.projectId}-${project.startDate}`}>
                  {project.name}
                  {project.client ? `, ${project.client}` : ''}
                  {project.vertical ? ` (${project.vertical})` : ''} — {project.role}, {project.startDate} – {project.endDate ?? 'ongoing'}
                  {project.current ? ' · current' : ''}
                </Typography>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No project assignments recorded.
            </Typography>
          )}
        </Box>
      ) : null}
    </Drawer>
  );
}

// Suggestions that do NOT meet every criterion. Kept visually apart from exact results and always say what is missing.
export function AlternativeResults({
  items,
  exactCount,
  exceptionsOnly,
  onOpen
}: {
  items: AlternativeResult[];
  exactCount: number;
  // In must-have matching an alternative can only ever be an exception, never a match.
  exceptionsOnly: boolean;
  onOpen: (row: SearchResultRow) => void;
}): JSX.Element | null {
  if (!items.length) return null;
  const title = exceptionsOnly
    ? 'Possible exceptions: not valid matches'
    : exactCount === 0
      ? 'No exact matches. These people come close'
      : `Only ${exactCount} exact ${exactCount === 1 ? 'match' : 'matches'}. You could also consider`;
  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2, borderStyle: 'dashed', borderColor: 'warning.main' }} aria-label="Alternative suggestions">
      <Stack direction="row" spacing={1} alignItems="center">
        <LightbulbOutlinedIcon color="warning" />
        <Typography variant="subtitle1" fontWeight={600}>
          {title}
        </Typography>
        <Chip size="small" color="warning" variant="outlined" label={`${items.length} alternative${items.length === 1 ? '' : 's'}`} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
        {exceptionsOnly
          ? 'Each of them misses at least one must-have criterion. Use them only as a deliberate exception.'
          : 'Alternatives, not exact matches: each one misses at least one of your criteria (shown in orange). Change that criterion above to include them in the results.'}
      </Typography>
      <Stack divider={<Divider flexItem />} spacing={1.25}>
        {items.map(({ row, because, differences }) => (
          <Stack key={row.id} direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'flex-start' }}>
            <Box sx={{ minWidth: 220, cursor: 'pointer' }} onClick={() => onOpen(row)}>
              <Typography fontWeight={600} sx={{ textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                {row.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {row.title} · {row.location}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {STATUS_LABELS[row.allocationStatus]} · {row.availabilityLabel}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Suggested because:</strong> {because}
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {differences.map((difference) => (
                  <Chip key={difference} size="small" color="warning" variant="outlined" label={`✗ ${difference}`} />
                ))}
                {(row.matchedSkills.length ? row.matchedSkills : row.topSkills.slice(0, 2)).map((skill) => (
                  <SkillChip key={skill.skillId} skill={skill} />
                ))}
              </Stack>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

import { useState, type ReactNode } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Collapse, Divider, IconButton, MenuItem, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { StatusChip, WorkforcePageHeader } from '../../components';
import { useAddDemandNote, useDemand } from '../../features/demand/demandApi';
import { CEFR, describeHistory, formatDate, formatDateTime, LEVELS, STATUS_LABELS } from '../../features/demand/demandFormat';
import AddCandidateDialog from '../../features/demand/AddCandidateDialog';
import CandidateList from '../../features/demand/CandidateList';
import CancelPositionsDialog from '../../features/demand/CancelPositionsDialog';
import HoldDemandDialog from '../../features/demand/HoldDemandDialog';
import { useHoldDemand } from '../../features/demand/demandApi';
import AddPositionsDialog from '../../features/demand/AddPositionsDialog';
import { DEMAND_MOCKS_ENABLED } from '../../features/demand/mockMode';
import { MEETING_USERS } from '../../features/demand/meetingOptions';
import PositionsBar from '../../features/demand/PositionsBar';
import { NoteForm, NoteList } from '../../features/demand/Notes';
import { useToast } from '../../lib/ToastProvider';
import useAuthStore from '@store/authStore';
import { UserRole } from '../../types/enums';
import type { DemandDetail } from '../../types/demand.types';

type DetailTab = 'candidates' | 'history';

const parseTab = (value: string | null): DetailTab => (value === 'history' ? 'history' : 'candidates');

const SectionTitle = ({ children }: { children: string }): JSX.Element => (
  <Typography variant="overline" color="text.secondary" component="h3" sx={{ display: 'block' }}>
    {children}
  </Typography>
);

const HeadcountStat = ({ value, label, color }: { value: number; label: string; color?: string }): JSX.Element => (
  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
    <Typography variant="h5" component="span" fontWeight={700} color={color}>
      {value}
    </Typography>
    <Typography component="span" color="text.secondary">
      {label}
    </Typography>
  </Box>
);

const HeadcountCard = ({ demand }: { demand: DemandDetail }): JSX.Element => (
  <Paper variant="outlined" aria-label="Positions" sx={{ p: 2, mb: 3 }}>
    <Stack direction="row" useFlexGap flexWrap="wrap" columnGap={3.5} rowGap={1} sx={{ mb: 1.5 }}>
      <HeadcountStat value={demand.requestedPositions} label="requested" />
      <HeadcountStat value={demand.filledPositions} label="filled" color="success.main" />
      <HeadcountStat value={demand.cancelledPositions} label="cancelled" />
      <HeadcountStat value={Math.max(0, demand.openPositions)} label="open" color="info.main" />
      <HeadcountStat value={demand.activeCandidates} label="candidates in process" />
    </Stack>
    <PositionsBar demand={demand} />
  </Paper>
);

interface CandidatesPanelProps {
  demand: DemandDetail;
  canEdit: boolean;
  canNote: boolean;
  canAddCandidate: boolean;
  canViewAs: boolean;
  onEdit: () => void;
}

const CandidatesPanel = ({ demand, canEdit, canNote, canAddCandidate, canViewAs, onEdit }: CandidatesPanelProps): JSX.Element => {
  const [addOpen, setAddOpen] = useState(false);
  // `viewAs` is empty in real mode: the "View as (mock)" selector is hidden there.
  const [viewAs, setViewAs] = useState('');
  return (
    <>
      <HeadcountCard demand={demand} />
      <DemandInfoPanel demand={demand} canEdit={canEdit} canNote={canNote} onEdit={onEdit} />
      <Box component="section" aria-labelledby="candidates-heading" sx={{ mt: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography id="candidates-heading" variant="h6" component="h2">
            Candidates
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {canViewAs && DEMAND_MOCKS_ENABLED ? (
              <TextField
                select
                size="small"
                label="View as (mock)"
                value={viewAs}
                onChange={(event) => setViewAs(event.target.value)}
                helperText="Demo only. Acts as a participant, with that person's rights only. It is not a login."
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="">Myself</MenuItem>
                {MEETING_USERS.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            {canAddCandidate && !viewAs ? (
              <Button variant="outlined" size="small" onClick={() => setAddOpen(true)}>
                Add candidate
              </Button>
            ) : null}
          </Stack>
        </Stack>
        <CandidateList demandId={demand.id} canEdit={canEdit} canNote={canNote} defaultSentTo={demand.interviewers?.[0] || demand.requestedBy} defaultExternal={demand.interviewers?.[0] ? `${demand.interviewers[0]} (client)` : ''} viewAs={viewAs || undefined}
          placement={{ openPositions: demand.openPositions, startDate: demand.wantedStartDate, allocationPct: demand.allocationPct }}
        />
      </Box>
      <AddCandidateDialog demand={addOpen && canAddCandidate && !viewAs ? demand : null} onClose={() => setAddOpen(false)} />
    </>
  );
};

const Card = ({
  title,
  action,
  children,
  collapsible = false
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
}): JSX.Element => {
  const [open, setOpen] = useState(true);
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        onClick={collapsible ? () => setOpen((value) => !value) : undefined}
        sx={collapsible ? { cursor: 'pointer', userSelect: 'none' } : undefined}
      >
        <Stack direction="row" alignItems="center" spacing={0.5}>
          {collapsible && (
            <IconButton size="small" aria-label={open ? 'Collapse details' : 'Expand details'} aria-expanded={open}>
              <ExpandMoreIcon sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </IconButton>
          )}
          <SectionTitle>{title}</SectionTitle>
        </Stack>
        <Box onClick={(event) => event.stopPropagation()}>{action}</Box>
      </Stack>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ mt: 1.5 }}>{children}</Box>
      </Collapse>
    </Paper>
  );
};

const Section = ({ title, children }: { title: string; children: ReactNode }): JSX.Element => (
  <Stack spacing={1.5} sx={{ minWidth: 0 }}>
    <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700 }}>
      {title}
    </Typography>
    {children}
  </Stack>
);

const Field = ({ label, children }: { label: string; children: ReactNode }): JSX.Element => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="caption" color="text.secondary" component="div">
      {label}
    </Typography>
    <Typography variant="body2" component="div" sx={{ overflowWrap: 'anywhere' }}>
      {children}
    </Typography>
  </Box>
);

interface DemandInfoPanelProps {
  demand: DemandDetail;
  canEdit: boolean;
  canNote: boolean;
  onEdit: () => void;
}

const DemandInfoPanel = ({ demand, canEdit, canNote, onEdit }: DemandInfoPanelProps): JSX.Element => {
  const addDemandNote = useAddDemandNote();
  const languages = demand.skills.filter((skill) => skill.category === 'Languages');
  const skills = demand.skills.filter((skill) => skill.category !== 'Languages');

  const chips = (items: DemandDetail['skills'], emphasis = false): ReactNode =>
    items.length === 0 ? (
      'None'
    ) : (
      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
        {items.map((skill) => (
          <Chip
            key={skill.name}
            label={skill.level ? `${skill.name} · ${LEVELS[skill.level]}` : skill.name}
            size="small"
            variant="outlined"
            title={emphasis ? (skill.mustHave ? 'Must have' : 'Nice to have') : undefined}
            sx={emphasis && skill.mustHave ? { fontWeight: 700 } : undefined}
          />
        ))}
      </Stack>
    );
  const cost =
    demand.maxRangeCode || demand.maxDailyRate
      ? [
          demand.maxRangeCode ? `Max range ${demand.maxRangeCode}` : null,
          demand.maxDailyRate ? `max ${demand.maxDailyRate} EUR per day` : null
        ]
          .filter(Boolean)
          .join(', ')
      : 'Not set';

  return (
    <Stack spacing={2.25}>
      <Card
        title="Demand details"
        collapsible
        action={
          canEdit ? (
            <Button size="small" onClick={onEdit}>
              Edit demand
            </Button>
          ) : undefined
        }
      >
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' } }}>
          <Section title="Role">
            <Field label="Workforce ID">
              {demand.externalId ? <span style={{ fontFamily: 'monospace' }}>{demand.externalId}</span> : 'Not set'}
            </Field>
            <Field label="Role">{demand.title}</Field>
            <Field label="Seniority">{demand.seniority || 'Not set'}</Field>
            <Field label="Allocation">{demand.allocationPct}% per person</Field>
            <Field label="Cost">{cost}</Field>
          </Section>

          <Section title="Project">
            <Field label="Client">{demand.clientName || 'Not set'}</Field>
            <Field label="Project name">{demand.projectName || 'Not set'}</Field>
            <Field label="Horizontal">{demand.horizontals.join(', ') || 'Not set'}</Field>
            <Field label="Vertical">{demand.verticals.join(', ') || 'Not set'}</Field>
            <Field label="Countries">{demand.countries?.length
                ? demand.countries.map((item) => (item.hrBusinessPartnerName ? `${item.country} (HRBP: ${item.hrBusinessPartnerName})` : item.country)).join(', ')
                : 'Any'}</Field>
          </Section>

          <Section title="Timeline">
            <Field label="Received">{formatDate(demand.receivedDate)}</Field>
            <Field label="Start date">{formatDate(demand.wantedStartDate)}</Field>
            <Field label="End date">{formatDate(demand.wantedEndDate)}</Field>
          </Section>

          <Section title="People">
            <Field label="Requested by">{demand.requestedBy}</Field>
            <Field label="Interviewers">
              {demand.interviewers?.length ? (
                <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                  {demand.interviewers.map((name) => (
                    <Chip key={name} label={name} size="small" />
                  ))}
                </Stack>
              ) : (
                'Not set'
              )}
            </Field>
          </Section>
        </Box>

        <Divider sx={{ my: 2.5 }} />

        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}>
          <Section title="Required skills">
            {chips(skills, true)}
            <Typography variant="caption" color="text.secondary" display="block">
              Module 1 skill catalog. Bold: must have.
            </Typography>
            {demand.missingSkills.length > 0 ? (
              <Stack direction="row" spacing={0.5} alignItems="center" useFlexGap flexWrap="wrap">
                <Typography variant="caption" color="text.secondary">
                  Not in the catalog yet:
                </Typography>
                {demand.missingSkills.map((name) => (
                  <Chip key={name} label={name} size="small" variant="outlined" sx={{ borderStyle: 'dashed' }} />
                ))}
              </Stack>
            ) : null}
          </Section>
          <Section title="Optional skills">{chips(demand.optionalSkills ?? [])}</Section>
          <Section title="Languages">
            {languages.length > 0 ? (
              <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                {languages.map((language) => (
                  <Chip
                    key={language.name}
                    size="small"
                    variant="outlined"
                    label={`${language.name}${language.level ? ` (${CEFR[language.level]})` : ''}`}
                  />
                ))}
              </Stack>
            ) : (
              'None'
            )}
          </Section>
        </Box>

        <Divider sx={{ my: 2.5 }} />

        <Section title="Project description">
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {demand.projectDescription || 'Not set'}
          </Typography>
        </Section>
      </Card>

      <Card title="Demand notes">
        {demand.notes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No notes.
          </Typography>
        ) : (
          <NoteList
            label="Demand notes"
            notes={demand.notes.map((note) => ({ id: note.id, author: note.author, at: note.createdAt, text: note.text }))}
          />
        )}
        {canNote ? <NoteForm label="Demand note" onSave={(text) => addDemandNote.mutateAsync({ id: demand.id, text })} /> : null}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Notes cannot be changed or deleted.
        </Typography>
      </Card>
    </Stack>
  );
};

const HISTORY_PREVIEW = 6;

const HistoryPanel = ({ demand }: { demand: DemandDetail }): JSX.Element => {
  const [showAllHistory, setShowAllHistory] = useState(false);
  const history = [...demand.history].sort((a, b) => b.changedAt.localeCompare(a.changedAt));
  const visibleHistory = showAllHistory ? history : history.slice(0, HISTORY_PREVIEW);

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Stack spacing={1.75}>
        <Card title="History">
          {history.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No history yet.
            </Typography>
          ) : (
            <Stack spacing={1.25}>
              {visibleHistory.map((entry) => (
                <Box key={entry.id} sx={{ pl: 1.5, borderLeft: 2, borderColor: 'divider' }}>
                  <Typography variant="body2">{describeHistory(entry)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {entry.changedBy}, {formatDateTime(entry.changedAt)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
          {history.length > HISTORY_PREVIEW ? (
            <Button size="small" sx={{ mt: 1 }} onClick={() => setShowAllHistory((value) => !value)}>
              {showAllHistory ? 'Show fewer' : `Show all ${history.length} entries`}
            </Button>
          ) : null}
        </Card>
      </Stack>
    </Box>
  );
};

function DemandDetailPage(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = useAuthStore((state) => state.user?.role);
  const isDemandManager = role === UserRole.ADMIN || role === UserRole.PMO;
  const { data: demand, isLoading, isError } = useDemand(id);
  const { showToast } = useToast();
  const [addPositionsOpen, setAddPositionsOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const resumeDemand = useHoldDemand();
  const [cancelPositionsOpen, setCancelPositionsOpen] = useState(false);
  const tab = parseTab(searchParams.get('tab'));

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Deleted demands stay hidden from everyone except the demand manager (D-07).
  if (isError || !demand || (demand.deleted && !isDemandManager)) {
    return (
      <Box>
        <Typography color="error">Demand not found.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/demands')}>
          Back to Demands
        </Button>
      </Box>
    );
  }

  const handleTabChange = (_: unknown, value: DetailTab): void => {
    const next = new URLSearchParams(searchParams);
    if (value === 'history') next.set('tab', 'history');
    else next.delete('tab');
    setSearchParams(next);
  };

  const canEdit = isDemandManager && !demand.deleted;
  // Demand manager and HR BP / recruiter add notes (N-07). Nobody adds notes to a deleted demand.
  const canNote = (isDemandManager || role === UserRole.HR_BUSINESS_PARTNER) && !demand.deleted;
  // R-01, R-02: the demand manager and the HR BP / recruiter add candidates.
  const canAddCandidate = (isDemandManager || role === UserRole.HR_BUSINESS_PARTNER) && !demand.deleted;
  const handleResume = async (): Promise<void> => {
    try {
      await resumeDemand.mutateAsync({ id: demand.id, action: 'resume' });
      showToast('Demand resumed.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to resume the demand.');
    }
  };

  return (
    <Box>
      <WorkforcePageHeader
        title={demand.title}
        breadcrumbs={[{ label: 'Demands', to: '/demands' }, { label: demand.code }]}
        actions={
          canEdit ? (
            <Stack direction="row" spacing={1}>
              {demand.status === 'ON_HOLD' ? (
                <Button variant="outlined" onClick={() => void handleResume()} disabled={resumeDemand.isPending}>
                  Resume
                </Button>
              ) : demand.status === 'IN_PROGRESS' ? (
                <Button variant="outlined" onClick={() => setHoldOpen(true)}>
                  Put on hold
                </Button>
              ) : null}
              {demand.openPositions > 0 ? (
                <Button variant="outlined" onClick={() => setCancelPositionsOpen(true)}>
                  Cancel positions
                </Button>
              ) : null}
              <Button variant="outlined" onClick={() => setAddPositionsOpen(true)}>
                Add positions
              </Button>
              <Button variant="outlined">New job posting</Button>
            </Stack>
          ) : undefined
        }
      />

      <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mb: 2 }}>
        {demand.deleted ? (
          <StatusChip status="DELETED" label="Deleted" />
        ) : (
          <StatusChip status={demand.status} label={STATUS_LABELS[demand.status]} />
        )}
        <Typography variant="body2">{demand.clientName || 'No client'}</Typography>
        <Typography variant="body2">{demand.projectName || 'Project not named'}</Typography>
        <Typography variant="body2">Start date {formatDate(demand.wantedStartDate)}</Typography>
      </Stack>

      {demand.deleted ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>Deleted.</strong> {demand.deletion?.reason ?? ''}
        </Alert>
      ) : null}

      {demand.status === 'ON_HOLD' && !demand.deleted ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>On hold.</strong> {demand.hold?.reason ?? ''}
          {demand.hold ? ` ${demand.hold.changedBy}, ${formatDateTime(demand.hold.changedAt)}` : ''}
        </Alert>
      ) : null}

      <Tabs value={tab} onChange={handleTabChange} aria-label="Demand pages" sx={{ mb: 3 }}>
        <Tab value="candidates" label="Candidates" />
        <Tab value="history" label="History" />
      </Tabs>

      {tab === 'history' ? (
        <HistoryPanel demand={demand} />
      ) : (
        <CandidatesPanel
          demand={demand}
          canEdit={canEdit}
          canNote={canNote}
          canAddCandidate={canAddCandidate}
          canViewAs={isDemandManager}
          onEdit={() => navigate(`/demands/${demand.id}/edit`)}
        />
      )}
      <HoldDemandDialog demand={holdOpen && demand.status === 'IN_PROGRESS' ? demand : null} onClose={() => setHoldOpen(false)} />
      <CancelPositionsDialog
        demand={cancelPositionsOpen && demand.openPositions > 0 ? demand : null}
        onClose={() => setCancelPositionsOpen(false)}
      />
      <AddPositionsDialog demand={addPositionsOpen ? demand : null} onClose={() => setAddPositionsOpen(false)} />
    </Box>
  );
}

export default DemandDetailPage;

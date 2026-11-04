import { useState } from 'react';
import axios from 'axios';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DriveFileMoveOutlinedIcon from '@mui/icons-material/DriveFileMoveOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  MenuItem,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Paper,
  Stack,
  Tooltip,
  Typography,
  type ChipProps
} from '@mui/material';
import type {
  CandidateParticipant,
  MeetingFeedbackRequest,
  CandidateStep,
  CandidateStepType,
  DemandCandidate
} from '../../types/demand.types';
import CandidateStepDialog from './CandidateStepDialog';
import StartDateDialog, { type PlacementDefaults } from './StartDateDialog';
import CvOutcomeDialog from './CvOutcomeDialog';
import WithdrawCandidateDialog from './WithdrawCandidateDialog';
import MeetingStepDialog from './MeetingStepDialog';
import { stepOutcomeBlocker, cvStepBlocker, isCandidateOpen, offerStepBlocker, placementBlocker } from './candidateRules';
import useAuthStore from '@store/authStore';
import { useToast } from '../../lib/ToastProvider';
import { actingParticipantId } from './meetingOptions';
import MoveCandidateDialog from './MoveCandidateDialog';
import { useAddCandidateNote, useAddMeetingFeedback, useAddStepNote, useDemandCandidates, useRemoveCandidate, useSetCandidatePipelineStatus } from './demandApi';
import { NoteForm, NoteList } from './Notes';
import { CANDIDATE_STATUS, OtherDemandsChip, OtherDemandsPopover } from './OtherDemands';
import { formatDate, formatDateTime, pluralize, PIPELINE_STATUS_LABELS, PIPELINE_STATUSES } from './demandFormat';

const STATUS = CANDIDATE_STATUS;

const NEGATIVE = new Set(['Rejected', 'Done: negative', 'Declined', 'Failed']);

const statusColor = (status: string): ChipProps['color'] =>
  NEGATIVE.has(status) ? 'error' : ['Cancelled', 'Withdrawn'].includes(status) ? 'default' : ['Approved', 'Done: positive', 'Accepted', 'Done', 'Confirmed'].includes(status) ? 'success' : 'info';

const initials = (name: string): string =>
  name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

const STEP_KIND: Record<CandidateStepType, string> = {
  CV: 'CV to client',
  MEETING: 'Meeting',
  OFFER: 'Offer, external only',
  CUSTOM: 'Custom step',
  START: 'Final step'
};

const formatWhen = (value?: string): string => {
  if (!value) return 'Not set';
  const [datePart, time] = value.split('T');
  return `${formatDate(datePart)}, ${time ?? ''}`;
};

const stepMeta = (step: CandidateStep): string => {
  switch (step.type) {
    case 'CV':
      return `Sent ${formatDate(step.date)}${step.sentTo ? ` to ${step.sentTo}` : ''} · by ${step.responsible}`;
    case 'MEETING':
      return `${formatWhen(step.when)} · organized by ${step.responsible}`;
    case 'OFFER':
      return `Sent ${formatDate(step.date)} · by ${step.responsible}`;
    case 'START':
      return `Start date ${formatDate(step.startDate)} · ${step.allocationPct}% allocation · confirmed by ${step.responsible}`;
    default:
      return `${formatDate(step.date)} · by ${step.responsible}`;
  }
};

const VERDICT_COLOR: Record<string, ChipProps['color']> = { positive: 'success', negative: 'error', neutral: 'default' };

const FeedbackForm = ({
  scope,
  stepId,
  participant
}: {
  scope: FeedbackScope;
  stepId: string;
  participant: CandidateParticipant;
}): JSX.Element => {
  const addFeedback = useAddMeetingFeedback();
  const { showToast } = useToast();
  const [verdict, setVerdict] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = async (): Promise<void> => {
    if (!verdict || !text.trim()) {
      setError('Select a verdict and write your feedback.');
      return;
    }
    try {
      await addFeedback.mutateAsync({
        id: scope.demandId,
        candidateId: scope.candidateId,
        stepId,
        participantUserId: participant.userId ?? '',
        viewAs: scope.viewAs,
        verdict: verdict as MeetingFeedbackRequest['verdict'],
        feedback: text.trim()
      });
      showToast('Feedback saved. The demand manager sees it now.');
    } catch (mutationError) {
      setError(axios.isAxiosError(mutationError) ? (mutationError.response?.data as { message?: string })?.message ?? 'Unable to save.' : 'Unable to save.');
    }
  };

  return (
    <Stack spacing={1} sx={{ mt: 0.5 }}>
      <FormControl>
        <FormLabel sx={{ fontSize: 13 }}>Your feedback</FormLabel>
        <RadioGroup row value={verdict} onChange={(event) => setVerdict(event.target.value)}>
          {['positive', 'neutral', 'negative'].map((item) => (
            <FormControlLabel key={item} value={item} control={<Radio size="small" />} label={item.charAt(0).toUpperCase() + item.slice(1)} />
          ))}
        </RadioGroup>
      </FormControl>
      <TextField size="small" multiline minRows={2} placeholder="What went well? What is missing?" value={text} onChange={(event) => setText(event.target.value)} />
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Box>
        <Button size="small" variant="contained" onClick={() => void save()} disabled={addFeedback.isPending}>
          Save feedback
        </Button>
      </Box>
    </Stack>
  );
};

interface FeedbackScope {
  demandId: string;
  candidateId: string;
  viewAs?: string;
}

export const StepCard = ({
  step,
  onDecide,
  feedbackScope,
  canNote
}: {
  step: CandidateStep;
  onDecide?: () => void;
  feedbackScope: FeedbackScope;
  canNote: boolean;
}): JSX.Element => {
  const addNote = useAddStepNote();
  // Whoever acts as a participant here. Mock mode: the person of "View as (mock)" or the demo mapping. Real mode: the
  // signed-in user's own id. The backend re-checks it against the JWT.
  const user = useAuthStore((state) => state.user);
  const actingAs = actingParticipantId(user, feedbackScope.viewAs);
  const isParticipant = Boolean(actingAs) && Boolean(step.participants?.some((person) => !person.external && person.userId === actingAs));
  const first = step.changes[0];
  const last = step.changes[step.changes.length - 1];
  const days = first && last ? Math.max(0, Math.round((new Date(last.at).getTime() - new Date(first.at).getTime()) / 864e5)) : 0;
  return (
    <Paper variant="outlined" component="li" sx={{ listStyle: 'none', p: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            {STEP_KIND[step.type]}
          </Typography>
          <Typography variant="subtitle2" component="h4">
            {step.title}
          </Typography>
        </Box>
        <Chip size="small" label={step.status} color={statusColor(step.status)} />
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {stepMeta(step)}
      </Typography>
      {step.changes.length > 1 ? (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ m: 0, mt: 0.5 }}>
          {step.changes.map((change) => `${change.status} ${formatDate(change.at)}`).join(' → ')} · {pluralize(days, 'day')}
        </Typography>
      ) : null}
      {step.participants ? (
        <Box sx={{ mt: 1 }}>
          <Typography variant="overline" color="text.secondary">
            Participants
          </Typography>
          <Stack component="ul" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {step.participants.map((person) => (
              <li key={`${person.userId ?? 'ext'}-${person.name}`}>
                <Typography variant="body2">
                  <strong>{person.name}</strong>{' '}
                  <Typography component="span" variant="caption" color="text.secondary">
                    {person.external ? 'External participant. No system access.' : person.roleLabel}
                  </Typography>
                </Typography>
                {person.verdict ? (
                  <Stack spacing={0.5} alignItems="flex-start">
                    <Chip
                      size="small"
                      label={person.verdict.charAt(0).toUpperCase() + person.verdict.slice(1)}
                      color={VERDICT_COLOR[person.verdict]}
                    />
                    <Typography variant="body2">{person.feedback}</Typography>
                    {person.feedbackAt ? (
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(person.feedbackAt)}
                      </Typography>
                    ) : null}
                  </Stack>
                ) : !person.external && person.userId && person.userId === actingAs && step.status !== 'Cancelled' ? (
                  <FeedbackForm scope={feedbackScope} stepId={step.id} participant={person} />
                ) : !person.external ? (
                  <Typography variant="caption" color="text.secondary" component="p" sx={{ m: 0 }}>
                    {step.status === 'Scheduled' ? 'Feedback after the meeting.' : step.status === 'Cancelled' ? 'Meeting cancelled.' : 'No feedback yet.'}
                  </Typography>
                ) : null}
              </li>
            ))}
          </Stack>
        </Box>
      ) : null}
      <NoteList notes={step.notes} label={`Notes on ${step.title}`} />
      {(canNote && !feedbackScope.viewAs) || (isParticipant && step.status !== 'Cancelled') ? (
        <NoteForm
          label={`${step.title} note`}
          onSave={(text) =>
            addNote.mutateAsync({
              id: feedbackScope.demandId,
              candidateId: feedbackScope.candidateId,
              stepId: step.id,
              text,
              viewAs: feedbackScope.viewAs
            })
          }
        />
      ) : null}
      {onDecide ? (
        <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={onDecide}>
          Record outcome
        </Button>
      ) : null}
    </Paper>
  );
};

interface CandidateScope {
  demandId: string;
  canEdit: boolean;
  canNote: boolean;
  defaultSentTo?: string;
  defaultExternal?: string;
  viewAs?: string;
  placement: PlacementDefaults;
}

const CandidateBody = ({ candidate, demandId, canEdit, canNote, defaultSentTo, defaultExternal, viewAs, placement }: { candidate: DemandCandidate } & CandidateScope): JSX.Element => {
  const addCandidateNote = useAddCandidateNote();
  const [stepOpen, setStepOpen] = useState<'CV' | 'OFFER' | 'CUSTOM' | null>(null);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [decideStepId, setDecideStepId] = useState<string | null>(null);
  const cvBlocker = cvStepBlocker(candidate);
  const offerBlocker = offerStepBlocker(candidate);
  const startBlocker = placementBlocker(candidate, placement);
  const external = candidate.type === 'EXTERNAL';
  const hasException = candidate.notes.some((note) => note.kind === 'BUDGET_EXCEPTION');
  const facts: [string, string][] = [
    ['Type', external ? 'External' : 'Internal employee'],
    ...(external
      ? ([
          ['Email', candidate.email || 'Not given'],
          ['Recruiter', candidate.recruiter ?? 'Not given']
        ] as [string, string][])
      : ([['Job title', candidate.detail]] as [string, string][])),
    ['Source', candidate.source],
    ...(external
      ? ([['Expected daily rate', candidate.expectedDailyRate ? `${candidate.expectedDailyRate} EUR` : 'Not known']] as [string, string][])
      : [])
  ];
  return (
    <Stack spacing={2}>
      <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 1.5 }}>
        {facts.map(([label, value]) => (
          <Box key={label}>
            <Typography component="dt" variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0, overflowWrap: 'anywhere' }}>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
      {candidate.closeReason ? (
        <Alert severity={candidate.status === 'REJECTED' ? 'error' : 'info'} icon={false}>
          <strong>{STATUS[candidate.status].label}.</strong>{' '}
          {candidate.status === 'WITHDRAWN' ? 'Reason: ' : ''}
          {candidate.closeReason}
          {candidate.closedBy && candidate.closedAt ? ` ${candidate.closedBy}, ${formatDateTime(candidate.closedAt)}` : ''}
        </Alert>
      ) : null}
      {candidate.status === 'PLACED' ? (
        <Alert severity="success" icon={false}>
          <strong>Placed.</strong> This candidate fills one position.{' '}
          {candidate.type === 'EXTERNAL'
            ? 'The person gets an employee record when Module 2 imports them from Workday.'
            : 'The Module 2 allocation is not connected yet.'}
        </Alert>
      ) : null}
      {!viewAs && candidate.budget?.over ? (
        <Alert severity="warning">
          <strong>Above budget.</strong> {external ? 'Expected daily rate' : 'Cost range'} {candidate.budget.actual}, maximum {candidate.budget.max}.{' '}
          {hasException
            ? 'The exception is explained in the candidate notes.'
            : 'No exception explanation has been recorded yet.'}
          {canNote ? (
            <NoteForm
              label={`Budget exception for ${candidate.name}`}
              actionLabel="Explain exception"
              placeholder="Why is this above-budget candidate acceptable?"
              onSave={(text) => addCandidateNote.mutateAsync({ id: demandId, candidateId: candidate.id, text, kind: 'BUDGET_EXCEPTION' })}
            />
          ) : null}
        </Alert>
      ) : null}
      {!viewAs && candidate.fullAllocation ? (
        <Alert severity="info">
          This person is already placed on {candidate.fullAllocation.placedOn.join(', ')} and is now allocated{' '}
          {candidate.fullAllocation.totalPct}%. The candidate stays in this demand until someone decides otherwise.
        </Alert>
      ) : null}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Typography variant="subtitle1" component="h3">
            Flow
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {pluralize(candidate.steps.length, 'step')}
          </Typography>
        </Stack>
        {canEdit && !viewAs && isCandidateOpen(candidate) ? (
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Add step
            </Typography>
            <Button size="small" variant="outlined" disabled={Boolean(cvBlocker)} onClick={() => setStepOpen('CV')}>
              CV sent
            </Button>
            <Button size="small" variant="outlined" onClick={() => setMeetingOpen(true)}>
              Meeting
            </Button>
            {external ? (
              <Button size="small" variant="outlined" disabled={Boolean(offerBlocker)} onClick={() => setStepOpen('OFFER')}>
                Offer sent
              </Button>
            ) : null}
            <Button size="small" variant="outlined" onClick={() => setStepOpen('CUSTOM')}>
              Custom step
            </Button>
            <Button size="small" variant="outlined" disabled={Boolean(startBlocker)} onClick={() => setStartOpen(true)}>
              Start date confirmed
            </Button>
            {cvBlocker ? (
              <Typography variant="caption" color="text.secondary">
                CV sent: {cvBlocker}
              </Typography>
            ) : null}
            {startBlocker ? (
              <Typography variant="caption" color="text.secondary">
                Start date confirmed: {startBlocker}
              </Typography>
            ) : null}
            {external && offerBlocker ? (
              <Typography variant="caption" color="text.secondary">
                Offer sent: {offerBlocker}
              </Typography>
            ) : null}
          </Stack>
        ) : null}
        {canEdit && !viewAs && isCandidateOpen(candidate) ? (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {isCandidateOpen(candidate) ? (
              <Button size="small" variant="outlined" color="inherit" onClick={() => setWithdrawOpen(true)}>
                Withdraw candidate
              </Button>
            ) : null}
          </Stack>
        ) : null}
        {candidate.steps.length === 0 ? (
          <Alert severity="info" sx={{ mt: 1 }}>
            No steps yet. Add a step to start the process.
          </Alert>
        ) : (
          <Stack component="ol" spacing={1} sx={{ m: 0, mt: 1, p: 0 }}>
            {candidate.steps.map((step) => (
              <StepCard
                key={step.id}
                step={step}
                feedbackScope={{ demandId, candidateId: candidate.id, viewAs }}
                canNote={canNote}
                onDecide={canEdit && !viewAs && !stepOutcomeBlocker(candidate, step) ? () => setDecideStepId(step.id) : undefined}
              />
            ))}
          </Stack>
        )}
      </Box>
      {!viewAs && (canNote || candidate.notes.length > 0) ? (
        <Box component="section" aria-label={`Notes on ${candidate.name}`}>
          <Typography variant="subtitle1" component="h3">
            Candidate notes
          </Typography>
          <NoteList notes={candidate.notes} label={`Candidate notes for ${candidate.name}`} />
          {canNote ? (
            <NoteForm
              label={`Candidate note for ${candidate.name}`}
              onSave={(text) => addCandidateNote.mutateAsync({ id: demandId, candidateId: candidate.id, text })}
            />
          ) : null}
        </Box>
      ) : null}
      <CandidateStepDialog
        demandId={demandId}
        candidate={stepOpen ? candidate : null}
        kind={stepOpen ?? 'CV'}
        defaultSentTo={defaultSentTo}
        onClose={() => setStepOpen(null)}
      />
      <WithdrawCandidateDialog demandId={demandId} candidate={withdrawOpen ? candidate : null} onClose={() => setWithdrawOpen(false)} />
      <StartDateDialog
        demandId={demandId}
        candidate={startOpen ? candidate : null}
        defaults={placement}
        onClose={() => setStartOpen(false)}
      />
      <MeetingStepDialog
        demandId={demandId}
        candidate={meetingOpen ? candidate : null}
        defaultExternal={defaultExternal}
        onClose={() => setMeetingOpen(false)}
      />
      <CvOutcomeDialog
        demandId={demandId}
        candidate={candidate}
        step={candidate.steps.find((item) => item.id === decideStepId) ?? null}
        onClose={() => setDecideStepId(null)}
      />
    </Stack>
  );
};

const CandidateRow = ({ candidate, ...scope }: { candidate: DemandCandidate } & CandidateScope): JSX.Element => {
  const external = candidate.type === 'EXTERNAL';
  const [crossAnchor, setCrossAnchor] = useState<HTMLElement | null>(null);
  // Manual removal of a candidate added by mistake (not a withdrawal: no reason, distinct history event).
  const removeCandidate = useRemoveCandidate();
  const { showToast } = useToast();
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const canRemove = scope.canEdit && !scope.viewAs;
  const canMove = canRemove;
  const [moveOpen, setMoveOpen] = useState(false);
  const setPipelineStatus = useSetCandidatePipelineStatus();
  const changePipelineStatus = (pipelineStatus: DemandCandidate['pipelineStatus']): void => {
    setPipelineStatus.mutate(
      { id: scope.demandId, candidateId: candidate.id, pipelineStatus },
      { onError: () => showToast('Unable to change the status.', 'error') }
    );
  };
  const confirmRemove = async (): Promise<void> => {
    try {
      await removeCandidate.mutateAsync({ id: scope.demandId, candidateId: candidate.id });
      setRemoveOpen(false);
      showToast(`${candidate.name} removed from the demand.`);
    } catch (mutationError) {
      setRemoveError(
        axios.isAxiosError(mutationError)
          ? (mutationError.response?.data as { message?: string } | undefined)?.message ?? 'Unable to remove the candidate.'
          : 'Unable to remove the candidate.'
      );
    }
  };

  // Hidden for the "view as" meeting participant, who only sees their own meeting (M-02).
  const otherDemands = scope.viewAs ? [] : candidate.otherDemands ?? [];
  const overBudget = !scope.viewAs && candidate.budget?.over ? candidate.budget : null;
  const fullAllocation = !scope.viewAs ? candidate.fullAllocation : undefined;
  return (
    <Box component="li" sx={{ listStyle: 'none' }}>
    {otherDemands.length > 0 || overBudget || fullAllocation ? (
      // Siblings of the accordion, not children of its header, so the controls are never nested.
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ px: 1, pb: 0.5 }}>
        {otherDemands.length > 0 ? <OtherDemandsChip links={otherDemands} onOpen={setCrossAnchor} /> : null}
        {overBudget ? (
          <Chip size="small" color="warning" variant="outlined" label="Above budget" title={`${overBudget.actual}, maximum ${overBudget.max}`} />
        ) : null}
        {fullAllocation ? (
          <Chip size="small" color="info" variant="outlined" label={`Fully allocated (${fullAllocation.totalPct}%)`} />
        ) : null}
      </Stack>
    ) : null}
    <Stack direction="row" spacing={0.5} alignItems="flex-start">
    <Accordion variant="outlined" disableGutters TransitionProps={{ unmountOnExit: true }} sx={{ flex: 1, minWidth: 0 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={`${candidate.id}-flow`} id={`${candidate.id}-head`}>
        <Stack direction="row" spacing={1.5} alignItems="center" useFlexGap flexWrap="wrap" sx={{ width: '100%', pr: 1 }}>
          <Avatar
            sx={{
              width: 34,
              height: 34,
              fontSize: 12,
              fontWeight: 700,
              bgcolor: external ? 'secondary.light' : 'info.light',
              color: external ? 'secondary.dark' : 'info.dark'
            }}
          >
            {initials(candidate.name)}
          </Avatar>
          <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
            <Typography fontWeight={500}>{candidate.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {external ? 'External' : 'Internal'} · {candidate.detail}
            </Typography>
          </Box>
          <Box sx={{ flex: '1 1 200px' }}>
            <Typography variant="body2" color="text.secondary">
              {candidate.currentStep}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Last change {formatDateTime(candidate.lastChangeAt)}
            </Typography>
          </Box>
          {canRemove ? (
            <TextField
              select
              size="small"
              value={candidate.pipelineStatus}
              disabled={setPipelineStatus.isPending}
              onClick={(event) => event.stopPropagation()}
              onFocus={(event) => event.stopPropagation()}
              onChange={(event) => changePipelineStatus(event.target.value as DemandCandidate['pipelineStatus'])}
              inputProps={{ 'aria-label': `Status of ${candidate.name}` }}
              sx={{ minWidth: 240 }}
            >
              {PIPELINE_STATUSES.map((value) => (
                <MenuItem key={value} value={value}>
                  {PIPELINE_STATUS_LABELS[value]}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <Chip size="small" label={PIPELINE_STATUS_LABELS[candidate.pipelineStatus]} color="info" />
          )}
        </Stack>
      </AccordionSummary>
      <AccordionDetails id={`${candidate.id}-flow`}>
        <CandidateBody candidate={candidate} {...scope} />
      </AccordionDetails>
    </Accordion>
    {canMove ? (
      <Tooltip title="Move to demand">
        <IconButton color="primary" aria-label={`Move ${candidate.name} to another demand`} onClick={() => setMoveOpen(true)} sx={{ mt: 1 }}>
          <DriveFileMoveOutlinedIcon />
        </IconButton>
      </Tooltip>
    ) : null}
    {canRemove ? (
      <Tooltip title="Remove from demand">
        <IconButton
          color="error"
          aria-label={`Remove ${candidate.name} from the demand`}
          onClick={() => {
            setRemoveError(null);
            setRemoveOpen(true);
          }}
          sx={{ mt: 1 }}
        >
          <DeleteOutlineIcon />
        </IconButton>
      </Tooltip>
    ) : null}
    </Stack>
      <MoveCandidateDialog open={moveOpen} demandId={scope.demandId} candidateId={candidate.id} candidateName={candidate.name} onClose={() => setMoveOpen(false)} />
      <Dialog open={removeOpen} onClose={() => setRemoveOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Remove {candidate.name} from the demand?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Use this only when the candidate was added to this demand by mistake. It needs no reason. The candidate is
            archived: it disappears from this list but stays in the database, and the history records the removal. The
            person and their other demands are not changed.
          </DialogContentText>
          {removeError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {removeError}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => void confirmRemove()} disabled={removeCandidate.isPending}>
            Remove from demand
          </Button>
        </DialogActions>
      </Dialog>
    <OtherDemandsPopover anchor={crossAnchor} name={candidate.name} links={otherDemands} onClose={() => setCrossAnchor(null)} />
    </Box>
  );
};

const CandidateList = ({ demandId, canEdit, canNote, defaultSentTo, defaultExternal, viewAs, placement }: CandidateScope): JSX.Element => {
  const { data, isLoading, isError } = useDemandCandidates(demandId);

  if (isLoading) return <CircularProgress size={24} aria-label="Loading candidates" />;
  if (isError || !data) return <Alert severity="error">Unable to load the candidates.</Alert>;
  if (data.length === 0) {
    return <Alert severity="info">No candidates on this demand yet.</Alert>;
  }

  const inProcess = data.filter((candidate) => candidate.status === 'IN_PROCESS').length;
  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {pluralize(data.length, 'candidate')} in total, {inProcess} in process.
      </Typography>
      <Stack component="ul" spacing={1} sx={{ m: 0, p: 0 }}>
        {data.map((candidate) => (
          <CandidateRow key={candidate.id} candidate={candidate} demandId={demandId} canEdit={canEdit} canNote={canNote} defaultSentTo={defaultSentTo} defaultExternal={defaultExternal} viewAs={viewAs} placement={placement} />
        ))}
      </Stack>
    </>
  );
};

export default CandidateList;

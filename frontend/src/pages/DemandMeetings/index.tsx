import { Alert, Box, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { WorkforcePageHeader } from '../../components';
import { StepCard } from '../../features/demand/CandidateList';
import { useMyMeetings } from '../../features/demand/demandApi';
import { CANDIDATE_STATUS } from '../../features/demand/OtherDemands';

// R-03, N-03: a line manager sees only the meetings they take part in and a short summary of the candidate.
// There is no link to the demand and no other candidate or demand data.
function DemandMeetingsPage(): JSX.Element {
  const { data: meetings, isLoading, isError } = useMyMeetings();

  return (
    <Box>
      <WorkforcePageHeader title="My meetings" description="Candidate meetings you take part in. Give your feedback and add notes here." />
      {isLoading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 160 }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Alert severity="error">Unable to load your meetings.</Alert>
      ) : !meetings || meetings.length === 0 ? (
        <Alert severity="info">You are not listed as a participant in any candidate meeting.</Alert>
      ) : (
        <Stack spacing={2}>
          {meetings.map((meeting) => {
            const status = CANDIDATE_STATUS[meeting.candidate.status];
            return (
              <Paper key={`${meeting.demandId}-${meeting.candidate.id}-${meeting.step.id}`} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1.5 }}>
                  <Typography variant="subtitle2" component="h2">
                    {meeting.candidate.name}
                  </Typography>
                  <Chip size="small" variant="outlined" label={meeting.candidate.type === 'EXTERNAL' ? 'External' : 'Internal'} />
                  <Chip size="small" label={status.label} color={status.color} />
                  <Typography variant="body2" color="text.secondary">
                    {meeting.candidate.detail} · {meeting.demandCode} {meeting.demandTitle}
                  </Typography>
                </Stack>
                <Box component="ul" sx={{ m: 0, p: 0 }}>
                  <StepCard step={meeting.step} feedbackScope={{ demandId: meeting.demandId, candidateId: meeting.candidate.id }} canNote={false} />
                </Box>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

export default DemandMeetingsPage;

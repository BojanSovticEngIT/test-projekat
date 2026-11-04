import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { formatDateTime } from '../demand/demandFormat';
import { describeChanges, formatStatus } from './skillHistory';
import type { EmployeeSkillRevision } from '../../types/employeeSkill.types';

interface SkillHistoryAccordionProps {
  revisions?: EmployeeSkillRevision[];
  isLoading: boolean;
  isError: boolean;
  currentUserId?: string;
}

const titleFor = (revision: EmployeeSkillRevision, previous?: EmployeeSkillRevision): string => {
  if (!previous) return 'Skill added';
  if (previous.validationStatus !== revision.validationStatus) {
    return `Status changed to ${formatStatus(revision.validationStatus)}`;
  }
  return 'Details updated';
};

function SkillHistoryAccordion({ revisions = [], isLoading, isError, currentUserId }: SkillHistoryAccordionProps): JSX.Element {
  const newestFirst = [...revisions].sort((a, b) => b.version - a.version);

  return (
    <Accordion variant="outlined" disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="skill-history-content" id="skill-history-header">
        <Typography variant="overline" color="text.secondary" component="h2">
          History of changes{revisions.length > 0 ? ` (${revisions.length})` : ''}
        </Typography>
      </AccordionSummary>
      <AccordionDetails id="skill-history-content">
        {isLoading ? <CircularProgress size={24} aria-label="Loading history" /> : null}
        {isError ? <Alert severity="error">Unable to load the history.</Alert> : null}
        {!isLoading && !isError && newestFirst.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No history yet.
          </Typography>
        ) : null}
        <Stack spacing={1.75}>
          {newestFirst.map((revision) => {
            const previous = revisions.find((candidate) => candidate.version === revision.version - 1);
            const changes = describeChanges(revision, previous);
            return (
              <Box key={revision.id} component="section" sx={{ pl: 1.5, borderLeft: 2, borderColor: 'divider' }}>
                <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                  <Typography variant="subtitle2">{titleFor(revision, previous)}</Typography>
                  <Chip label={`v${revision.version}`} size="small" variant="outlined" />
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block">
                  {revision.changedByUserId === currentUserId ? 'You' : 'Another user'}, {formatDateTime(revision.changedAt)}
                </Typography>
                {changes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    No field changes.
                  </Typography>
                ) : (
                  <Stack component="ul" spacing={0.25} sx={{ m: 0, mt: 0.5, pl: 2 }}>
                    {changes.map((change) => (
                      <Typography key={change.field} component="li" variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                        {change.from === undefined ? (
                          <>
                            {change.field}: <strong>{change.to}</strong>
                          </>
                        ) : (
                          <>
                            {change.field}: {change.from} → <strong>{change.to}</strong>
                          </>
                        )}
                      </Typography>
                    ))}
                  </Stack>
                )}
              </Box>
            );
          })}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

export default SkillHistoryAccordion;

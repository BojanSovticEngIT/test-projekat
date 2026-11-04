import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { DetailRow, SectionTitle, SkillLevelBadge, StatusChip } from '../../components';
import ReviewSkillCertificates from '../certification/ReviewSkillCertificates';
import { formatDate, formatDateTime } from '../demand/demandFormat';
import { useEmployeeSkillHistory } from '../employeeSkill/employeeSkillApi';
import SkillHistoryAccordion from '../employeeSkill/SkillHistoryAccordion';
import { latestValidated } from '../employeeSkill/skillHistory';
import { ValidationRequestStatus } from '../../types/enums';
import type { EmployeeSkill } from '../../types/employeeSkill.types';
import type { ValidationRequestItem } from '../../types/validation.types';

interface ValidationItemCardProps {
  item: ValidationRequestItem;
  /** Live skill data of the employee (years, last used); absent once the skill has been deleted. */
  skill?: EmployeeSkill;
  isDeletion: boolean;
  currentUserId?: string;
  onApprove: () => void;
  onReject: () => void;
}

function ValidationItemCard({ item, skill, isDeletion, currentUserId, onApprove, onReject }: ValidationItemCardProps): JSX.Element {
  const history = useEmployeeSkillHistory(item.employeeSkillId);
  const previous = latestValidated(history.data);
  const pending = item.status === ValidationRequestStatus.SUBMITTED;

  return (
    <Paper variant="outlined" sx={{ p: 2 }} component="section" aria-label={item.skillName}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} useFlexGap flexWrap="wrap">
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h6" component="h3">
              {item.skillName}
            </Typography>
            <StatusChip status={item.status} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {item.categoryName}
          </Typography>
        </Box>
        {pending ? (
          <Stack direction="row" spacing={1}>
            <Button size="small" color="success" variant="outlined" onClick={onApprove}>
              Approve
            </Button>
            <Button size="small" color="error" variant="outlined" onClick={onReject}>
              Reject
            </Button>
          </Stack>
        ) : null}
      </Stack>

      <Box sx={{ display: 'grid', gap: 3, mt: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <Box>
          <SectionTitle>Employee&apos;s assessment</SectionTitle>
          <Stack component="dl" spacing={1.25} sx={{ m: 0, mt: 1.5 }}>
            <DetailRow label="Self-assessed">
              <SkillLevelBadge level={item.selfAssessedLevel} />
            </DetailRow>
            <DetailRow label="Experience">
              {skill?.yearsOfExperience !== undefined ? `${skill.yearsOfExperience} years` : 'Not set'}
            </DetailRow>
            <DetailRow label="Last used">{formatDate(skill?.lastUsedDate)}</DetailRow>
            <DetailRow label="Employee note">
              {item.employeeComment?.trim() ? (
                <Box component="span" sx={{ whiteSpace: 'pre-wrap' }}>
                  {item.employeeComment}
                </Box>
              ) : (
                <Typography component="span" variant="body2" color="text.secondary">
                  No note provided
                </Typography>
              )}
            </DetailRow>
          </Stack>
        </Box>

        <Box>
          <SectionTitle>Validation</SectionTitle>
          <Stack component="dl" spacing={1.25} sx={{ m: 0, mt: 1.5 }}>
            <DetailRow label="Last validated">
              {previous?.managerValidatedLevel ? (
                <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                  <SkillLevelBadge level={previous.managerValidatedLevel} />
                  <Typography variant="caption" color="text.secondary">
                    {formatDateTime(previous.changedAt)}
                  </Typography>
                </Stack>
              ) : (
                'Never validated'
              )}
            </DetailRow>
            <DetailRow label="Decision">
              {item.managerValidatedLevel ? <SkillLevelBadge level={item.managerValidatedLevel} /> : pending ? 'Waiting for your decision' : 'No level'}
            </DetailRow>
            <DetailRow label="Manager comment">{item.managerComment?.trim() ? item.managerComment : 'Not set'}</DetailRow>
            {item.reviewedAt ? <DetailRow label="Reviewed">{formatDateTime(item.reviewedAt)}</DetailRow> : null}
          </Stack>
          {isDeletion && pending ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
              Approving removes this skill from the employee&apos;s profile; its history stays recorded.
            </Typography>
          ) : null}
        </Box>
      </Box>

      {skill ? (
        <Box sx={{ mt: 2 }}>
          <ReviewSkillCertificates employeeSkillId={item.employeeSkillId} />
        </Box>
      ) : null}

      <Box sx={{ mt: 2 }}>
        <SkillHistoryAccordion
          revisions={history.data}
          isLoading={history.isLoading}
          isError={history.isError}
          currentUserId={currentUserId}
        />
      </Box>
    </Paper>
  );
}

export default ValidationItemCard;

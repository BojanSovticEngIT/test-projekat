import { Box, Chip, Stack, Typography } from '@mui/material';
import { SectionTitle } from '../../components';
import { reviewCertificateBaseUrl, useReviewSkillCertificates } from './certificationApi';
import SkillCertificateList from './SkillCertificateList';

interface ReviewSkillCertificatesProps {
  employeeSkillId: string;
}

// Reviewer view: the employee's certificates linked to the skill under review, to view or download before deciding.
function ReviewSkillCertificates({ employeeSkillId }: ReviewSkillCertificatesProps): JSX.Element {
  const { data, isLoading, isError } = useReviewSkillCertificates(employeeSkillId);

  return (
    <Box component="section" aria-label="Supporting certificates">
      <Stack direction="row" spacing={1} alignItems="center">
        <SectionTitle>Supporting certificates</SectionTitle>
        {data ? <Chip size="small" label={data.length} /> : null}
      </Stack>
      <Box sx={{ mt: 1.5 }}>
        <SkillCertificateList
          documentBaseUrl={reviewCertificateBaseUrl(employeeSkillId)}
          certificates={data}
          isLoading={isLoading}
          isError={isError}
          empty={
            <Typography variant="body2" color="text.secondary">
              The employee has not linked any certificate to this skill.
            </Typography>
          }
        />
      </Box>
    </Box>
  );
}

export default ReviewSkillCertificates;

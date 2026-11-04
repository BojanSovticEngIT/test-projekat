import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import { Autocomplete, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { SectionTitle } from '../../components';
import { useToast } from '../../lib/ToastProvider';
import type { MyCertification } from '../../types/certification.types';
import {
  myCertificateBaseUrl,
  useMyCertifications,
  useMySkillCertificates,
  useUpdateCertification
} from './certificationApi';
import SkillCertificateList from './SkillCertificateList';

interface MySkillCertificatesCardProps {
  employeeSkillId: string;
  /** Catalog skill the certificates are linked to. */
  skillId: string;
  skillName: string;
}

const MAX_CERTIFICATES = 100;

// Certificates backing one of the user's skills: view them, link an existing one, or add a new one for this skill.
function MySkillCertificatesCard({ employeeSkillId, skillId, skillName }: MySkillCertificatesCardProps): JSX.Element {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const linked = useMySkillCertificates(employeeSkillId);
  const mine = useMyCertifications({ page: 0, size: MAX_CERTIFICATES });
  const updateCertification = useUpdateCertification();
  const [selected, setSelected] = useState<MyCertification | null>(null);

  const linkable = (mine.data?.content ?? []).filter((certificate) => !certificate.skills.some((skill) => skill.id === skillId));

  const addNew = (): void => {
    const params = new URLSearchParams({
      skillId,
      skillName,
      returnTo: `/my-skills/${employeeSkillId}/edit`
    });
    navigate(`/certifications/new?${params.toString()}`);
  };

  const link = async (): Promise<void> => {
    if (!selected) return;
    try {
      await updateCertification.mutateAsync({
        id: selected.id,
        request: {
          name: selected.name,
          completionDate: selected.completionDate.slice(0, 10),
          expirationDate: selected.expirationDate?.slice(0, 10),
          skillIds: [...selected.skills.map((skill) => skill.id), skillId],
          link: selected.link ?? undefined
        }
      });
      showToast(`${selected.name} linked to ${skillName}.`);
      setSelected(null);
    } catch {
      showToast('Failed to link the certificate', 'error');
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center">
          <SectionTitle>Certificates</SectionTitle>
          {linked.data ? <Chip size="small" label={linked.data.length} /> : null}
        </Stack>
        <Button size="small" startIcon={<AddIcon />} onClick={addNew}>
          Add certificate
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
        Your manager sees these certificates when reviewing {skillName}.
      </Typography>

      <SkillCertificateList
        documentBaseUrl={myCertificateBaseUrl}
        certificates={linked.data}
        isLoading={linked.isLoading}
        isError={linked.isError}
        empty={
          <Typography variant="body2" color="text.secondary">
            No certificate is linked to this skill yet. Linking one gives your manager proof to base the decision on.
          </Typography>
        }
      />

      {linkable.length > 0 ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
          <Autocomplete
            size="small"
            fullWidth
            options={linkable}
            value={selected}
            onChange={(_, value) => setSelected(value)}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => <TextField {...params} label="Link an existing certificate" />}
          />
          <Button
            variant="outlined"
            startIcon={<LinkIcon />}
            disabled={!selected || updateCertification.isPending}
            onClick={() => void link()}
          >
            Link
          </Button>
        </Stack>
      ) : null}
    </Paper>
  );
}

export default MySkillCertificatesCard;

import { Chip, Link, Stack, Typography } from '@mui/material';
import type { DataTableColumn } from '../../components';
import type { MyCertification } from '../../types/certification.types';
import { formatDate } from '../demand/demandFormat';

const MAX_SKILL_CHIPS = 3;

// Shared by the Certifications page and the read-only card on the employee detail page.
export const certificationDataColumns: DataTableColumn<MyCertification>[] = [
  {
    key: 'name',
    label: 'Certification',
    render: (row) => (
      <>
        <Typography variant="body2" fontWeight={500}>
          {row.name}
        </Typography>
        {row.documentFileName ? (
          <Typography variant="caption" color="text.secondary" display="block">
            {row.documentFileName}
          </Typography>
        ) : null}
        {row.link ? (
          <Link
            variant="caption"
            display="block"
            href={row.link}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ wordBreak: 'break-all' }}
          >
            {row.link}
          </Link>
        ) : null}
      </>
    )
  },
  {
    key: 'completionDate',
    label: 'Completion date',
    render: (row) => (
      <Typography variant="body2" noWrap>
        {formatDate(row.completionDate)}
      </Typography>
    )
  },
  {
    key: 'expirationDate',
    label: 'Expiration date',
    render: (row) => (
      <Typography variant="body2" color={row.expirationDate ? undefined : 'text.secondary'} noWrap>
        {row.expirationDate ? formatDate(row.expirationDate) : '—'}
      </Typography>
    )
  },
  {
    key: 'skills',
    label: 'Associated skills',
    render: (row) =>
      row.skills.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          None
        </Typography>
      ) : (
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
          {row.skills.slice(0, MAX_SKILL_CHIPS).map((skill) => (
            <Chip key={skill.id} label={skill.name} size="small" variant="outlined" />
          ))}
          {row.skills.length > MAX_SKILL_CHIPS ? (
            <Chip
              label={`+${row.skills.length - MAX_SKILL_CHIPS}`}
              size="small"
              variant="outlined"
              title={row.skills.slice(MAX_SKILL_CHIPS).map((skill) => skill.name).join(', ')}
            />
          ) : null}
        </Stack>
      )
  }
];

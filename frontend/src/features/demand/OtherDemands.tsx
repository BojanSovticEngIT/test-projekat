import { Link as RouterLink } from 'react-router-dom';
import { Box, Chip, Link, Popover, Stack, Typography, type ChipProps } from '@mui/material';
import type { CandidateOtherDemand, CandidateStatus } from '../../types/demand.types';
import { pluralize, STATUS_LABELS } from './demandFormat';

export const CANDIDATE_STATUS: Record<CandidateStatus, { label: string; color: ChipProps['color'] }> = {
  IN_PROCESS: { label: 'In process', color: 'info' },
  PLACED: { label: 'Placed', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'error' },
  WITHDRAWN: { label: 'Withdrawn', color: 'default' }
};

// In process and placed are current associations. Rejected and withdrawn stay visible as history.
const isActive = (link: CandidateOtherDemand): boolean =>
  link.candidateStatus === 'IN_PROCESS' || link.candidateStatus === 'PLACED';

const stepText = (link: CandidateOtherDemand): string => {
  const label = isActive(link) ? 'Current step' : 'Last step';
  const allocation = link.placedAllocationPct ? ` at ${link.placedAllocationPct}%` : '';
  return `${label}: ${link.currentStep}${allocation}`;
};

interface OtherDemandsListProps {
  links: CandidateOtherDemand[];
  // Links navigate to the other demand. Turned off inside dialogs so the user does not leave a half-filled form.
  linkable?: boolean;
  onNavigate?: () => void;
}

const OtherDemandRow = ({ link, linkable, onNavigate }: { link: CandidateOtherDemand } & Omit<OtherDemandsListProps, 'links'>): JSX.Element => {
  const status = CANDIDATE_STATUS[link.candidateStatus];
  return (
    <Box component="li" sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2">
          {linkable ? (
            <Link component={RouterLink} to={`/demands/${link.demandId}`} onClick={onNavigate} fontWeight={600}>
              {link.demandCode}
            </Link>
          ) : (
            <strong>{link.demandCode}</strong>
          )}{' '}
          {link.demandTitle}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          {stepText(link)} · Demand {STATUS_LABELS[link.demandStatus].toLowerCase()}
        </Typography>
        {link.closeReason ? (
          <Typography variant="caption" color="text.secondary" component="div">
            Reason: {link.closeReason}
          </Typography>
        ) : null}
      </Box>
      <Chip size="small" label={status.label} color={status.color} sx={{ flexShrink: 0 }} />
    </Box>
  );
};

export const OtherDemandsList = ({ links, linkable = false, onNavigate }: OtherDemandsListProps): JSX.Element => {
  const groups = [
    { title: 'Active', items: links.filter(isActive) },
    { title: 'History', items: links.filter((link) => !isActive(link)) }
  ].filter((group) => group.items.length > 0);

  return (
    <Stack spacing={1.5}>
      {groups.map((group) => (
        <Box key={group.title} component="section" aria-label={`${group.title} on other demands`}>
          <Typography variant="overline" color="text.secondary" component="h4" sx={{ display: 'block', lineHeight: 1.8 }}>
            {group.title}
          </Typography>
          <Stack component="ul" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {group.items.map((link) => (
              <OtherDemandRow key={`${link.demandId}`} link={link} linkable={linkable} onNavigate={onNavigate} />
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
};

export const OtherDemandsChip = ({
  links,
  onOpen
}: {
  links: CandidateOtherDemand[];
  onOpen: (anchor: HTMLElement) => void;
}): JSX.Element | null => {
  if (links.length === 0) return null;
  const active = links.filter(isActive).length;
  return (
    <Chip
      size="small"
      variant="outlined"
      color={active > 0 ? 'info' : 'default'}
      label={pluralize(links.length, 'other demand')}
      aria-label={`${pluralize(links.length, 'other demand')}: ${active} active, ${links.length - active} in history. Show details`}
      aria-haspopup="dialog"
      onClick={(event) => onOpen(event.currentTarget)}
    />
  );
};

export const OtherDemandsPopover = ({
  anchor,
  name,
  links,
  onClose
}: {
  anchor: HTMLElement | null;
  name: string;
  links: CandidateOtherDemand[];
  onClose: () => void;
}): JSX.Element => (
  <Popover
    open={Boolean(anchor)}
    anchorEl={anchor}
    onClose={onClose}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    slotProps={{ paper: { sx: { p: 2, width: 420, maxWidth: 'calc(100vw - 32px)' }, role: 'dialog', 'aria-label': `Other demands of ${name}` } }}
  >
    <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
      {name} on other demands
    </Typography>
    {links.length === 0 ? (
      <Typography variant="body2" color="text.secondary">
        This person is not on any other demand.
      </Typography>
    ) : (
      <OtherDemandsList links={links} linkable onNavigate={onClose} />
    )}
  </Popover>
);

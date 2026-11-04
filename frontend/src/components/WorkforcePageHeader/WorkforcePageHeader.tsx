import { Breadcrumbs, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { ReactNode } from 'react';

export interface WorkforceBreadcrumb {
  label: string;
  to?: string;
}

interface WorkforcePageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: WorkforceBreadcrumb[];
  actions?: ReactNode;
}

function WorkforcePageHeader({
  title,
  description,
  breadcrumbs = [{ label: 'Workforce', to: '/workforce' }],
  actions
}: WorkforcePageHeaderProps): JSX.Element {
  return (
    <>
      <Breadcrumbs sx={{ mb: 2 }}>
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          if (isLast || !crumb.to) {
            return (
              <Typography key={`${crumb.label}-${index}`} color="text.primary">
                {crumb.label}
              </Typography>
            );
          }
          return (
            <Link
              key={`${crumb.label}-${index}`}
              component={RouterLink}
              to={crumb.to}
              underline="hover"
              color="inherit"
            >
              {crumb.label}
            </Link>
          );
        })}
      </Breadcrumbs>

      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      {description ? (
        <Typography color="text.secondary" sx={{ mb: actions ? 2 : 3 }}>
          {description}
        </Typography>
      ) : null}
      {actions ? <div style={{ marginBottom: 24 }}>{actions}</div> : null}
    </>
  );
}

export default WorkforcePageHeader;

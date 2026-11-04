import { useMemo, useState } from 'react';
import { Autocomplete, Box, Button, Card, CardContent, Stack, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { WorkforcePageHeader } from '../../../components';
import { useCreateClient, useVerticalTaxonomy } from '@features/workforce/workforceApi';
import type { ClientRequest } from '../../../types/workforce.types';

function WorkforceClientCreatePage(): JSX.Element {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [verticalN1, setVerticalN1] = useState('');
  const [verticalN2, setVerticalN2] = useState('');

  const { data: verticalTaxonomy = [] } = useVerticalTaxonomy();
  const createClient = useCreateClient();

  const verticalN1Options = useMemo(
    () => Array.from(new Set(verticalTaxonomy.map((item) => item.verticalN1))),
    [verticalTaxonomy]
  );

  const verticalN2Options = useMemo(
    () =>
      verticalN1
        ? verticalTaxonomy
            .filter((item) => item.verticalN1 === verticalN1 && item.verticalN2)
            .map((item) => item.verticalN2 as string)
        : [],
    [verticalN1, verticalTaxonomy]
  );

  const handleCreate = async (): Promise<void> => {
    const payload: ClientRequest = {
      name,
      verticalN1: verticalN1 || undefined,
      verticalN2: verticalN2 || undefined,
      status: 'ACTIVE'
    };
    const created = await createClient.mutateAsync(payload);
    navigate(`/workforce/projects/new?clientId=${created.id}`);
  };

  return (
    <Box>
      <WorkforcePageHeader
        title="Create Client"
        description="Add a client with its vertical classification."
        breadcrumbs={[
          { label: 'Workforce', to: '/workforce' },
          { label: 'Projects/Services', to: '/workforce/projects' },
          { label: 'Create Client' }
        ]}
      />

      <Card sx={{ maxWidth: 640 }}>
        <CardContent>
          <Stack spacing={2}>
            <TextField
              label="Client Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              fullWidth
            />
            <Autocomplete
              options={verticalN1Options}
              value={verticalN1 || null}
              onChange={(_, value) => {
                setVerticalN1(value ?? '');
                setVerticalN2('');
              }}
              renderInput={(params) => <TextField {...params} label="Vertical N-1" />}
              fullWidth
            />
            <Autocomplete
              options={verticalN2Options}
              value={verticalN2 || null}
              onChange={(_, value) => setVerticalN2(value ?? '')}
              disabled={!verticalN1}
              renderInput={(params) => <TextField {...params} label="Vertical N-2" />}
              fullWidth
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={() => navigate('/workforce/projects')}>Cancel</Button>
              <Button
                variant="contained"
                disabled={!name.trim() || createClient.isPending}
                onClick={() => void handleCreate()}
              >
                Create
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export default WorkforceClientCreatePage;

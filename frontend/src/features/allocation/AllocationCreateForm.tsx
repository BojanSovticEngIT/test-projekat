import { useMemo, useState } from 'react';
import { Alert, Autocomplete, Button, Stack, TextField } from '@mui/material';
import { useEmployees } from '@features/employee/employeeApi';
import { useProjects } from '@features/workforce/workforceApi';
import useAuthStore from '@store/authStore';
import { UserRole, EmploymentStatus } from '../../types/enums';
import type { Employee } from '../../types/employee.types';
import type { AllocationConflictDetails, AllocationRequest } from '../../types/allocation.types';
import type { Project } from '../../types/workforce.types';
import { parseAllocationConflict, useCreateAllocation } from './allocationApi';

interface AllocationCreateFormProps {
  onDone: () => void;
  onCancel: () => void;
  defaultEmployeeId?: string;
  defaultProjectId?: string;
}

interface FormState {
  employeeId: string;
  projectId: string;
  roleName: string;
  allocationPct: string;
  startDate: string;
  endDate: string;
  expectedEndDate: string;
  comment: string;
  overrideReason: string;
}

// Keeps the chosen item in the options so it stays valid when a new search no longer returns it.
const withSelected = <T extends { id: string }>(options: T[], selected: T | null): T[] =>
  selected && !options.some((option) => option.id === selected.id) ? [selected, ...options] : options;

const AllocationCreateForm = ({
  onDone,
  onCancel,
  defaultEmployeeId,
  defaultProjectId
}: AllocationCreateFormProps): JSX.Element => {
  const user = useAuthStore((state) => state.user);
  const canOverride = user?.role === UserRole.ADMIN || user?.role === UserRole.PMO;
  const createAllocation = useCreateAllocation();

  const [form, setForm] = useState<FormState>(() => ({
    employeeId: defaultEmployeeId ?? '',
    projectId: defaultProjectId ?? '',
    roleName: '',
    allocationPct: '100',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    expectedEndDate: '',
    comment: '',
    overrideReason: ''
  }));
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [conflict, setConflict] = useState<AllocationConflictDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: employeesPage } = useEmployees({
    search: employeeSearch || undefined,
    employmentStatus: EmploymentStatus.ACTIVE,
    size: 20
  });
  const { data: projectsPage } = useProjects({
    search: projectSearch || undefined,
    status: undefined,
    size: 20
  });

  const employees = employeesPage?.content ?? [];
  const projects = useMemo(
    () => (projectsPage?.content ?? []).filter((project) => project.status !== 'CLOSED'),
    [projectsPage?.content]
  );

  const buildPayload = (override: boolean): AllocationRequest => ({
    employeeId: form.employeeId,
    projectId: form.projectId,
    roleName: form.roleName.trim() || undefined,
    allocationPct: Number(form.allocationPct),
    startDate: form.startDate,
    endDate: form.endDate || undefined,
    expectedEndDate: form.expectedEndDate || undefined,
    comment: form.comment.trim() || undefined,
    override,
    reason: override ? form.overrideReason.trim() : undefined
  });

  const handleSubmit = async (withOverride = false) => {
    setError(null);

    if (!form.employeeId || !form.projectId || !form.startDate || !form.allocationPct) {
      setError('Employee, project, start date, and allocation % are required.');
      return;
    }

    if (withOverride && !form.overrideReason.trim()) {
      setError('Override reason is required.');
      return;
    }

    try {
      await createAllocation.mutateAsync(buildPayload(withOverride));
      onDone();
    } catch (mutationError) {
      const conflictDetails = parseAllocationConflict(mutationError);
      if (conflictDetails && canOverride) {
        setConflict(conflictDetails);
        return;
      }
      const message =
        conflictDetails?.message ??
        (mutationError instanceof Error ? mutationError.message : 'Unable to create allocation.');
      setError(message);
    }
  };

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {conflict ? (
        <Alert severity="warning">
          {conflict.message}
          {conflict.violatingDate ? ` (date: ${conflict.violatingDate})` : ''}
          {conflict.totalAllocationPct !== undefined && conflict.capacityPct !== undefined
            ? ` — ${conflict.totalAllocationPct}% vs ${conflict.capacityPct}% capacity`
            : ''}
          {canOverride ? (
            <>
              <br />
              Enter an override reason below, then click <strong>Override &amp; Create</strong> to continue.
            </>
          ) : null}
        </Alert>
      ) : null}

      {!defaultEmployeeId ? (
        <Autocomplete
          options={withSelected(employees, selectedEmployee)}
          value={selectedEmployee}
          onChange={(_, value: Employee | null) => {
            setSelectedEmployee(value);
            setForm((current) => ({ ...current, employeeId: value?.id ?? '' }));
          }}
          onInputChange={(_, value, reason) => {
            if (reason === 'input') setEmployeeSearch(value);
            else if (reason === 'clear') setEmployeeSearch('');
          }}
          filterOptions={(options) => options}
          getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.employeeNumber})`}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => <TextField {...params} label="Employee" required />}
        />
      ) : null}

      {!defaultProjectId ? (
        <Autocomplete
          options={withSelected(projects, selectedProject)}
          value={selectedProject}
          onChange={(_, value: Project | null) => {
            setSelectedProject(value);
            setForm((current) => ({ ...current, projectId: value?.id ?? '' }));
          }}
          onInputChange={(_, value, reason) => {
            if (reason === 'input') setProjectSearch(value);
            else if (reason === 'clear') setProjectSearch('');
          }}
          filterOptions={(options) => options}
          getOptionLabel={(option) => `${option.name} (${option.code})`}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => <TextField {...params} label="Project" required />}
        />
      ) : null}

      <TextField
        label="Role on project"
        value={form.roleName}
        onChange={(event) => setForm((current) => ({ ...current, roleName: event.target.value }))}
      />
      <TextField
        label="Allocation %"
        type="number"
        inputProps={{ min: 1, max: 100 }}
        value={form.allocationPct}
        onChange={(event) => setForm((current) => ({ ...current, allocationPct: event.target.value }))}
        required
      />
      <TextField
        label="Start date"
        type="date"
        InputLabelProps={{ shrink: true }}
        value={form.startDate}
        onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
        required
      />
      <TextField
        label="End date"
        type="date"
        InputLabelProps={{ shrink: true }}
        value={form.endDate}
        onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
      />
      <TextField
        label="Expected end date"
        type="date"
        InputLabelProps={{ shrink: true }}
        value={form.expectedEndDate}
        onChange={(event) => setForm((current) => ({ ...current, expectedEndDate: event.target.value }))}
      />
      <TextField
        label="Comment"
        multiline
        minRows={2}
        value={form.comment}
        onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))}
      />

      {conflict && canOverride ? (
        <TextField
          label="Override reason"
          multiline
          minRows={2}
          autoFocus
          value={form.overrideReason}
          onChange={(event) => setForm((current) => ({ ...current, overrideReason: event.target.value }))}
          required
          helperText="Mandatory when overriding an allocation conflict"
        />
      ) : null}

      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button onClick={onCancel}>Cancel</Button>
        {conflict && canOverride ? (
          <Button onClick={() => handleSubmit(true)} disabled={createAllocation.isPending}>
            {createAllocation.isPending ? 'Saving…' : 'Override & Create'}
          </Button>
        ) : (
          <Button onClick={() => handleSubmit(false)} disabled={createAllocation.isPending}>
            {createAllocation.isPending ? 'Saving…' : 'Create'}
          </Button>
        )}
      </Stack>
    </Stack>
  );
};

export default AllocationCreateForm;

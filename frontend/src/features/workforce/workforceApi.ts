import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosClient from '@api/axiosClient';
import type { PagedResponse } from '../../types/pagination.types';
import type {
  Client,
  ClientRequest,
  HorizontalNode,
  HorizontalNodeRequest,  Project,
  ProjectManager,
  ProjectRequest,
  StructureImportResult,
  VerticalNode,
  VerticalNodeRequest,
  VerticalTaxonomy
} from '../../types/workforce.types';
import type { ProjectStatus } from '../../types/workforce.types';
import { downloadExcel } from '../demand/demandApi';

export interface ProjectFilters {
  search?: string;
  client?: string;
  projectManager?: string;
  horizontal?: string;
  status?: ProjectStatus;
  clientId?: string;
  horizontalNodeId?: string;
  projectManagerId?: string;
  page?: number;
  size?: number;
}

const buildParams = (filters?: ProjectFilters): Record<string, string | number> =>
  Object.entries(filters ?? {}).reduce<Record<string, string | number>>((params, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return params;
    }
    params[key] = value as string | number;
    return params;
  }, {});

export const useVerticalTaxonomy = () =>
  useQuery({
    queryKey: ['vertical-taxonomy'],
    queryFn: async (): Promise<VerticalTaxonomy[]> => {
      const response = await axiosClient.get<VerticalTaxonomy[]>('/api/vertical-taxonomy');
      return response.data;
    }
  });

export const useVerticalNodes = (options?: { includeInactive?: boolean }) => {
  const includeInactive = options?.includeInactive ?? false;
  return useQuery({
    queryKey: includeInactive ? ['vertical-nodes', 'all'] : ['vertical-nodes'],
    queryFn: async (): Promise<VerticalNode[]> => {
      const response = await axiosClient.get<VerticalNode[]>('/api/vertical-nodes', {
        params: includeInactive ? { includeInactive: true } : undefined
      });
      return response.data;
    }
  });
};

export const useCreateVerticalNode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: VerticalNodeRequest): Promise<VerticalNode> => {
      const response = await axiosClient.post<VerticalNode>('/api/vertical-nodes', payload);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vertical-nodes'] });
      await queryClient.invalidateQueries({ queryKey: ['vertical-taxonomy'] });
    }
  });
};

export const useUpdateVerticalNode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: VerticalNodeRequest }): Promise<VerticalNode> => {
      const response = await axiosClient.put<VerticalNode>(`/api/vertical-nodes/${id}`, payload);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vertical-nodes'] });
      await queryClient.invalidateQueries({ queryKey: ['vertical-taxonomy'] });
    }
  });
};

export const useDeleteVerticalNode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axiosClient.delete(`/api/vertical-nodes/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vertical-nodes'] });
      await queryClient.invalidateQueries({ queryKey: ['vertical-taxonomy'] });
    }
  });
};

export const useExportVerticalNodes = () =>
  useMutation({ mutationFn: () => downloadExcel('/api/vertical-nodes/export.xlsx', 'market-structure.xlsx') });

export const useImportVerticalNodes = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<StructureImportResult> => {
      const body = new FormData();
      body.append('file', file);
      const response = await axiosClient.post<StructureImportResult>('/api/vertical-nodes/import', body);
      return response.data;
    },
    onSuccess: async (result) => {
      if (result.created + result.updated > 0) {
        await queryClient.invalidateQueries({ queryKey: ['vertical-nodes'] });
        await queryClient.invalidateQueries({ queryKey: ['vertical-taxonomy'] });
      }
    }
  });
};

export const useHorizontalNodes = (options?: { includeInactive?: boolean }) => {
  const includeInactive = options?.includeInactive ?? false;
  return useQuery({
    queryKey: includeInactive ? ['horizontal-nodes', 'all'] : ['horizontal-nodes'],
    queryFn: async (): Promise<HorizontalNode[]> => {
      const response = await axiosClient.get<HorizontalNode[]>('/api/horizontal-nodes', {
        params: includeInactive ? { includeInactive: true } : undefined
      });
      return response.data;
    }
  });
};

export const useCreateHorizontalNode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: HorizontalNodeRequest): Promise<HorizontalNode> => {
      const response = await axiosClient.post<HorizontalNode>('/api/horizontal-nodes', payload);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['horizontal-nodes'] });
    }
  });
};

export const useUpdateHorizontalNode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: HorizontalNodeRequest }): Promise<HorizontalNode> => {
      const response = await axiosClient.put<HorizontalNode>(`/api/horizontal-nodes/${id}`, payload);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['horizontal-nodes'] });
    }
  });
};

export const useDeleteHorizontalNode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axiosClient.delete(`/api/horizontal-nodes/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['horizontal-nodes'] });
    }
  });
};

export const useExportHorizontalNodes = () =>
  useMutation({ mutationFn: () => downloadExcel('/api/horizontal-nodes/export.xlsx', 'corporate-structure.xlsx') });

export const useImportHorizontalNodes = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<StructureImportResult> => {
      const body = new FormData();
      body.append('file', file);
      const response = await axiosClient.post<StructureImportResult>('/api/horizontal-nodes/import', body);
      return response.data;
    },
    onSuccess: async (result) => {
      if (result.created + result.updated > 0) {
        await queryClient.invalidateQueries({ queryKey: ['horizontal-nodes'] });
      }
    }
  });
};

export const useProjectManagers = () =>
  useQuery({
    queryKey: ['project-managers'],
    queryFn: async (): Promise<ProjectManager[]> => {
      const response = await axiosClient.get<ProjectManager[]>('/api/project-managers');
      return response.data;
    }
  });

export const useCreateProjectManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (employeeId: string): Promise<ProjectManager> => {
      const response = await axiosClient.post<ProjectManager>('/api/project-managers', { employeeId });
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-managers'] });
    }
  });
};

export const useClients = (page = 0, size = 100) =>
  useQuery({
    queryKey: ['clients', page, size],
    queryFn: async (): Promise<PagedResponse<Client>> => {
      const response = await axiosClient.get<PagedResponse<Client>>('/api/clients', {
        params: { page, size }
      });
      return response.data;
    }
  });

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ClientRequest): Promise<Client> => {
      const response = await axiosClient.post<Client>('/api/clients', payload);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
    }
  });
};

export const useProjects = (filters?: ProjectFilters) =>
  useQuery({
    queryKey: ['projects', filters],
    queryFn: async (): Promise<PagedResponse<Project>> => {
      const response = await axiosClient.get<PagedResponse<Project>>('/api/projects', {
        params: buildParams(filters)
      });
      return response.data;
    }
  });

export const useProject = (id?: string) =>
  useQuery({
    queryKey: ['project', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Project> => {
      const response = await axiosClient.get<Project>(`/api/projects/${id}`);
      return response.data;
    }
  });

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProjectRequest): Promise<Project> => {
      const response = await axiosClient.post<Project>('/api/projects', payload);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ProjectRequest }): Promise<Project> => {
      const response = await axiosClient.put<Project>(`/api/projects/${id}`, payload);
      return response.data;
    },
    onSuccess: async (project) => {
      queryClient.setQueryData(['project', project.id], project);
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axiosClient.delete(`/api/projects/${id}`);
    },
    onSuccess: async (_, id) => {
      queryClient.removeQueries({ queryKey: ['project', id] });
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });
};

export const buildHorizontalNodeLabel = (node: HorizontalNode, nodes: HorizontalNode[]): string => {
  const names: string[] = [node.name];
  let parentId = node.parentId;
  while (parentId) {
    const parent = nodes.find((item) => item.id === parentId);
    if (!parent) break;
    names.unshift(parent.name);
    parentId = parent.parentId;
  }
  return names.join(' / ');
};

export const getLeafHorizontalNodes = (nodes: HorizontalNode[]): HorizontalNode[] =>
  nodes.filter((node) => !nodes.some((child) => child.parentId === node.id));

export interface HorizontalNodeOption {
  id: string;
  label: string;
}

// Every node (not only leaves) with its full path label; filtering by a node includes its descendants.
export const buildHorizontalNodeOptions = (nodes: HorizontalNode[]): HorizontalNodeOption[] =>
  nodes
    .map((node) => ({ id: node.id, label: buildHorizontalNodeLabel(node, nodes) }))
    .sort((a, b) => a.label.localeCompare(b.label));

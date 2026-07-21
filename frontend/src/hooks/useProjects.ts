import { useCallback, useEffect, useState } from 'react';
import { projectService } from '../services/projectService';
import type { ProjectQuery } from '../repositories/projectRepository';
import type { Project } from '../types/domain';

export function useProjects(query: ProjectQuery) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setProjects(await projectService.list(query));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.search, query.status, query.sortField, query.sortDirection]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { projects, loading, reload };
}

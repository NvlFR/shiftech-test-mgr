import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { projectService } from '../services/projectService';
import type { Project } from '../types/domain';

interface ProjectContextValue {
  projects: Project[];
  activeProject: Project | null;
  projectId: string | null;
  loading: boolean;
  setProjectId: (projectId: string | null) => void;
  reloadProjects: () => Promise<void>;
}

const STORAGE_KEY = 'testmanager.activeProjectId';
const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectIdState] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(true);

  async function reloadProjects() {
    setLoading(true);
    try {
      const nextProjects = await projectService.list({ status: 'active', sortField: 'name', sortDirection: 'asc' });
      setProjects(nextProjects);
      setProjectIdState((current) => {
        if (current && nextProjects.some((project) => project.id === current)) return current;
        return nextProjects[0]?.id ?? null;
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reloadProjects();
  }, []);

  function setProjectId(nextProjectId: string | null) {
    setProjectIdState(nextProjectId);
    if (nextProjectId) localStorage.setItem(STORAGE_KEY, nextProjectId);
    else localStorage.removeItem(STORAGE_KEY);
  }

  useEffect(() => {
    if (projectId) localStorage.setItem(STORAGE_KEY, projectId);
  }, [projectId]);

  const activeProject = useMemo(() => projects.find((project) => project.id === projectId) ?? null, [projects, projectId]);

  return (
    <ProjectContext.Provider value={{ projects, activeProject, projectId, loading, setProjectId, reloadProjects }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProjectContext must be used within ProjectProvider');
  return context;
}

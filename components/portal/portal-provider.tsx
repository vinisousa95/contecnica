"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { usePortalProjects } from "@/hooks/use-portal-project";

interface PortalContextType {
  projectId: string | null;
  setProjectId: (id: string) => void;
  projects: any[];
  isLoading: boolean;
}

const PortalContext = createContext<PortalContextType>({
  projectId: null,
  setProjectId: () => {},
  projects: [],
  isLoading: true,
});

export function usePortal() {
  return useContext(PortalContext);
}

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const { data: projects = [], isLoading } = usePortalProjects();
  const [projectId, setProjectIdState] = useState<string | null>(null);

  useEffect(() => {
    if (projects.length > 0 && !projectId) {
      const saved = localStorage.getItem("portal_project_id");
      const valid = saved && projects.find((p: any) => p.id === saved);
      setProjectIdState(valid ? saved : projects[0].id);
    }
  }, [projects, projectId]);

  const setProjectId = (id: string) => {
    localStorage.setItem("portal_project_id", id);
    setProjectIdState(id);
  };

  return (
    <PortalContext.Provider value={{ projectId, setProjectId, projects, isLoading }}>
      {children}
    </PortalContext.Provider>
  );
}

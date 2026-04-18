"use client";

import { useQuery } from "@tanstack/react-query";

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erro ao carregar dados");
  const json = await res.json();
  return json.data;
}

export function usePortalProjects() {
  return useQuery({
    queryKey: ["portal-projects"],
    queryFn: () => fetchJson("/api/portal/v1/projects"),
  });
}

export function usePortalProject(id: string) {
  return useQuery({
    queryKey: ["portal-project", id],
    queryFn: () => fetchJson(`/api/portal/v1/projects/${id}`),
    enabled: !!id,
  });
}

export function usePortalUpdates(projectId: string) {
  return useQuery({
    queryKey: ["portal-updates", projectId],
    queryFn: () => fetchJson(`/api/portal/v1/projects/${projectId}/updates`),
    enabled: !!projectId,
  });
}

export function usePortalFinancial(projectId: string) {
  return useQuery({
    queryKey: ["portal-financial", projectId],
    queryFn: () => fetchJson(`/api/portal/v1/projects/${projectId}/financial`),
    enabled: !!projectId,
  });
}

export function usePortalPhotos(projectId: string) {
  return useQuery({
    queryKey: ["portal-photos", projectId],
    queryFn: () => fetchJson(`/api/portal/v1/projects/${projectId}/photos`),
    enabled: !!projectId,
  });
}

export function usePortalDocuments(projectId: string) {
  return useQuery({
    queryKey: ["portal-documents", projectId],
    queryFn: () => fetchJson(`/api/portal/v1/projects/${projectId}/documents`),
    enabled: !!projectId,
  });
}

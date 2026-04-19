"use client";

import { useState } from "react";
import { usePortal } from "@/components/portal/portal-provider";
import { usePortalPhotos } from "@/hooks/use-portal-project";
import { LoadingPage } from "@/components/ui/loading";
import { formatDate } from "@/lib/utils";
import { Image, X, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

export default function PortalFotosPage() {
  const { projectId } = usePortal();
  const { data: photos = [], isLoading } = usePortalPhotos(projectId ?? "");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!projectId || isLoading) return <LoadingPage message="Carregando fotos..." />;

  // Group photos: first by task, then ungrouped
  const grouped: { taskName: string | null; isCompleted?: boolean; photos: any[] }[] = [];
  const taskMap = new Map<string, { taskName: string; isCompleted: boolean; photos: any[] }>();
  const ungrouped: any[] = [];

  for (const photo of photos) {
    if (photo.task) {
      if (!taskMap.has(photo.task.id)) {
        taskMap.set(photo.task.id, { taskName: photo.task.name, isCompleted: photo.task.isCompleted, photos: [] });
      }
      taskMap.get(photo.task.id)!.photos.push(photo);
    } else {
      ungrouped.push(photo);
    }
  }

  for (const [, group] of taskMap) grouped.push(group);
  if (ungrouped.length > 0) grouped.push({ taskName: null, photos: ungrouped });

  const allPhotos = photos; // flat list for lightbox

  const openLightbox = (photo: any) => setLightboxIndex(allPhotos.indexOf(photo));
  const closeLightbox = () => setLightboxIndex(null);
  const prev = () => setLightboxIndex((i) => (i !== null ? Math.max(0, i - 1) : null));
  const next = () => setLightboxIndex((i) => (i !== null ? Math.min(allPhotos.length - 1, i + 1) : null));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Fotos da Obra</h1>
        <p className="text-sm text-gray-500 mt-0.5">{photos.length} foto{photos.length !== 1 ? "s" : ""} disponível{photos.length !== 1 ? "s" : ""}</p>
      </div>

      {photos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Image className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma foto ainda</p>
          <p className="text-sm text-gray-400 mt-1">As fotos serão adicionadas durante a obra.</p>
        </div>
      ) : (
        grouped.map((group, gi) => (
          <div key={gi}>
            {/* group header */}
            <div className="flex items-center gap-2 mb-3">
              {group.taskName ? (
                <>
                  {group.isCompleted
                    ? <CheckCircle2 className="h-4 w-4 text-[#EA580C] flex-shrink-0" />
                    : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />}
                  <h2 className="text-sm font-semibold text-gray-800">{group.taskName}</h2>
                  {group.isCompleted && (
                    <span className="text-[10px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Concluído</span>
                  )}
                </>
              ) : (
                <h2 className="text-sm font-semibold text-gray-500">Fotos gerais</h2>
              )}
              <span className="text-xs text-gray-400">({group.photos.length})</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {group.photos.map((photo: any) => (
                <button
                  key={photo.id}
                  onClick={() => openLightbox(photo)}
                  className="group relative bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all aspect-square"
                >
                  <img
                    src={photo.imageUrl}
                    alt={photo.description ?? "Foto da obra"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  {photo.description && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                      <p className="text-white text-xs truncate">{photo.description}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button onClick={(e) => { e.stopPropagation(); closeLightbox(); }} className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X className="h-6 w-6" />
          </button>
          {lightboxIndex > 0 && (
            <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 text-white/70 hover:text-white">
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()} className="max-w-4xl w-full">
            <img
              src={allPhotos[lightboxIndex].imageUrl}
              alt={allPhotos[lightboxIndex].description ?? "Foto da obra"}
              className="w-full max-h-[80vh] object-contain rounded-lg"
            />
            {allPhotos[lightboxIndex].task && (
              <p className="text-[#EA580C] text-xs font-semibold text-center mt-3">
                {allPhotos[lightboxIndex].task.isCompleted ? "✓ " : ""}{allPhotos[lightboxIndex].task.name}
              </p>
            )}
            {allPhotos[lightboxIndex].description && (
              <p className="text-white/80 text-sm text-center mt-1">{allPhotos[lightboxIndex].description}</p>
            )}
            <p className="text-white/50 text-xs text-center mt-1">
              {lightboxIndex + 1} / {allPhotos.length} · {formatDate(allPhotos[lightboxIndex].createdAt)}
            </p>
          </div>
          {lightboxIndex < allPhotos.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 text-white/70 hover:text-white">
              <ChevronRight className="h-8 w-8" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

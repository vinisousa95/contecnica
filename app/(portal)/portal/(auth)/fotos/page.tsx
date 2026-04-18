"use client";

import { useState } from "react";
import { usePortal } from "@/components/portal/portal-provider";
import { usePortalPhotos } from "@/hooks/use-portal-project";
import { LoadingPage } from "@/components/ui/loading";
import { formatDate } from "@/lib/utils";
import { Image, X, ChevronLeft, ChevronRight } from "lucide-react";

export default function PortalFotosPage() {
  const { projectId } = usePortal();
  const { data: photos = [], isLoading } = usePortalPhotos(projectId ?? "");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!projectId || isLoading) return <LoadingPage message="Carregando fotos..." />;

  const openLightbox = (i: number) => setLightboxIndex(i);
  const closeLightbox = () => setLightboxIndex(null);
  const prev = () => setLightboxIndex((i) => (i !== null ? Math.max(0, i - 1) : null));
  const next = () => setLightboxIndex((i) => (i !== null ? Math.min(photos.length - 1, i + 1) : null));

  return (
    <div className="space-y-6">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((photo: any, i: number) => (
            <button
              key={photo.id}
              onClick={() => openLightbox(i)}
              className="group relative bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all aspect-square"
            >
              <img
                src={photo.imageUrl}
                alt={photo.description ?? "Foto da obra"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "";
                  e.currentTarget.style.background = "#f3f4f6";
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs truncate">{formatDate(photo.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            className="absolute top-4 right-4 text-white/70 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 text-white/70 hover:text-white"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          <div onClick={(e) => e.stopPropagation()} className="max-w-4xl w-full">
            <img
              src={photos[lightboxIndex].imageUrl}
              alt={photos[lightboxIndex].description ?? "Foto da obra"}
              className="w-full max-h-[80vh] object-contain rounded-lg"
            />
            {photos[lightboxIndex].description && (
              <p className="text-white/80 text-sm text-center mt-3">{photos[lightboxIndex].description}</p>
            )}
            <p className="text-white/50 text-xs text-center mt-1">
              {lightboxIndex + 1} / {photos.length} · {formatDate(photos[lightboxIndex].createdAt)}
            </p>
          </div>

          {lightboxIndex < photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 text-white/70 hover:text-white"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

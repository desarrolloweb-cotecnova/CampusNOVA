// Carrusel de fotos para la ficha de espacio físico
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Photo {
  id: string;
  url: string;
  descripcion?: string | null;
}

interface PhotoCarouselProps {
  photos: Photo[];
  canDelete?: boolean;
  onDelete?: (id: string) => void;
  /** URL de imagen de respaldo si no hay fotos */
  fallbackUrl?: string;
}

const DEFAULT_IMG = 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80';

export function PhotoCarousel({ photos, canDelete, onDelete, fallbackUrl }: PhotoCarouselProps) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const items = photos.length > 0 ? photos : [{ id: '__fallback', url: fallbackUrl || DEFAULT_IMG }];
  const current = items[Math.min(index, items.length - 1)];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  const goTo = (i: number) => setIndex(Math.max(0, Math.min(i, items.length - 1)));

  return (
    <>
      <div className="relative w-full aspect-[16/6] rounded-xl overflow-hidden bg-muted group">
        {/* Imagen principal */}
        <img
          key={current.url}
          src={current.url}
          alt={current.descripcion || 'Foto del espacio'}
          className="w-full h-full object-cover cursor-zoom-in transition-opacity duration-300"
          onError={e => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }}
          onClick={() => setLightbox(current.url)}
        />

        {/* Flechas de navegación */}
        {hasPrev && (
          <button
            onClick={e => { e.stopPropagation(); goTo(index - 1); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={e => { e.stopPropagation(); goTo(index + 1); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Foto siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Indicador de posición */}
        {items.length > 1 && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); goTo(i); }}
                className={`w-2 h-2 rounded-full transition-all ${i === index ? 'bg-white scale-125' : 'bg-white/50'}`}
                aria-label={`Ir a foto ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Contador */}
        {items.length > 1 && (
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/50 text-white text-xs font-medium">
            {index + 1} / {items.length}
          </div>
        )}

        {/* Botón eliminar foto actual */}
        {canDelete && onDelete && current.id !== '__fallback' && (
          <button
            onClick={e => {
              e.stopPropagation();
              onDelete(current.id);
              goTo(Math.max(0, index - 1));
            }}
            className="absolute top-3 left-3 flex items-center justify-center w-8 h-8 rounded-full bg-destructive/80 text-white hover:bg-destructive transition-colors"
            aria-label="Eliminar esta foto"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Miniaturas */}
      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
          {items.map((p, i) => (
            <button
              key={p.id}
              onClick={() => goTo(i)}
              className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === index ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}
              aria-label={`Miniatura ${i + 1}`}
            >
              <img
                src={p.url}
                alt={`Miniatura ${i + 1}`}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={open => { if (!open) setLightbox(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-4xl p-2 bg-black/90 border-0">
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-3 right-3 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
          <img
            src={lightbox ?? ''}
            alt="Vista ampliada"
            className="w-full h-auto max-h-[85dvh] object-contain rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

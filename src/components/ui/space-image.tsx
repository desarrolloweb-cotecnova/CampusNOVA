// Imagen de espacio físico con placeholder CampusNOVA mientras carga
import { useState, useRef, useEffect } from 'react';
import { FONDO_ESPACIO_URL as PLACEHOLDER } from '@/lib/assets';

interface SpaceImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

/**
 * Muestra la imagen real del espacio físico.
 * Mientras carga o si falla, muestra el logo CampusNOVA (Fondo.png)
 * con fondo verde corporativo.
 * Maneja imágenes en caché (onLoad puede disparar antes del montaje).
 */
export function SpaceImage({ src, alt, className = '' }: SpaceImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const showPlaceholder = !src || error;

  // Para imágenes en caché el navegador no dispara onLoad tras montaje;
  // verificamos img.complete en el siguiente frame de render.
  useEffect(() => {
    if (!src) return;
    setLoaded(false);
    setError(false);
    // Si ya está en caché, img.complete=true inmediatamente
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Capa placeholder: logo CampusNOVA con fondo verde */}
      <div
        className={`absolute inset-0 flex items-center justify-center bg-[#1a6637] transition-opacity duration-300 ${
          loaded && !showPlaceholder ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <img
          src={PLACEHOLDER}
          alt="CampusNOVA"
          className="w-3/4 max-w-[180px] object-contain drop-shadow-md"
        />
      </div>

      {/* Imagen real del espacio */}
      {!showPlaceholder && (
        <img
          ref={imgRef}
          src={src!}
          alt={alt}
          loading="lazy"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

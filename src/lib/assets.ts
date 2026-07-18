/**
 * Recursos de marca de CampusNOVA (logos y fondos).
 *
 * Estos archivos hoy se sirven temporalmente desde el CDN de Medo.dev.
 * Para independizarte por completo de Medo:
 *   1. Sube los archivos a la carpeta `public/` de este repo
 *      (por ejemplo public/logo-campusnova.png), o a tu propio Cloudinary.
 *   2. Reemplaza las URLs de abajo por la ruta local (p. ej. '/logo-campusnova.png')
 *      o por la URL de Cloudinary.
 *
 * Al estar centralizadas aquí, cambiarlas en un solo lugar actualiza toda la app.
 */

const MEDO_BASE =
  'https://miaoda-conversation-file.s3cdn.medo.dev/user-8u8uo5llzbwg/app-brs2m90lc35t';

/** Logo principal de CampusNOVA (encabezados, login, páginas públicas). */
export const LOGO_URL = `${MEDO_BASE}/20260606/Logo CampusNOVA.png`;

/** Variante del logo sobre fondo (footer del landing). */
export const LOGO_FONDO_URL = `${MEDO_BASE}/20260606/Logo CampusNOVA (Fondo).png`;

/** Imagen de fondo por defecto para tarjetas de espacios sin foto. */
export const FONDO_ESPACIO_URL = `${MEDO_BASE}/20260706/Fondo.png`;

/**
 * Recursos de marca de CampusNOVA (logos y fondos).
 *
 * Los logos son SVG propios servidos desde `public/` (independientes de Medo).
 * Al estar centralizados aquí, cambiarlos en un solo lugar actualiza toda la app.
 */

/** Logo a color — para fondos claros/blancos (login, encabezado, 2FA, landing). */
export const LOGO_URL = '/Logo_CampusNOVA_Color.svg';

/** Logo en versión clara — para fondos verdes/oscuros (footer del landing). */
export const LOGO_FONDO_URL = '/Logo_CampusNOVA_Verde.svg';

/**
 * Imagen de fondo por defecto para tarjetas de espacios sin foto.
 * (Aún alojada en el CDN de Medo — reemplázala por un archivo propio si lo deseas.)
 */
export const FONDO_ESPACIO_URL =
  'https://miaoda-conversation-file.s3cdn.medo.dev/user-8u8uo5llzbwg/app-brs2m90lc35t/20260706/Fondo.png';

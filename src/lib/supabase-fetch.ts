import type { PostgrestError } from '@supabase/supabase-js';

/** Filas que se piden por bloque. Coincide con el `db.max_rows` por defecto de Supabase. */
const BLOQUE = 1000;

/** Tope de bloques por consulta, como red de seguridad ante un bucle inesperado. */
const MAX_BLOQUES = 500;

/** Consulta de Supabase a la que todavía se le puede aplicar `.range()`. */
interface ConsultaPaginable<T> {
  range(desde: number, hasta: number): PromiseLike<{ data: T[] | null; error: PostgrestError | null }>;
}

/**
 * Trae **todas** las filas de una consulta, sin el tope de PostgREST.
 *
 * PostgREST limita cada respuesta a `db.max_rows` (1.000 filas por defecto en
 * Supabase), así que un `select()` sin paginar devuelve como máximo esa
 * cantidad aunque la tabla tenga más registros, y sin ningún error: la promesa
 * resuelve con éxito y los datos simplemente vienen recortados. Esta función
 * recorre la consulta por bloques con `.range()` hasta agotar los resultados.
 *
 * Dos condiciones para usarla bien:
 *
 * - `construirConsulta` debe crear una consulta **nueva** en cada llamada. Los
 *   query builders de supabase-js se consumen al ejecutarse y no se reutilizan.
 * - La consulta necesita un `order()` determinista. Si la columna de orden
 *   tiene valores repetidos (por ejemplo un `created_at` de una carga masiva),
 *   hay que agregar `.order('id')` como desempate; de lo contrario los bloques
 *   pueden solaparse y perder o duplicar filas.
 */
export async function fetchAllRows<T>(
  construirConsulta: () => ConsultaPaginable<T>,
  bloque: number = BLOQUE,
): Promise<{ data: T[]; error: PostgrestError | null }> {
  const filas: T[] = [];
  let desde = 0;

  for (let i = 0; i < MAX_BLOQUES; i++) {
    const { data, error } = await construirConsulta().range(desde, desde + bloque - 1);
    if (error) return { data: filas, error };

    const lote = data ?? [];
    filas.push(...lote);
    // Avanzamos por lo recibido —no por `bloque`— para que la paginación siga
    // siendo correcta si el servidor recorta el bloque con un `max_rows` menor.
    if (lote.length === 0) break;
    desde += lote.length;
  }

  return { data: filas, error: null };
}

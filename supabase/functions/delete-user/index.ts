// Edge Function: delete-user — CampusNOVA
// Elimina un usuario registrado usando la Admin API. Al borrar el usuario de
// auth.users se eliminan en cascada su perfil (profiles) y sus asignaciones de
// espacios (asignaciones_espacios), por las llaves foráneas ON DELETE CASCADE.
//
// Seguridad: solo un usuario con rol 'admin' o 'rector' puede invocarla, y no
// puede eliminarse a sí mismo (para no quedar bloqueado fuera del sistema).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Identificar al invocador a partir de su JWT (header Authorization).
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '').trim();
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: 'No autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(jwt);
    const callerId = callerData?.user?.id;
    if (callerErr || !callerId) {
      return new Response(
        JSON.stringify({ error: 'Sesión inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verificar que el invocador sea admin o rector.
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .maybeSingle();

    if (!callerProfile || !['admin', 'rector'].includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos para eliminar usuarios' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validar el usuario objetivo.
    const body = await req.json();
    const targetId: string | undefined = body?.userId?.trim();
    if (!targetId) {
      return new Response(
        JSON.stringify({ error: 'Falta el identificador del usuario a eliminar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (targetId === callerId) {
      return new Response(
        JSON.stringify({ error: 'No puedes eliminar tu propia cuenta' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Eliminar el usuario (cascada a profiles y asignaciones_espacios).
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(targetId);
    if (delErr) {
      console.error('[delete-user] Error al eliminar:', delErr.message);
      return new Response(
        JSON.stringify({ error: delErr.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[delete-user] Usuario ${targetId} eliminado por ${callerId}`);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const msg = (err as Error)?.message ?? 'Error interno';
    console.error('[delete-user] Error inesperado:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

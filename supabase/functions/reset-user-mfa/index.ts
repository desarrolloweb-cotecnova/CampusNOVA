// Edge Function: reset-user-mfa — CampusNOVA
// Restablece la verificación en dos pasos (TOTP) de un usuario: borra sus
// factores y cierra sus sesiones. En su siguiente inicio de sesión tendrá que
// escanear un código QR nuevo. La cuenta, su rol y sus datos no se tocan.
//
// Se hace en el servidor porque desde el cliente un usuario solo puede
// desenrolar sus *propios* factores (`auth.mfa.unenroll`); hacerlo sobre otro
// exige la service_role key.
//
// Seguridad: solo un usuario con rol 'admin' o 'rector' puede invocarla.
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

    // 1. Identificar al invocador a partir de su JWT.
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
        JSON.stringify({ error: 'No tienes permisos para restablecer la verificación en dos pasos' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validar el usuario objetivo.
    const body = await req.json();
    const targetId: string | undefined = body?.userId?.trim();
    if (!targetId) {
      return new Response(
        JSON.stringify({ error: 'Falta el identificador del usuario' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: target } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', targetId)
      .maybeSingle();

    if (!target) {
      return new Response(
        JSON.stringify({ error: 'El usuario no existe' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Borrar sus factores TOTP.
    const { data: factorList, error: listErr } =
      await supabaseAdmin.auth.admin.mfa.listFactors({ userId: targetId });
    if (listErr) {
      console.error('[reset-user-mfa] Error listando factores:', listErr.message);
      return new Response(
        JSON.stringify({ error: listErr.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const factors = factorList?.factors ?? [];
    for (const f of factors) {
      const { error: delErr } = await supabaseAdmin.auth.admin.mfa.deleteFactor({
        userId: targetId,
        id: f.id,
      });
      if (delErr) {
        console.error('[reset-user-mfa] Error eliminando factor:', delErr.message);
        return new Response(
          JSON.stringify({ error: delErr.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 5. Cerrar sus sesiones: siguen elevadas a AAL2 y mantendrían el acceso
    //    pese al restablecimiento. `auth.admin.signOut()` no sirve aquí porque
    //    recibe el JWT del propio usuario, no un userId, y el esquema `auth` no
    //    está expuesto por PostgREST: de ahí la función de la migración 00033.
    const { error: revokeErr } = await supabaseAdmin.rpc('admin_revoke_user_sessions', {
      target_user_id: targetId,
    });
    if (revokeErr) {
      // No es fatal: los factores ya se borraron y en el próximo inicio de
      // sesión se exigirá enrolar de nuevo.
      console.warn('[reset-user-mfa] No se pudieron cerrar las sesiones:', revokeErr.message);
    }

    console.log(`[reset-user-mfa] 2FA de ${targetId} restablecido por ${callerId}`);
    return new Response(
      JSON.stringify({
        success: true,
        email: target.email,
        removedFactors: factors.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const msg = (err as Error)?.message ?? 'Error interno';
    console.error('[reset-user-mfa] Error inesperado:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

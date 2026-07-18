// Edge Function: create-user — CampusNOVA
// Crea un usuario con email+contraseña directamente (sin envío de correo).
// El usuario queda con rol "responsable" y estado inactivo (activo=false).
// El administrador deberá completar el perfil y activarlo manualmente.
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

    const body = await req.json();
    const email: string | undefined = body?.email?.trim().toLowerCase();
    const password: string | undefined = body?.password;

    // Validaciones básicas
    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Correo electrónico inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!password || password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Crear usuario con Admin API — email_confirm: true para no enviar correo de verificación
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      console.error('[create-user] Error al crear usuario:', error.message);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uid = data?.user?.id;
    if (!uid) {
      return new Response(
        JSON.stringify({ error: 'No se pudo obtener el ID del usuario creado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Crear perfil base: rol responsable, estado inactivo
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: uid,
      email,
      nombre: null,
      cargo: null,
      role: 'responsable',
      activo: false,
    }, { onConflict: 'id', ignoreDuplicates: false });

    if (profileError) {
      console.error('[create-user] Error al crear perfil:', profileError.message);
      // El usuario auth ya fue creado; retornamos success aunque el perfil falle
      // para que el admin vea al usuario en la lista y pueda editar manualmente
    }

    console.log(`[create-user] Usuario creado: ${email} (uid: ${uid})`);
    return new Response(
      JSON.stringify({ success: true, userId: uid }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const msg = (err as Error)?.message ?? 'Error interno';
    console.error('[create-user] Error inesperado:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

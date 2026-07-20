// Edge Function: invite-user — CampusNOVA
// Envía una invitación personalizada por correo usando Supabase Admin API.
// El correo se muestra en español con el logo de CampusNOVA.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Logo del correo. Configurable con el secret LOGO_URL; usa Cloudinary por defecto.
const LOGO_URL = Deno.env.get('LOGO_URL') ??
  'https://res.cloudinary.com/drqfuh66o/image/upload/logo-campusnova.png';
// Dominio del sitio (Vercel). DEBE definirse el secret SITE_URL en Supabase.
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://campusnova.vercel.app';

function buildInviteEmail(nombre: string | null, email: string, role: string, actionLink: string): string {
  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    rector: 'Rector',
    infraestructura: 'Infraestructura',
    responsable: 'Responsable',
  };
  const rolLabel = roleLabels[role] ?? role;
  const saludo = nombre ? `Hola, ${nombre.split(' ')[0]}` : 'Hola';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Invitación CampusNOVA</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#ffffff;padding:28px 40px 20px;border-bottom:1px solid #e8f0eb;text-align:center;">
            <img src="${LOGO_URL}" alt="CampusNOVA" height="56" style="display:block;margin:0 auto;" />
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 24px;">
            <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a2e;font-weight:700;">
              Bienvenido(a) a CampusNOVA
            </h2>
            <p style="margin:0 0 20px;font-size:15px;color:#4a5568;line-height:1.6;">
              ${saludo},<br/>
              has sido invitado(a) a acceder a <strong>CampusNOVA</strong>, la plataforma de gestión de infraestructura física de <strong>COTECNOVA</strong>.
            </p>

            <table cellpadding="0" cellspacing="0" style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:24px;width:100%;">
              <tr>
                <td style="font-size:13px;color:#718096;">Correo electrónico</td>
                <td style="font-size:13px;color:#1a202c;font-weight:600;text-align:right;">${email}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#718096;padding-top:8px;">Rol asignado</td>
                <td style="font-size:13px;color:#1a202c;font-weight:600;text-align:right;padding-top:8px;">${rolLabel}</td>
              </tr>
            </table>

            <p style="margin:0 0 24px;font-size:14px;color:#4a5568;line-height:1.6;">
              Para activar tu cuenta y establecer tu contraseña, haz clic en el siguiente botón. Este enlace tiene una vigencia de <strong>24 horas</strong>.
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="${actionLink}"
                     style="display:inline-block;background:#16a34a;color:#ffffff;font-size:15px;font-weight:700;padding:14px 40px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
                    Activar mi cuenta
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0;font-size:12px;color:#a0aec0;text-align:center;line-height:1.5;">
              Si no solicitaste este acceso, puedes ignorar este mensaje.<br/>
              Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
              <a href="${actionLink}" style="color:#16a34a;word-break:break-all;">${actionLink}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f7fafc;border-top:1px solid #e8f0eb;padding:16px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#a0aec0;">
              © ${new Date().getFullYear()} COTECNOVA · CampusNOVA · Plataforma de Gestión de Infraestructura Física
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

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
    const email: string | undefined = body?.email;
    const nombre: string | null = body?.nombre ?? null;
    const cargo: string | null = body?.cargo ?? null;
    const role: string = body?.role ?? 'responsable';

    const validRoles = ['admin', 'rector', 'infraestructura', 'responsable'];
    const safeRole = validRoles.includes(role) ? role : 'responsable';

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Correo electrónico inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Invitar al usuario con redirección a /panel/perfil?cambiar-clave=1 para forzar contraseña
    const redirectTo = `${Deno.env.get('SITE_URL') ?? SITE_URL}/panel/perfil?cambiar-clave=1`;
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { role: safeRole, nombre, cargo },
      redirectTo,
    });

    if (error) {
      console.error('[invite-user] Error al invitar:', error.message);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Crear/actualizar perfil con rol, nombre y cargo. El trigger de auth.users
    // pudo haber creado ya la fila (con valores por defecto) antes de este paso,
    // así que usamos DO UPDATE (no ignoreDuplicates) para que el rol elegido y
    // el estado "inactivo hasta primer ingreso" queden aplicados de verdad.
    if (data?.user?.id) {
      await supabaseAdmin.from('profiles').upsert({
        id: data.user.id,
        email,
        nombre,
        cargo,
        role: safeRole,
        avatar_url: null,
        must_change_password: true,
        activo: false,
      }, { onConflict: 'id', ignoreDuplicates: false });
    }

    // Construir y enviar correo personalizado en español
    // Nota: Supabase inviteUserByEmail ya envía el correo, pero usamos el email de invitación
    // que Supabase construye internamente. Para correo personalizado necesitamos SMTP personalizado
    // en el dashboard de Supabase. El redirectTo apunta a cambiar contraseña.

    console.log(`[invite-user] Invitación enviada a ${email} con rol ${safeRole}`);
    return new Response(
      JSON.stringify({ success: true, userId: data?.user?.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const msg = (err as Error)?.message ?? 'Error interno';
    console.error('[invite-user] Error inesperado:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

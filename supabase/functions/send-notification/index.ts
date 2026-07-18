// Función Edge: send-notification
// Envía correos electrónicos transaccionales vía Resend
// Tipos: reserva_recibida, reserva_actualizada, novedad_recibida, novedad_actualizada

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ??
  'CampusNOVA COTECNOVA <notificaciones@cotecnova.edu.co>';
// Logo del correo. Configurable con el secret LOGO_URL; usa Cloudinary por defecto.
const LOGO_URL = Deno.env.get('LOGO_URL') ??
  'https://res.cloudinary.com/drqfuh66o/image/upload/logocotecnova.png';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Paleta institucional
const COLORS = {
  primary: '#00602F',
  secondary: '#EE7117',
  gray: '#525252',
  light: '#F9FAFB',
  white: '#FFFFFF',
};

// Plantilla HTML base
function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.light};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.light};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:${COLORS.white};border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <!-- Encabezado -->
        <tr><td style="background:${COLORS.primary};padding:24px 32px;text-align:center;">
          <img src="${LOGO_URL}" alt="COTECNOVA" height="56" style="display:block;margin:0 auto 8px auto;" />
          <p style="margin:4px 0 0 0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:0.5px;">
            CampusNOVA — Sistema de Gestión Institucional
          </p>
        </td></tr>
        <!-- Cuerpo -->
        <tr><td style="padding:32px;">${body}</td></tr>
        <!-- Pie -->
        <tr><td style="background:${COLORS.primary};padding:20px 32px;text-align:center;">
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;line-height:1.6;">
            Corporación de Estudios Tecnológicos del Norte del Valle — COTECNOVA<br/>
            Este correo es generado automáticamente. No responder directamente.<br/>
            <a href="mailto:soporte@cotecnova.edu.co" style="color:rgba(255,255,255,0.85);">soporte@cotecnova.edu.co</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Plantilla: Reserva recibida
function reservaRecibidaHtml(data: Record<string, string>): string {
  const body = `
    <h2 style="margin:0 0 4px 0;color:${COLORS.primary};font-size:22px;">Solicitud de Reserva Recibida</h2>
    <p style="margin:0 0 24px 0;color:${COLORS.gray};font-size:14px;">
      Hemos recibido tu solicitud. Será revisada por el equipo de infraestructura.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:${COLORS.light};border-radius:8px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;">
        <span style="color:${COLORS.gray};font-size:13px;">Número de solicitud</span><br/>
        <strong style="color:${COLORS.primary};font-size:16px;font-family:monospace;">${data.numero_solicitud}</strong>
      </td></tr>
      <tr><td style="padding:6px 0;border-top:1px solid #E5E7EB;">
        <span style="color:${COLORS.gray};font-size:13px;">Espacio solicitado</span><br/>
        <strong style="color:#111;font-size:14px;">${data.espacio_nombre}</strong>
      </td></tr>
      <tr><td style="padding:6px 0;border-top:1px solid #E5E7EB;">
        <span style="color:${COLORS.gray};font-size:13px;">Fecha</span><br/>
        <strong style="color:#111;font-size:14px;">${data.fecha_inicio}${data.fecha_fin && data.fecha_fin !== data.fecha_inicio ? ' al ' + data.fecha_fin : ''}</strong>
      </td></tr>
      <tr><td style="padding:6px 0;border-top:1px solid #E5E7EB;">
        <span style="color:${COLORS.gray};font-size:13px;">Horario</span><br/>
        <strong style="color:#111;font-size:14px;">${data.hora_inicio} – ${data.hora_fin}</strong>
      </td></tr>
      <tr><td style="padding:6px 0;border-top:1px solid #E5E7EB;">
        <span style="color:${COLORS.gray};font-size:13px;">Propósito</span><br/>
        <span style="color:#111;font-size:14px;">${data.proposito}</span>
      </td></tr>
    </table>
    <p style="color:${COLORS.gray};font-size:13px;margin:0;">
      Recibirás un correo con la decisión una vez sea revisada la solicitud.<br/>
      Ante dudas comunícate con <a href="mailto:infraestructura@cotecnova.edu.co"
        style="color:${COLORS.secondary};">infraestructura@cotecnova.edu.co</a>
    </p>`;
  return baseTemplate('Solicitud de Reserva — CampusNOVA', body);
}

// Plantilla: Actualización de estado de reserva
function reservaActualizadaHtml(data: Record<string, string>): string {
  const estadoColor: Record<string, string> = {
    Aprobada: '#16A34A', Confirmada: '#2563EB', Rechazada: '#DC2626', Cancelada: '#9CA3AF',
  };
  const color = estadoColor[data.nuevo_estado] || COLORS.secondary;
  const body = `
    <h2 style="margin:0 0 4px 0;color:${COLORS.primary};font-size:22px;">Actualización de tu Reserva</h2>
    <p style="margin:0 0 24px 0;color:${COLORS.gray};font-size:14px;">
      El estado de tu solicitud ha sido actualizado.
    </p>
    <div style="background:${COLORS.light};border-left:4px solid ${color};border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:24px;">
      <span style="font-size:12px;color:${COLORS.gray};text-transform:uppercase;letter-spacing:1px;">Nuevo estado</span><br/>
      <strong style="font-size:20px;color:${color};">${data.nuevo_estado}</strong>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:${COLORS.light};border-radius:8px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;">
        <span style="color:${COLORS.gray};font-size:13px;">Solicitud</span><br/>
        <strong style="color:${COLORS.primary};font-family:monospace;">${data.numero_solicitud}</strong>
      </td></tr>
      <tr><td style="padding:6px 0;border-top:1px solid #E5E7EB;">
        <span style="color:${COLORS.gray};font-size:13px;">Espacio</span><br/>
        <strong style="color:#111;">${data.espacio_nombre}</strong>
      </td></tr>
      <tr><td style="padding:6px 0;border-top:1px solid #E5E7EB;">
        <span style="color:${COLORS.gray};font-size:13px;">Fecha</span><br/>
        <strong style="color:#111;">${data.fecha_inicio}${data.fecha_fin && data.fecha_fin !== data.fecha_inicio ? ' al ' + data.fecha_fin : ''}</strong>
      </td></tr>
      ${data.observaciones ? `<tr><td style="padding:6px 0;border-top:1px solid #E5E7EB;">
        <span style="color:${COLORS.gray};font-size:13px;">Observaciones</span><br/>
        <span style="color:#111;">${data.observaciones}</span>
      </td></tr>` : ''}
    </table>
    <p style="color:${COLORS.gray};font-size:13px;margin:0;">
      Ante dudas comunícate con <a href="mailto:infraestructura@cotecnova.edu.co"
        style="color:${COLORS.secondary};">infraestructura@cotecnova.edu.co</a>
    </p>`;
  return baseTemplate('Actualización de Reserva — CampusNOVA', body);
}

// Plantilla: Novedad/incidente recibido
function novedadRecibidaHtml(data: Record<string, string>): string {
  const body = `
    <h2 style="margin:0 0 4px 0;color:${COLORS.primary};font-size:22px;">Novedad Reportada con Éxito</h2>
    <p style="margin:0 0 24px 0;color:${COLORS.gray};font-size:14px;">
      Tu reporte ha sido registrado en el sistema. El equipo de infraestructura lo revisará pronto.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:${COLORS.light};border-radius:8px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;">
        <span style="color:${COLORS.gray};font-size:13px;">Número de radicado</span><br/>
        <strong style="color:${COLORS.primary};font-size:16px;font-family:monospace;">${data.numero_radicado}</strong>
      </td></tr>
      <tr><td style="padding:6px 0;border-top:1px solid #E5E7EB;">
        <span style="color:${COLORS.gray};font-size:13px;">Tipo de novedad</span><br/>
        <strong style="color:#111;">${data.tipo_novedad}</strong>
      </td></tr>
      <tr><td style="padding:6px 0;border-top:1px solid #E5E7EB;">
        <span style="color:${COLORS.gray};font-size:13px;">Espacio</span><br/>
        <strong style="color:#111;">${data.espacio_nombre || 'No especificado'}</strong>
      </td></tr>
      <tr><td style="padding:6px 0;border-top:1px solid #E5E7EB;">
        <span style="color:${COLORS.gray};font-size:13px;">Descripción</span><br/>
        <span style="color:#111;font-size:14px;">${data.descripcion}</span>
      </td></tr>
    </table>
    <p style="color:${COLORS.gray};font-size:13px;margin:0;">
      Puedes hacer seguimiento usando tu número de radicado.<br/>
      Ante dudas escríbenos a <a href="mailto:infraestructura@cotecnova.edu.co"
        style="color:${COLORS.secondary};">infraestructura@cotecnova.edu.co</a>
    </p>`;
  return baseTemplate('Novedad Registrada — CampusNOVA', body);
}

// Plantilla: Actualización de novedad
function novedadActualizadaHtml(data: Record<string, string>): string {
  const estadoColor: Record<string, string> = {
    'Resuelto': '#16A34A', 'En revisión': '#2563EB', 'En proceso': '#D97706',
  };
  const color = estadoColor[data.nuevo_estado] || COLORS.secondary;
  const body = `
    <h2 style="margin:0 0 4px 0;color:${COLORS.primary};font-size:22px;">Actualización de Novedad</h2>
    <p style="margin:0 0 24px 0;color:${COLORS.gray};font-size:14px;">
      El estado de tu reporte ha cambiado.
    </p>
    <div style="background:${COLORS.light};border-left:4px solid ${color};border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:24px;">
      <span style="font-size:12px;color:${COLORS.gray};text-transform:uppercase;letter-spacing:1px;">Nuevo estado</span><br/>
      <strong style="font-size:20px;color:${color};">${data.nuevo_estado}</strong>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:${COLORS.light};border-radius:8px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;">
        <span style="color:${COLORS.gray};font-size:13px;">Radicado</span><br/>
        <strong style="color:${COLORS.primary};font-family:monospace;">${data.numero_radicado}</strong>
      </td></tr>
      <tr><td style="padding:6px 0;border-top:1px solid #E5E7EB;">
        <span style="color:${COLORS.gray};font-size:13px;">Tipo</span><br/>
        <strong style="color:#111;">${data.tipo_novedad}</strong>
      </td></tr>
      ${data.comentario ? `<tr><td style="padding:6px 0;border-top:1px solid #E5E7EB;">
        <span style="color:${COLORS.gray};font-size:13px;">Comentario del equipo</span><br/>
        <span style="color:#111;">${data.comentario}</span>
      </td></tr>` : ''}
    </table>
    <p style="color:${COLORS.gray};font-size:13px;margin:0;">
      Ante dudas escríbenos a <a href="mailto:infraestructura@cotecnova.edu.co"
        style="color:${COLORS.secondary};">infraestructura@cotecnova.edu.co</a>
    </p>`;
  return baseTemplate('Actualización de Novedad — CampusNOVA', body);
}

// Dispatcher de plantillas
function buildEmail(tipo: string, destinatario: string, nombre: string, data: Record<string, string>): {
  subject: string; html: string;
} {
  switch (tipo) {
    case 'reserva_recibida':
      return {
        subject: `✅ Solicitud ${data.numero_solicitud} recibida — CampusNOVA`,
        html: reservaRecibidaHtml(data),
      };
    case 'reserva_actualizada':
      return {
        subject: `📋 Tu reserva ${data.numero_solicitud} fue ${data.nuevo_estado} — CampusNOVA`,
        html: reservaActualizadaHtml(data),
      };
    case 'novedad_recibida':
      return {
        subject: `✅ Novedad ${data.numero_radicado} registrada — CampusNOVA`,
        html: novedadRecibidaHtml(data),
      };
    case 'novedad_actualizada':
      return {
        subject: `📋 Novedad ${data.numero_radicado}: ${data.nuevo_estado} — CampusNOVA`,
        html: novedadActualizadaHtml(data),
      };
    default:
      throw new Error(`Tipo de notificación desconocido: ${tipo}`);
  }
  // Silenciar warning de TS
  void destinatario;
  void nombre;
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY no configurada' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json() as {
      tipo: string;
      destinatario: string;
      nombre: string;
      data: Record<string, string>;
    };

    const { tipo, destinatario, nombre, data } = body;
    if (!tipo || !destinatario || !data) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos: tipo, destinatario, data' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const { subject, html } = buildEmail(tipo, destinatario, nombre || '', data);

    const resendResp = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [destinatario],
        subject,
        html,
      }),
    });

    const resendBody = await resendResp.json();

    if (!resendResp.ok) {
      console.error('Resend error:', resendBody);
      return new Response(
        JSON.stringify({ error: 'Error al enviar correo', detail: resendBody }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendBody.id }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});

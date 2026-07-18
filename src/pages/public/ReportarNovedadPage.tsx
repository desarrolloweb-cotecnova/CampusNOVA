import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/db/supabase';
import type { EspacioFisico, TipoNovedad, RolReportante } from '@/types/types';
import { generateRadicado } from '@/lib/utils';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { toast } from 'sonner';

import { LOGO_URL } from '@/lib/assets';

const TIPOS_NOVEDAD: TipoNovedad[] = [
  'Daño en equipamiento', 'Gotera/filtración de agua', 'Daño eléctrico',
  'Daño en mobiliario', 'Problema de seguridad', 'Aseo e higiene', 'Otro',
];

const ROLES: RolReportante[] = ['Estudiante', 'Docente', 'Administrativo', 'Visitante'];

export default function ReportarNovedadPage() {
  const navigate = useNavigate();
  const [espacios, setEspacios] = useState<EspacioFisico[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [radicado, setRadicado] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  const [form, setForm] = useState({
    nombre_reportante: '', correo_reportante: '', telefono_reportante: '',
    rol_reportante: 'Estudiante' as RolReportante,
    espacio_id: 'none', tipo_novedad: '' as TipoNovedad | '', descripcion: '', foto_url: '',
  });

  useEffect(() => {
    supabase.from('espacios_fisicos').select('id, nombre, sede').order('nombre').then(({ data }) => {
      setEspacios(Array.isArray(data) ? data as unknown as EspacioFisico[] : []);
    });
  }, []);

  const handleImageUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5MB'); return; }
    setUploadingImg(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setForm(f => ({ ...f, foto_url: url }));
      toast.success('Foto cargada');
    } catch { toast.error('Error al subir foto'); }
    setUploadingImg(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre_reportante.trim()) { toast.error('Ingresa tu nombre'); return; }
    if (!form.correo_reportante.trim()) { toast.error('Ingresa tu correo'); return; }
    if (!form.tipo_novedad) { toast.error('Selecciona el tipo de novedad'); return; }
    if (!form.descripcion.trim() || form.descripcion.length < 20) { toast.error('La descripción debe tener al menos 20 caracteres'); return; }

    setSubmitting(true);
    const numero_radicado = generateRadicado();

    const { error } = await supabase.from('novedades_incidentes').insert({
      numero_radicado,
      nombre_reportante: form.nombre_reportante.trim(),
      correo_reportante: form.correo_reportante.trim().toLowerCase(),
      telefono_reportante: form.telefono_reportante.trim() || null,
      rol_reportante: form.rol_reportante,
      espacio_id: form.espacio_id === 'none' ? null : form.espacio_id,
      espacio_nombre: form.espacio_id === 'none' ? null : espacios.find(e => e.id === form.espacio_id)?.nombre,
      tipo_novedad: form.tipo_novedad,
      descripcion: form.descripcion.trim(),
      foto_url: form.foto_url || null,
      estado: 'Recibido',
      prioridad: 'Media',
    });

    setSubmitting(false);
    if (error) { toast.error('Error al enviar el reporte: ' + error.message); return; }

    // Enviar notificación por correo (sin bloquear)
    supabase.functions.invoke('send-notification', {
      body: {
        tipo: 'novedad_recibida',
        destinatario: form.correo_reportante.trim().toLowerCase(),
        nombre: form.nombre_reportante.trim(),
        data: {
          numero_radicado,
          tipo_novedad: form.tipo_novedad,
          descripcion: form.descripcion.trim(),
          espacio_nombre: form.espacio_id === 'none'
            ? 'No especificado'
            : espacios.find(e => e.id === form.espacio_id)?.nombre || 'No especificado',
        },
      },
    }).catch(console.error);

    setRadicado(numero_radicado);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-hover">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">¡Reporte enviado!</h2>
            <p className="text-muted-foreground text-sm mb-4 text-pretty">
              Tu novedad ha sido registrada. Guarda este número de radicado para hacer seguimiento.
            </p>
            <div className="bg-muted rounded-lg p-4 mb-6">
              <p className="text-xs text-muted-foreground mb-1">Número de radicado</p>
              <p className="text-lg font-bold font-mono text-primary">{radicado}</p>
            </div>
            <div className="flex flex-col gap-2">
      <Button onClick={() => { setSubmitted(false); setForm({ nombre_reportante: '', correo_reportante: '', telefono_reportante: '', rol_reportante: 'Estudiante', espacio_id: 'none', tipo_novedad: '', descripcion: '', foto_url: '' }); }}>
                Reportar otra novedad
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Volver al inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b border-border py-4 px-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <img src={LOGO_URL} alt="COTECNOVA" className="h-10 w-auto object-contain" />
          <div>

          </div>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver al inicio
          </Button>
          <h1 className="text-2xl font-bold text-balance">Reportar una Novedad o Incidente</h1>
          <p className="text-muted-foreground text-sm mt-1 text-pretty">
            Utiliza este formulario para reportar daños, incidentes o situaciones anómalas en las instalaciones de COTECNOVA.
            No se requiere registro previo.
          </p>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tu nombre completo *</Label>
                  <Input
                    value={form.nombre_reportante}
                    onChange={e => setForm(f => ({ ...f, nombre_reportante: e.target.value }))}
                    placeholder="Nombre y apellido"
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Correo electrónico *</Label>
                  <Input
                    type="email"
                    value={form.correo_reportante}
                    onChange={e => setForm(f => ({ ...f, correo_reportante: e.target.value }))}
                    placeholder="tu@correo.com"
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Número de teléfono / celular</Label>
                  <Input
                    type="tel"
                    value={form.telefono_reportante}
                    onChange={e => setForm(f => ({ ...f, telefono_reportante: e.target.value }))}
                    placeholder="Ej: 3001234567"
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground">Opcional — para contactarte si necesitamos más información</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>¿Cuál es tu rol en COTECNOVA?</Label>
                <Select value={form.rol_reportante} onValueChange={v => setForm(f => ({ ...f, rol_reportante: v as RolReportante }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>¿En qué espacio ocurrió la novedad?</Label>
                <Select value={form.espacio_id} onValueChange={v => setForm(f => ({ ...f, espacio_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar espacio" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No sé / No aplica</SelectItem>
                    {espacios.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre} — {e.sede}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de novedad *</Label>
                <Select value={form.tipo_novedad} onValueChange={v => setForm(f => ({ ...f, tipo_novedad: v as TipoNovedad }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                  <SelectContent>{TIPOS_NOVEDAD.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Descripción detallada *</Label>
                <Textarea
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  rows={4}
                  placeholder="Describe con detalle la novedad, cuándo ocurrió y cuál es la situación actual. Mínimo 20 caracteres."
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">{form.descripcion.length} caracteres</p>
              </div>

              <div className="space-y-2">
                <Label>Foto del problema (opcional)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  {form.foto_url ? (
                    <div className="space-y-2">
                      <img src={form.foto_url} alt="Foto del problema" className="max-h-40 mx-auto rounded-lg object-cover" />
                      <Button variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, foto_url: '' }))}>
                        Quitar foto
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">Sube una foto del problema</p>
                      <input
                        type="file" accept="image/*" id="foto-novedad"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('foto-novedad')?.click()}
                        disabled={uploadingImg}
                      >
                        {uploadingImg ? 'Subiendo...' : 'Seleccionar imagen'}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                <p className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  Al enviar este formulario, recibirás un número de radicado para hacer seguimiento a tu reporte.
                  Nos comprometemos a gestionar tu solicitud a la brevedad posible.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Enviando reporte...' : 'Enviar Reporte'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

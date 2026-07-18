import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle, Users, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/db/supabase';
import type { EspacioFisico, TipoSolicitud, TipoSolicitante } from '@/types/types';
import { generateNumeroSolicitud, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

import { LOGO_URL } from '@/lib/assets';

const DEFAULT_IMG = 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&q=80';

export default function SolicitarEspacioPage() {
  const navigate = useNavigate();
  const [espacios, setEspacios] = useState<EspacioFisico[]>([]);
  const [selectedEspacio, setSelectedEspacio] = useState<EspacioFisico | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [numeroSolicitud, setNumeroSolicitud] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'catalog' | 'form'>('catalog');

  const [form, setForm] = useState({
    tipo: 'Reserva' as TipoSolicitud,
    nombre_solicitante: '', correo_solicitante: '', telefono_solicitante: '',
    tipo_solicitante: 'Interno' as TipoSolicitante,
    institucion: '', fecha_inicio: '', fecha_fin: '', hora_inicio: '', hora_fin: '',
    proposito: '', num_asistentes: '', requerimientos_especiales: '',
  });

  useEffect(() => {
    supabase.from('espacios_fisicos').select('*').eq('habilitado_reserva', true).order('nombre').then(({ data }) => {
      setEspacios(Array.isArray(data) ? data : []);
    });
  }, []);

  const selectEspacio = (e: EspacioFisico) => {
    setSelectedEspacio(e);
    setStep('form');
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!selectedEspacio) { toast.error('Selecciona un espacio'); return; }
    if (!form.nombre_solicitante.trim() || !form.correo_solicitante.trim()) { toast.error('Nombre y correo son obligatorios'); return; }
    if (!form.fecha_inicio || !form.fecha_fin) { toast.error('Las fechas son obligatorias'); return; }
    if (!form.proposito.trim()) { toast.error('Describe el propósito de la reserva'); return; }
    setSubmitting(true);
    const numero = generateNumeroSolicitud();
    const { error } = await supabase.from('reservas_alquileres').insert({
      numero_solicitud: numero,
      tipo: form.tipo,
      nombre_solicitante: form.nombre_solicitante.trim(),
      correo_solicitante: form.correo_solicitante.trim().toLowerCase(),
      telefono_solicitante: form.telefono_solicitante || null,
      tipo_solicitante: form.tipo_solicitante,
      institucion: form.institucion || null,
      espacio_id: selectedEspacio.id,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      hora_inicio: form.hora_inicio || null,
      hora_fin: form.hora_fin || null,
      proposito: form.proposito,
      num_asistentes: form.num_asistentes ? parseInt(form.num_asistentes) : null,
      requerimientos_especiales: form.requerimientos_especiales || null,
      estado: 'Recibida',
      valor_acordado: form.tipo === 'Alquiler' ? selectedEspacio.tarifa_alquiler : null,
    });
    setSubmitting(false);
    if (error) { toast.error('Error al enviar solicitud: ' + error.message); return; }

    // Enviar notificación por correo (sin bloquear)
    supabase.functions.invoke('send-notification', {
      body: {
        tipo: 'reserva_recibida',
        destinatario: form.correo_solicitante.trim().toLowerCase(),
        nombre: form.nombre_solicitante.trim(),
        data: {
          numero_solicitud: numero,
          espacio_nombre: selectedEspacio.nombre,
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin,
          hora_inicio: form.hora_inicio || '',
          hora_fin: form.hora_fin || '',
          proposito: form.proposito,
        },
      },
    }).catch(console.error);

    setNumeroSolicitud(numero);
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
            <h2 className="text-xl font-bold mb-2">¡Solicitud enviada!</h2>
            <p className="text-muted-foreground text-sm mb-4 text-pretty">
              Tu solicitud de {form.tipo.toLowerCase()} ha sido registrada y está en revisión.
            </p>
            <div className="bg-muted rounded-lg p-4 mb-6">
              <p className="text-xs text-muted-foreground mb-1">Número de solicitud</p>
              <p className="text-lg font-bold font-mono text-primary">{numeroSolicitud}</p>
            </div>
            <div className="flex flex-col gap-2">
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
      <header className="py-4 px-4 bg-[#ffffff] bg-none">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <img src={LOGO_URL} alt="COTECNOVA" className="h-10 w-auto object-contain" />
          <div>

          </div>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => step === 'form' ? setStep('catalog') : navigate('/')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> {step === 'form' ? 'Volver al catálogo' : 'Volver al inicio'}
        </Button>

        {step === 'catalog' && (
          <>
            <h1 className="text-2xl font-bold mb-2 text-balance">Espacios Disponibles</h1>
            <p className="text-muted-foreground text-sm mb-6 text-pretty">
              Selecciona un espacio para realizar tu solicitud de reserva o alquiler.
            </p>
            {espacios.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="text-center py-16">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-muted-foreground">No hay espacios disponibles en este momento</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {espacios.map(e => (
                  <Card key={e.id} className="h-full flex flex-col overflow-hidden shadow-card hover:shadow-hover transition-shadow cursor-pointer" onClick={() => selectEspacio(e)}>
                    <div className="aspect-[4/3] overflow-hidden bg-muted">
                      <img
                        src={e.foto_principal_url || DEFAULT_IMG}
                        alt={e.nombre}
                        className="w-full h-full object-cover"
                        onError={ev => { (ev.target as HTMLImageElement).src = DEFAULT_IMG; }}
                      />
                    </div>
                    <CardContent className="flex-1 flex flex-col p-4">
                      <h3 className="font-semibold text-sm mb-1 text-balance">{e.nombre}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{e.sede}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        {e.capacidad_personas && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{e.capacidad_personas} pers.</span>}
                        {e.area_m2 && <span>{e.area_m2} m²</span>}
                      </div>
                      {e.tarifa_alquiler && (
                        <p className="text-xs font-medium text-secondary mb-3">Alquiler: {formatCurrency(e.tarifa_alquiler)}/día</p>
                      )}
                      <Button className="mt-auto" size="sm" onClick={() => selectEspacio(e)}>
                        <Calendar className="h-3.5 w-3.5 mr-1.5" /> Solicitar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {step === 'form' && selectedEspacio && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                <img src={selectedEspacio.foto_principal_url || DEFAULT_IMG} alt={selectedEspacio.nombre} className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedEspacio.nombre}</h2>
                <p className="text-sm text-muted-foreground">{selectedEspacio.sede}</p>
                {selectedEspacio.tarifa_alquiler && (
                  <p className="text-sm text-secondary font-medium">Tarifa: {formatCurrency(selectedEspacio.tarifa_alquiler)}/día</p>
                )}
              </div>
            </div>

            <Card className="shadow-card">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label>Tipo de solicitud *</Label>
                    <div className="flex gap-3">
                      {(['Reserva', 'Alquiler'] as TipoSolicitud[]).map(t => (
                        <button
                          key={t} type="button"
                          onClick={() => setForm(f => ({ ...f, tipo: t }))}
                          className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${form.tipo === t ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}
                        >
                          {t}
                          {t === 'Reserva' && <span className="block text-xs font-normal text-muted-foreground">Uso interno gratuito</span>}
                          {t === 'Alquiler' && <span className="block text-xs font-normal text-muted-foreground">Uso externo con tarifa</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre completo *</Label>
                      <Input value={form.nombre_solicitante} onChange={e => setForm(f => ({ ...f, nombre_solicitante: e.target.value }))} placeholder="Nombre y apellido" />
                    </div>
                    <div className="space-y-2">
                      <Label>Correo electrónico *</Label>
                      <Input type="email" value={form.correo_solicitante} onChange={e => setForm(f => ({ ...f, correo_solicitante: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input value={form.telefono_solicitante} onChange={e => setForm(f => ({ ...f, telefono_solicitante: e.target.value }))} placeholder="+57 300 000 0000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de solicitante</Label>
                      <Select value={form.tipo_solicitante} onValueChange={v => setForm(f => ({ ...f, tipo_solicitante: v as TipoSolicitante }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Interno">Interno (COTECNOVA)</SelectItem>
                          <SelectItem value="Externo">Externo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {form.tipo_solicitante === 'Externo' && (
                      <div className="space-y-2">
                        <Label>Institución / Empresa</Label>
                        <Input value={form.institucion} onChange={e => setForm(f => ({ ...f, institucion: e.target.value }))} />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Fecha inicio *</Label>
                      <Input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} min={new Date().toISOString().slice(0, 10)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha fin *</Label>
                      <Input type="date" value={form.fecha_fin} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))} min={form.fecha_inicio || new Date().toISOString().slice(0, 10)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora inicio</Label>
                      <Input type="time" value={form.hora_inicio} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora fin</Label>
                      <Input type="time" value={form.hora_fin} onChange={e => setForm(f => ({ ...f, hora_fin: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Número de asistentes</Label>
                      <Input type="number" value={form.num_asistentes} onChange={e => setForm(f => ({ ...f, num_asistentes: e.target.value }))} max={selectedEspacio.capacidad_personas || 9999} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Propósito del evento *</Label>
                    <Textarea value={form.proposito} onChange={e => setForm(f => ({ ...f, proposito: e.target.value }))} rows={3} placeholder="Describe el evento o actividad a realizar..." />
                  </div>

                  <div className="space-y-2">
                    <Label>Requerimientos especiales</Label>
                    <Textarea value={form.requerimientos_especiales} onChange={e => setForm(f => ({ ...f, requerimientos_especiales: e.target.value }))} rows={2} placeholder="Equipamiento, mobiliario especial, etc." />
                  </div>

                  {form.tipo === 'Alquiler' && selectedEspacio.tarifa_alquiler && (
                    <div className="bg-secondary/10 rounded-lg p-4">
                      <p className="text-sm font-medium text-secondary">Tarifa de alquiler</p>
                      <p className="text-xl font-bold text-secondary">{formatCurrency(selectedEspacio.tarifa_alquiler)}/día</p>
                      <p className="text-xs text-muted-foreground mt-1">El pago se confirma una vez aprobada la solicitud</p>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Enviando solicitud...' : `Enviar Solicitud de ${form.tipo}`}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

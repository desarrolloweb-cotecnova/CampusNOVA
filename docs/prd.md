# Documento de Requisitos

## 1. Descripción General de la Aplicación

### 1.1 Nombre y Propósito
- **Nombre:** CampusNOVA
- **Institución:** Corporación de Estudios Tecnológicos del Norte del Valle — COTECNOVA
- **Ubicación:** Cartago, Valle del Cauca, Colombia
- **Propósito:** Plataforma institucional integral para la gestión de infraestructura física, activos fijos, novedades e incidentes, y reservas/alquileres de espacios

### 1.2 Identidad Visual
- **Color Principal:** #00602F (verde institucional)
- **Color Secundario:** #EE7117 (naranja)
- **Color Terciario:** #525252 (gris oscuro)
- **Fondo:** #FFFFFF (blanco)
- **Logo:** https://miaoda-conversation-file.s3cdn.medo.dev/user-8u8uo5llzbwg/app-brs2m90lc35t/20260520/logocotecnova.png

## 2. Usuarios y Roles

### 2.1 Usuarios Internos (requieren autenticación)

#### Administrador
- Acceso total al sistema
- Gestiona usuarios, roles y configuración general
- Acceso a todos los módulos

#### Infraestructura Física
- Gestiona activos fijos
- Gestiona espacios físicos
- Responde y da seguimiento a novedades/incidentes
- Aprueba reservas y alquileres

#### Rectoría
- Acceso de consulta a todos los módulos
- Aprueba intervenciones de alto costo
- Visualiza dashboards y reportes

### 2.2 Usuarios Externos (sin autenticación)
- Acceden al formulario de reporte de novedades e incidentes
- Acceden al formulario de solicitud de reservas y alquileres
- Visualizan la landing page pública

## 3. Estructura de Páginas y Funcionalidades

### Árbol de Navegación

```
CampusNOVA
├── Landing Page Pública (sin autenticación)
│   ├── Hero/Banner
│   ├── Servicios para usuarios registrados
│   ├── Servicios para usuarios externos
│   ├── Catálogo de espacios reservables
│   ├── Calendario público
│   └── Pie de página
├── Autenticación
│   ├── Inicio de sesión
│   ├── Registro de usuarios (URL oculta: /registro)
│   └── Recuperación de contraseña
└── Panel Interno (requiere autenticación)
    ├── Dashboard General
    ├── Módulo de Activos Fijos
    │   ├── Listado de activos
    │   ├── Registro de activo
    │   ├── Gestión de movimientos
    │   ├── Baja de activos
    │   ├── Depreciación
    │   ├── Dashboard de activos
    │   └── Reportes
    ├── Módulo de Espacios Físicos
    │   ├── Listado de espacios
    │   ├── Ficha técnica de espacio
    │   ├── Planos y documentación
    │   ├── Gestión de intervenciones
    │   ├── Dashboard de espacios
    │   └── Reportes
    ├── Módulo de Novedades e Incidentes
    │   ├── Listado de novedades
    │   ├── Vista detallada de novedad
    │   ├── Gestión de seguimiento
    │   ├── Dashboard de novedades
    │   └── Reportes
    ├── Módulo de Reservas y Alquileres
    │   ├── Listado de solicitudes
    │   ├── Gestión de aprobación
    │   ├── Calendario de espacios
    │   ├── Dashboard de reservas
    │   └── Reportes
    ├── Administración (solo Administrador)
    │   ├── Gestión de usuarios
    │   ├── Gestión de catálogos
    │   ├── Configuración de espacios reservables
    │   └── Logs de auditoría
    └── Mi Perfil
```

### 3.1 Landing Page Pública

#### 3.1.1 Hero/Banner
- Muestra el nombre \"CampusNOVA\"
- Muestra el logo de COTECNOVA
- Muestra el tagline: \"La plataforma de gestión inteligente de la infraestructura de COTECNOVA\"
- Botón \"Iniciar sesión\" que redirige a la página de autenticación
- Botón \"Reportar una novedad\" que redirige al formulario público de reporte

#### 3.1.2 Servicios para Usuarios Registrados
- Lista los servicios disponibles para usuarios internos:
  + Gestión de Activos Fijos
  + Gestión de Espacios Físicos
  + Gestión de Novedades e Incidentes (seguimiento interno)
  + Gestión de Reservas y Alquileres

#### 3.1.3 Servicios para Usuarios Externos
- Lista los servicios disponibles sin registro:
  + Reporte de novedades e incidentes
  + Solicitud de reservas y alquileres

#### 3.1.4 Catálogo de Espacios Reservables
- Muestra tarjetas de espacios disponibles para reserva/alquiler
- Cada tarjeta incluye: foto, nombre del espacio, capacidad, estado de disponibilidad

#### 3.1.5 Calendario Público
- Muestra calendario mensual con espacios reservados y alquilados
- Diferencia visual entre reservas (verde) y alquileres (naranja)
- No muestra datos personales de los solicitantes

#### 3.1.6 Pie de Página
- Información institucional
- Dirección: Cartago, Valle del Cauca
- Logo de COTECNOVA

#### 3.1.7 Navbar
- Logo de COTECNOVA a la izquierda
- Botón \"Ingresar\" a la derecha

### 3.2 Autenticación

#### 3.2.1 Inicio de Sesión
- Campo de correo electrónico
- Campo de contraseña
- Botón \"Iniciar sesión\"
- Enlace \"¿Olvidaste tu contraseña?\"

#### 3.2.2 Registro de Usuarios (URL oculta: /registro)
- Accesible únicamente mediante la URL directa /registro
- No aparece enlazada en el menú de navegación, landing page ni pie de página
- Formulario con campos:
  + Nombre completo
  + Correo electrónico
  + Contraseña
  + Confirmación de contraseña
  + Cargo
  + Rol (selección: admin, infraestructura, rectoria)
- Botón \"Registrar usuario\"
- Después del registro exitoso, redirige a la página de inicio de sesión (/login)
- Crea registro en Supabase Auth y en la tabla profiles con los campos: id, email, nombre, cargo, role, activo (por defecto true), created_at, updated_at

#### 3.2.3 Recuperación de Contraseña
- Campo de correo electrónico
- Botón \"Enviar enlace de recuperación\"
- Envía correo con enlace para restablecer contraseña

### 3.3 Panel Interno

#### 3.3.1 Sidebar de Navegación
- Dashboard General
- Activos Fijos
- Espacios Físicos
- Novedades e Incidentes
- Reservas y Alquileres
- Administración (visible solo para Administrador)
- Mi Perfil

#### 3.3.2 Dashboard General
- Resumen de indicadores clave de todos los módulos
- Accesos rápidos a funciones principales

### 3.4 Módulo de Activos Fijos

#### 3.4.1 Listado de Activos
- Tabla con columnas: código, nombre, categoría, ubicación, responsable, estado, valor
- Filtros por: ubicación/espacio, categoría, responsable, estado, depreciable/no depreciable
- Búsqueda por código o nombre
- Indicador visual de estado con colores
- Botón \"Exportar a Excel\"
- Botón \"Exportar a PDF\"
- Botón \"Registrar nuevo activo\"
- **Botón \"Importar desde Excel\"** que permite cargar archivo .xlsx con activos en masa
- **Agrupación por Espacios Físicos:** el listado se organiza mediante acordeón o selector por espacio físico, mostrando los activos ubicados en cada espacio

#### 3.4.2 Registro de Nuevo Activo
- Formulario con campos:
  + Código (único)
  + Nombre
  + Valor (pesos colombianos)
  + Fecha de adquisición
  + Número de factura
  + IVA (porcentaje)
  + Depreciable (toggle SI/NO)
  + Tiempo de depreciación (años, visible solo si Depreciable = SI)
  + Estado (selección: En funcionamiento, Daño parcial, Dado de baja, En reparación)
  + Ubicación (selección de espacio físico)
  + Categoría (selección: ESCRITORIO, SILLAS, CUADROS, OBJETO, MODULO, HERRAMIENTA, CAJA CON CONTENIDO, MESAS, ARCHIVADOR, REVISTERO, ESTANTERÍA, CÁMARA IP, REGULADOR DE VOLTAJE, TABLERO, EQUIPOS DE COMPUTO, PUPITRE, VITRINA, RELOJES, MICROSCOPIO, MÓDULO)
  + Responsable (selección de usuario/colaborador)
  + Proveedor
  + Documento PDF (subida de archivo a Supabase Storage)
  + **Imagen del activo (subida a Cloudinary usando cloud name: drqfuh66o, upload preset: campusnova, variable de entorno: VITE_CLOUDINARY_CLOUD_NAME=drqfuh66o, VITE_CLOUDINARY_UPLOAD_PRESET=campusnova)**
  + Observaciones
- Botón \"Guardar activo\"
- Si Depreciable = SI, calcula automáticamente depreciación anual (valor / tiempo_depreciacion)

#### 3.4.3 Gestión de Movimientos
- **Botón \"Registrar Movimiento\"** que abre formulario con campos:
  + Activo (selección)
  + Tipo de movimiento (selección)
  + Espacio origen (selección de espacio físico)
  + Espacio destino (selección de espacio físico)
  + Responsable que entrega (selección de usuario)
  + Responsable que recibe (selección de usuario)
  + Aprobador (selección de usuario)
  + Fecha del movimiento
  + Motivo
  + Observaciones
- Botón \"Guardar movimiento\"
- **Generación de Acta de Movimiento:** al guardar el movimiento, permite generar un acta imprimible (PDF o ventana de impresión) con los datos del movimiento y espacios para firma de: persona que entrega, persona que recibe, persona que aprueba
- **Historial completo:**
  + Muestra todos los movimientos, cambios de responsable y estados de cada activo
  + Ordenado por fecha descendente

#### 3.4.4 Baja de Activos
- Formulario con campos:
  + Activo (selección)
  + Motivo (selección: deterioro, robo, obsolescencia, donación, otro)
  + Fecha de baja
  + Descripción
  + Acta de baja (adjunto PDF)
- Botón \"Registrar baja\"
- Cambia el estado del activo a \"Dado de baja\"
- Los activos dados de baja no aparecen en el inventario activo por defecto
- Pueden consultarse mediante filtro específico

#### 3.4.5 Depreciación
- Para activos depreciables, muestra:
  + Valor inicial
  + Depreciación anual (calculada)
  + Años transcurridos desde adquisición
  + Valor actual estimado
  + Porcentaje de vida útil consumida (barra de progreso)

#### 3.4.6 Dashboard de Activos
- Total de activos activos
- Gráfica de barras: activos por espacio
- Gráfica de torta: activos por categoría
- Indicador: activos depreciables vs. no depreciables
- Indicador: activos por estado
- Lista de últimos movimientos registrados

#### 3.4.7 Reportes
- Informe de inventario general (Excel/PDF)
- Informe de activos por espacio (Excel/PDF)
- Informe de activos por responsable (Excel/PDF)
- Informe de activos dados de baja (Excel/PDF)
- Informe de depreciación (Excel/PDF)

### 3.5 Módulo de Espacios Físicos

#### 3.5.1 Listado de Espacios
- Tabla con columnas: código, nombre, sede, bloque, tipo, área, capacidad, estado
- Filtros por: sede, bloque, tipo, estado
- Búsqueda por código o nombre
- Botón \"Registrar nuevo espacio\"

#### 3.5.2 Ficha Técnica de Espacio
- Información del espacio:
  + Código de identificación (formato: [SEDE]-[BLOQUE]-[TIPO]-[NÚMERO])
  + Nombre
  + Sede y bloque
  + Piso
  + Tipo (AUL, LAB, ADM, BAÑ, BOD, AUD, SAL, PAR, CUL, HOT)
  + Uso actual
  + Área (m²)
  + Capacidad
  + Características técnicas (instalaciones eléctricas, hidráulicas, sanitarias)
  + Estado (Bueno, Regular, Requiere intervención)
  + Fotografías actuales (múltiples imágenes desde Cloudinary)
  + Observaciones
  + Fecha de última actualización
- Sección de historial de intervenciones realizadas
- Sección de activos fijos ubicados en el espacio
- Botón \"Editar ficha\"

#### 3.5.3 Planos y Documentación Técnica
- Sección para subir archivos:
  + Planos arquitectónicos
  + Planos de redes eléctricas
  + Planos de redes hidráulicas
  + Planos de redes sanitarias
  + Memorias técnicas de obras
  + Licencias y permisos
- Lista de archivos subidos con nomenclatura: AAAAMMDD_TipoDocumento_CodigoEspacio_Descripcion
- Botón \"Subir archivo\"

#### 3.5.4 Gestión de Intervenciones

##### Solicitud de Intervención
- Formulario con campos:
  + Espacio físico (código)
  + Descripción del problema
  + Tipo de intervención (Mantenimiento preventivo, Mantenimiento correctivo, Remodelación, Adecuación, Construcción nueva, Modificación en instalaciones eléctricas, Modificación en instalaciones hidráulicas, Reparación de emergencia)
  + Justificación
  + Área solicitante
  + Fecha de solicitud
  + Prioridad (Alta, Media, Baja)
- Botón \"Enviar solicitud\"

##### Flujo de Autorización
- Estados: Solicitud → Revisión por Infraestructura Física → Aprobación (Rectoría si aplica por monto) → En ejecución → Finalizado
- Cambio de estado con registro de fecha y usuario

##### Bitácora de Intervención
- Formulario con campos:
  + Código de intervención (consecutivo anual)
  + Espacio intervenido
  + Tipo de intervención
  + Fecha de inicio
  + Fecha de fin
  + Contratista/responsable
  + Descripción de trabajos realizados
  + Materiales utilizados
  + Costo
  + Foto antes (Cloudinary)
  + Foto durante (Cloudinary)
  + Foto después (Cloudinary)
  + Observaciones
  + Responsable de seguimiento
- Botón \"Guardar bitácora\"

##### Acta de Recibo de Obra
- Formulario con campos:
  + Intervención (selección)
  + Verificación de especificaciones
  + Estado final
  + Observaciones
  + Firmas digitales de responsables
- Botón \"Generar acta\"

##### Reporte de No Conformidades
- Formulario con campos:
  + Intervención (selección)
  + Descripción del problema detectado
  + Evidencia fotográfica (Cloudinary)
  + Acción correctiva
  + Plazo
  + Responsable
- Seguimiento hasta cierre
- Botón \"Registrar no conformidad\"

#### 3.5.5 Dashboard de Espacios
- Porcentaje de espacios con ficha técnica actualizada
- Porcentaje de intervenciones documentadas vs. realizadas
- Tiempo promedio de respuesta a solicitudes
- Cumplimiento del plan anual de mantenimiento
- Número de no conformidades detectadas
- Gráfica de estado general de espacios (Bueno, Regular, Requiere intervención)

#### 3.5.6 Reportes
- Informe de gestión trimestral (Excel/PDF)
- Plan de mantenimiento anual (Excel/PDF)
- Ficha técnica individual por espacio (PDF)
- Listado de intervenciones por periodo (Excel/PDF)

### 3.6 Módulo de Novedades e Incidentes

#### 3.6.1 Formulario Público de Reporte (sin autenticación)
- Accesible desde la landing page
- Campos:
  + Nombre del reportante (obligatorio)
  + Correo electrónico (obligatorio)
  + Rol (Estudiante, Docente, Administrativo, Visitante)
  + Espacio físico afectado (lista desplegable de todos los espacios)
  + Tipo de novedad (Daño en equipamiento, Gotera/filtración de agua, Daño eléctrico, Daño en mobiliario, Problema de seguridad, Aseo e higiene, Otro)
  + Descripción detallada
  + Fotografía del problema (opcional, Cloudinary)
  + Prioridad percibida (Urgente, Normal)
- Botón \"Enviar reporte\"
- Al enviar: muestra número de radicado y mensaje de confirmación
- Envía correo automático al reportante con el número de radicado

#### 3.6.2 Gestión Interna de Novedades
- Listado de novedades con filtros por: estado, espacio, tipo, prioridad, fecha
- **En el listado, permite visualizar la imagen adjunta que cargó el reportante**
- Vista detallada de cada novedad con toda la información del reporte
- Cambio de estado: Recibido → En revisión → En gestión → Resuelto → Cerrado
- Asignación de responsable interno
- Bitácora de seguimiento con registro de acciones (fecha, responsable, descripción)
- **Al cerrar una novedad, permite cargar una imagen de evidencia del trabajo realizado (usando Cloudinary con cloud name: drqfuh66o, upload preset: campusnova)**
- Vinculación con solicitud de intervención del Módulo de Espacios Físicos
- Notificación automática al reportante al cambiar estado
- Botón \"Exportar a Excel\"
- Botón \"Exportar a PDF\"

#### 3.6.3 Dashboard de Novedades
- Total de novedades por estado
- Gráfica de novedades por espacio físico
- Gráfica de novedades por tipo
- Tiempo promedio de resolución
- Alerta visual de novedades urgentes pendientes

### 3.7 Módulo de Reservas y Alquileres

#### 3.7.1 Catálogo Público de Espacios
- Muestra espacios habilitados para reserva/alquiler:
  + Auditorio Paraninfo
  + Salón Cultural / Salón Múltiple
  + Aulas (A2, A4, A11, A12, A16, B1, B4, etc.)
  + Laboratorios de cómputo (Laboratorio A, B, C)
  + Laboratorios especializados (Idiomas, Ciencias Básicas, Energías Renovables, Electricidad)
  + Otros espacios habilitados por el administrador
- Cada espacio muestra: foto, capacidad máxima, equipamiento disponible, tarifa de alquiler, disponibilidad en calendario

#### 3.7.2 Formulario Público de Solicitud (sin autenticación)
- Accesible desde la landing page
- Campos:
  + Tipo de solicitud (Reserva sin costo, Alquiler con costo)
  + Nombre completo del solicitante
  + Correo electrónico
  + Teléfono de contacto
  + Tipo de solicitante (Interno: docente/administrativo, Externo: empresa/persona natural)
  + Institución u organización (si aplica)
  + Espacio solicitado (selección del catálogo)
  + Fecha(s) solicitada(s)
  + Horario(s) solicitado(s)
  + Propósito o descripción del evento
  + Número estimado de asistentes
  + Requerimientos especiales
- Botón \"Enviar solicitud\"
- Al enviar: muestra número de solicitud y mensaje de confirmación
- Envía correo automático al solicitante

#### 3.7.3 Calendario de Espacios (/panel/reservas/calendario)
- **Tres vistas disponibles: mensual, semanal y diaria**
- **Botones para cambiar entre las tres vistas**
- **Vista mensual:** calendario tradicional con eventos del mes
- **Vista semanal:** columnas por día de la semana mostrando los eventos de cada día
- **Vista diaria:** bloques por hora mostrando los eventos del día seleccionado
- Muestra reservas en verde y alquileres en naranja
- Al hacer clic en un evento, muestra detalles de la reserva/alquiler
- Los usuarios externos no ven datos personales del solicitante

#### 3.7.4 Gestión Interna de Reservas/Alquileres
- Listado de solicitudes con filtros por: tipo (reserva/alquiler), estado, espacio, fecha
- Flujo de aprobación: Solicitud recibida → En revisión → Aprobada/Rechazada → Confirmada
- Para alquileres, registro de:
  + Valor acordado
  + Forma de pago
  + Número de recibo/factura
  + Fecha de pago
  + Estado de pago (Pendiente, Pagado)
- Notificación automática al solicitante con la decisión
- Al aprobar, bloquea el espacio en el calendario para las fechas solicitadas
- Cancelación de reservas con notificación al solicitante

#### 3.7.5 Dashboard de Reservas (/panel/reservas/dashboard)
- **Listado de todos los espacios físicos**
- **Para cada espacio:**
  + **Toggle para habilitar/deshabilitar disponibilidad para reservas**
  + **Campo para definir tarifa de alquiler**
- **Botón \"Guardar configuración\"** que actualiza los campos habilitado_reserva y tarifa_alquiler en la tabla espacios_fisicos
- Gráfica de espacios más solicitados
- Gráfica de ingresos por alquileres en el periodo
- Indicador de solicitudes pendientes de aprobación
- Calendario de ocupación de espacios

#### 3.7.6 Reportes
- Informe de reservas y alquileres por periodo (Excel/PDF)
- Informe de ingresos por alquileres (Excel/PDF)

### 3.8 Módulo de Administración (solo Administrador)

#### 3.8.1 Gestión de Usuarios Internos
- Listado de usuarios con columnas: nombre, correo, cargo, rol, estado
- Botón \"Crear usuario\"
- Formulario de usuario con campos:
  + Nombre
  + Correo electrónico
  + Cargo
  + Rol (Administrador, Infraestructura Física, Rectoría)
  + Estado (Activo, Inactivo)
- Botón \"Editar usuario\"
- Botón \"Desactivar usuario\"

#### 3.8.2 Gestión de Catálogos
- Administración de listas:
  + Categorías de activos
  + Tipos de espacios
  + Proveedores
  + Estados
- Funciones: agregar, editar, eliminar elementos de cada catálogo

#### 3.8.3 Configuración de Espacios Reservables
- Listado de espacios con toggle para activar/desactivar disponibilidad para reservas
- Campo para definir tarifa de alquiler por espacio
- Botón \"Guardar configuración\"

#### 3.8.4 Logs de Auditoría
- Tabla con registro de acciones realizadas por usuarios
- Columnas: fecha, hora, usuario, acción, módulo, detalles
- Filtros por: usuario, módulo, fecha

### 3.9 Mi Perfil
- Información del usuario autenticado:
  + Nombre
  + Correo electrónico
  + Cargo
  + Rol
- Botón \"Cambiar contraseña\"
- Botón \"Cerrar sesión\"

## 4. Reglas de Negocio y Lógica

### 4.1 Gestión de Imágenes con Cloudinary
- Todas las imágenes se suben a Cloudinary usando el preset \"campusnova\"
- Cloud name: drqfuh66o
- Upload Preset: campusnova (unsigned, público)
- Variables de entorno: VITE_CLOUDINARY_CLOUD_NAME=drqfuh66o, VITE_CLOUDINARY_UPLOAD_PRESET=campusnova
- Solo se guarda la secure_url en Supabase
- Los documentos PDF se almacenan en Supabase Storage

### 4.2 Códigos de Identificación de Espacios
- Formato: [SEDE]-[BLOQUE]-[TIPO]-[NÚMERO]
- Ejemplo: SP-BA-AUL-101
- Tipos: AUL (Aula), LAB (Laboratorio), ADM (Administrativo), BAÑ (Baño), BOD (Bodega), AUD (Auditorio/Paraninfo), SAL (Salón múltiple), PAR (Parqueadero), CUL (Área cultivo), HOT (Edificación hotelera)

### 4.3 Clasificación de Espacios
- **Sede Principal:**
  + Bloque A: administrativos, dirección, académicos, laboratorios
  + Bloque B: administrativos, académicos, laboratorios, biblioteca, baños
  + Bloque C: Salón múltiple, área cultivo, baños, bodegas
  + Bloque D: Parqueadero
- **Sede Secundaria:** Instalaciones arrendadas
- **Sede Rural:** Áreas de cultivo, Casa grande, Casa pequeña

### 4.4 Espacios Físicos del Inventario Actual
BIBLIOTECA, OFICINA INVESTIGACION, OFICINA TALENTO HUMANO, AUDITORIO 1, OFICINA CALIDAD, OFICINA FINANCIERA, LABORATORIO ENERGIAS RENOVABLES, LABORATORIO ELECTRICIDAD, SALON CULTURAL, AULA A16, AULA A11, AULA A12, AULA A2, LABORATORIO A, LABORATORIO B, LABORATORIO C, LABORATORIO DE IDIOMAS, LABORATORIO CIENCIAS BASICAS, AUDITORIO PARANINFO, OFICINA REGISTRO Y CONTROL, OFICINA BIENESTAR, OFICINA DIRECCION DE UNIDAD, BODEGA COMPARTIDA, BODEGA BIENESTAR, BODEGA SALÓN CULTURAL, AULA B1, AULA B4

### 4.5 Cálculo de Depreciación
- Para activos depreciables: Depreciación anual = Valor inicial / Tiempo de depreciación (años)
- Valor actual estimado = Valor inicial - (Depreciación anual × Años transcurridos)
- Porcentaje de vida útil consumida = (Años transcurridos / Tiempo de depreciación) × 100

### 4.6 Flujo de Estados de Novedades
Recibido → En revisión → En gestión → Resuelto → Cerrado

### 4.7 Flujo de Estados de Intervenciones
Solicitud → Revisión por Infraestructura Física → Aprobación (Rectoría si aplica por monto) → En ejecución → Finalizado

### 4.8 Flujo de Estados de Reservas/Alquileres
Solicitud recibida → En revisión → Aprobada/Rechazada → Confirmada

### 4.9 Nomenclatura de Archivos
Formato: AAAAMMDD_TipoDocumento_CodigoEspacio_Descripcion

### 4.10 Notificaciones por Correo
- Reporte de novedad: envía correo al reportante con número de radicado
- Cambio de estado de novedad: notifica al reportante
- Solicitud de reserva/alquiler: envía correo al solicitante con número de solicitud
- Aprobación/rechazo de reserva/alquiler: notifica al solicitante

### 4.11 Interconexión entre Módulos
- Un activo está ubicado en un espacio físico
- Una novedad está asociada a un espacio físico
- Una reserva bloquea un espacio físico en el calendario
- Una intervención modifica el estado de un espacio físico
- Desde una novedad se puede crear una solicitud de intervención

### 4.12 Trazabilidad
- Cada cambio en activos, espacios, novedades, reservas e intervenciones registra: fecha, usuario que realizó el cambio, descripción del cambio

### 4.13 Registro de Usuarios
- La página de registro está disponible únicamente en la URL /registro
- No aparece enlazada en ninguna parte de la interfaz pública ni del panel interno
- Al completar el registro, se crea el usuario en Supabase Auth y se inserta un registro en la tabla profiles con los campos: id, email, nombre, cargo, role, activo (true por defecto), created_at, updated_at
- Después del registro exitoso, el usuario es redirigido a la página de inicio de sesión (/login)

### 4.14 Importación de Activos desde Excel
- El archivo .xlsx debe contener columnas correspondientes a los campos del activo
- El sistema valida que los códigos sean únicos antes de importar
- Los espacios físicos, categorías y responsables deben existir previamente en el sistema

### 4.15 Acta de Movimiento de Activos
- El acta incluye: datos del activo, tipo de movimiento, espacio origen, espacio destino, responsables, fecha, motivo, observaciones
- Contiene espacios para firma de: persona que entrega, persona que recibe, persona que aprueba
- Puede generarse en formato PDF o abrirse en ventana de impresión

### 4.16 Configuración de Espacios Reservables
- Los campos habilitado_reserva y tarifa_alquiler se almacenan en la tabla espacios_fisicos
- Solo los espacios con habilitado_reserva = true aparecen en el catálogo público
- La tarifa de alquiler se muestra en el catálogo público y se usa en el proceso de aprobación de alquileres

## 5. Casos Excepcionales y Situaciones de Borde

| Situación | Comportamiento esperado |
|-----------|-------------------------|
| Usuario intenta acceder a módulo sin permisos | Redirige al dashboard con mensaje de acceso denegado |
| Intento de registrar activo con código duplicado | Muestra error y solicita código único |
| Intento de reservar espacio ya ocupado | Muestra mensaje de no disponibilidad y sugiere otras fechas |
| Subida de imagen excede límite de Cloudinary | Muestra error y solicita imagen de menor tamaño |
| Usuario externo intenta acceder al panel interno | Redirige a la landing page |
| Intento de dar de baja activo sin acta | Muestra error y solicita adjuntar acta |
| Cambio de estado de novedad sin descripción en bitácora | Muestra error y solicita descripción |
| Aprobación de alquiler sin registrar pago | Permite aprobar pero marca estado de pago como Pendiente |
| Usuario olvida contraseña | Envía correo con enlace de recuperación |
| Intento de eliminar usuario con registros asociados | Muestra advertencia y ofrece desactivar en lugar de eliminar |
| Intento de registrar usuario con correo duplicado | Muestra error indicando que el correo ya está registrado |
| Contraseña y confirmación de contraseña no coinciden | Muestra error y solicita corregir |
| Importación de Excel con códigos duplicados | Muestra error indicando los códigos duplicados y no importa ningún registro |
| Importación de Excel con espacios o responsables inexistentes | Muestra error indicando los registros con datos inválidos |
| Intento de registrar movimiento sin seleccionar responsables | Muestra error y solicita completar todos los campos obligatorios |
| Intento de cerrar novedad sin cargar imagen de evidencia | Permite cerrar sin imagen (campo opcional) |
| Cambio de vista en calendario sin eventos | Muestra la vista vacía con mensaje informativo |
| Intento de guardar configuración de espacios sin cambios | Muestra mensaje de confirmación sin realizar cambios en base de datos |

## 6. Criterios de Aceptación

1. Un usuario externo accede a la landing page, visualiza el catálogo de espacios reservables y el calendario público, luego reporta una novedad completando el formulario público y recibe un número de radicado por correo
2. Un usuario con rol Infraestructura Física inicia sesión, accede al módulo de Activos Fijos, registra un nuevo activo con foto (Cloudinary) y documento PDF, y el activo aparece en el listado agrupado por espacio físico
3. Un usuario con rol Infraestructura Física accede al módulo de Novedades, visualiza una novedad reportada con su imagen adjunta, cambia su estado a \"Cerrado\", carga una imagen de evidencia del trabajo realizado, y el reportante recibe notificación por correo
4. Un usuario externo solicita el alquiler de un espacio completando el formulario público, un usuario con rol Infraestructura Física revisa la solicitud en el calendario (vista semanal), la aprueba, registra el pago, y el espacio queda bloqueado en el calendario
5. Un usuario con rol Administrador accede al módulo de Administración, crea un nuevo usuario con rol Rectoría, y el nuevo usuario puede iniciar sesión y acceder a los dashboards y reportes
6. Un usuario accede directamente a la URL /registro, completa el formulario de registro con todos los campos requeridos, envía el formulario, y es redirigido a la página de inicio de sesión donde puede autenticarse con las credenciales recién creadas
7. Un usuario con rol Infraestructura Física accede al módulo de Activos Fijos, hace clic en \"Importar desde Excel\", carga un archivo .xlsx con múltiples activos, y todos los activos válidos se registran en el sistema
8. Un usuario con rol Infraestructura Física registra un movimiento de activo completando el formulario con todos los responsables, genera el acta de movimiento, y puede imprimirla con los espacios para firmas
9. Un usuario con rol Infraestructura Física accede al Dashboard de Reservas, habilita un espacio para reservas, define su tarifa de alquiler, guarda la configuración, y el espacio aparece en el catálogo público con su tarifa
10. Un usuario con rol Infraestructura Física accede al calendario de reservas, cambia entre las vistas mensual, semanal y diaria, y visualiza correctamente los eventos en cada vista

## 7. Funcionalidades No Incluidas en Esta Versión

- Integración con sistemas de pago en línea para alquileres
- Aplicación móvil nativa
- Notificaciones push
- Generación automática de códigos QR para activos
- Sistema de chat en tiempo real
- Integración con sistemas de control de acceso físico
- Reconocimiento facial o biométrico
- Análisis predictivo de mantenimiento
- Integración con sistemas ERP externos
- Gestión de inventario de materiales y suministros
- Sistema de tickets de soporte técnico
- Gestión de contratos con proveedores
- Módulo de gestión de personal
- Sistema de evaluación de desempeño
- Gestión de proyectos de construcción
- Integración con sistemas de videovigilancia
- Gestión de consumo de servicios públicos
- Sistema de control de temperatura y clima
- Gestión de vehículos institucionales
- Sistema de préstamo de equipos
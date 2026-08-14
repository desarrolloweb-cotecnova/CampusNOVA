# Política de sesiones — caducidad diaria

## Qué problema resuelve

Supabase renueva el token de acceso de forma automática mientras el *refresh
token* siga vivo. En la práctica eso significa que una pestaña abierta mantiene
la sesión iniciada durante días: cualquiera que se siente frente a ese equipo
entra al panel con el usuario de otra persona, sin contraseña y sin segundo
factor.

## La regla

**Toda sesión caduca a las 8 horas de haber iniciado sesión.**

- Es un **tope absoluto**, no un temporizador de inactividad. Dentro de esas
  8 horas nadie es expulsado por dejar de escribir, cambiar de pestaña o irse a
  almorzar: la jornada de trabajo cabe entera en una sola sesión.
- Como el tope es menor que un día, **es imposible arrastrar la misma sesión de
  una jornada a la siguiente**: cada día hay que volver a autenticarse con
  Google y con el segundo factor.
- Cinco minutos antes de caducar aparece un aviso para poder guardar el trabajo
  en curso.
- Al caducar, la aplicación cierra la sesión, recarga la página (para no dejar
  datos del panel en memoria) y lleva a `/login?expirada=1`, donde se explica
  el motivo.

## Dónde está implementado

| Archivo | Papel |
|---|---|
| `src/lib/session-policy.ts` | La política: `SESSION_MAX_HOURS`, cálculo de caducidad y del tiempo restante. |
| `src/hooks/use-session-expiry.ts` | Vigilancia: temporizador + recomprobación al recuperar el foco o la visibilidad de la pestaña. |
| `src/contexts/AuthContext.tsx` | Aplica la expulsión y expone `sessionExpiresAt`. |
| `src/pages/LoginPage.tsx` | Mensaje al usuario expulsado por caducidad. |
| `src/components/common/SessionExpiryNotice.tsx` | Muestra en el menú de perfil a qué hora vence la sesión. |

### De dónde sale la hora de inicio

Del campo `last_sign_in_at` que emite el servidor de Supabase. Es el único dato
fiable: se fija en cada inicio de sesión y **no** se actualiza al renovar el
token, así que el navegador no puede estirar la ventana. Solo si el proveedor
no lo devuelve se recurre a una marca en `localStorage`.

### Cambiar la duración

Un único valor, en `src/lib/session-policy.ts`:

```ts
export const SESSION_MAX_HOURS = 8;
```

## Cómo comprobar que está activa

Abre el menú de perfil (arriba a la derecha): debajo del rol aparece «Tu sesión
vence a las HH:MM». Esa línea sale del mismo cálculo que ejecuta la expulsión,
así que si se ve, la política está activa. En la última hora pasa a cuenta
atrás y cambia de color.

## Refuerzo del lado del servidor (recomendado)

Lo anterior se aplica en el navegador y cubre el riesgo real (la sesión olvidada
en un equipo compartido), pero un cliente manipulado podría seguir usando el
refresh token. Para que el corte también lo imponga el servidor, en el panel de
Supabase:

**Authentication → Sessions**

| Opción | Valor |
|---|---|
| *Time-box user sessions* | `8 hours` |
| *Inactivity timeout* | dejar vacío (no queremos expulsar por inactividad) |

Con eso, pasadas 8 horas Supabase deja de renovar el token aunque el cliente lo
intente. Es un cambio de configuración del proyecto, no de código, y **no está
aplicado por este repositorio**: hay que hacerlo en el panel de cada proyecto
(el mismo ajuste vale para DocuNOVA y CrediNOVA).

## Sistemas hermanos

La misma política de 8 horas está replicada en DocuNOVA, CrediNOVA y ParkiNOVA.
ParkiNOVA gestiona sus propias sesiones en base de datos, así que allí el tope
vive en `src/server/auth/sesion.ts`.

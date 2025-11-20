// Use the environment variable if provided at build time. Otherwise, when
// running in the browser derive the backend origin from window.location so
// the socket client uses the same scheme (http/https -> ws/wss). This
// prevents mixed-protocol issues where the page is served over HTTPS but
// the socket tries to connect with ws://.
const urlBase = process.env.NEXT_PUBLIC_URL_BACKEND ?? (typeof window !== "undefined" ? window.location.origin : "http://localhost:8000");
export const BACKEND_ROUTES = {
  urlSockets: urlBase,
  urlHttpBase: `/api`,
  urlUsuarios: `/api/users`,
  urlUsersRegister: `/api/users/register`,
  urlVerifyCode: `/api/users/codigo`,
  urlRoles: `/api/roles`,
  urlAsistencias: `/api/asistencia`,
  urlJustificaciones: `/api/justificaciones`,
  urlHorarios: `/api/horarios`,
  urlTurnos: `/api/turnos`,
  urlLogin: `${urlBase}/api/users/login/credentials`,
  urlRefreshToken: `${urlBase}/api/auth/refresh-token`,
  urlReportesList: `/api/reportes/listar`,
  urlAsistenciaFacial: `/api/asistencia/registro-facial`,
  urlNotificaciones: `/api/notificaciones`,
};
